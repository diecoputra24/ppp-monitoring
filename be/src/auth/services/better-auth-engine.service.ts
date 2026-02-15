/**
 * BetterAuth Engine Service - Core BetterAuth integration.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for interfacing with the BetterAuth library
 *
 * Follows Dependency Inversion Principle (DIP):
 * - Implements the IAuthEngine interface
 * - Depends on PrismaService (injected)
 *
 * Follows Open/Closed Principle (OCP):
 * - BetterAuth plugins can be added without modifying this class
 */

import { Injectable, OnModuleInit, UnauthorizedException, Logger } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { PrismaService } from '../../prisma/prisma.service';
import type {
    IAuthEngine,
    SignInPayload,
    SignUpPayload,
    AuthResponse,
    AuthUserProfile,
    AuthTokenResponse,
    SessionResponse,
} from '../types/auth.types';
import { DEFAULT_SESSION_EXPIRY, DEFAULT_SESSION_UPDATE_AGE } from '../types/auth.types';

@Injectable()
export class BetterAuthEngineService implements IAuthEngine, OnModuleInit {
    private readonly logger = new Logger(BetterAuthEngineService.name);
    private authInstance!: ReturnType<typeof betterAuth>;

    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit(): Promise<void> {
        this.authInstance = betterAuth({
            database: prismaAdapter(this.prisma, {
                provider: 'sqlite',
            }),
            secret: process.env.BETTER_AUTH_SECRET,
            baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3008',
            basePath: '/api/auth',
            emailAndPassword: {
                enabled: true,
                autoSignIn: true,
                minPasswordLength: 6,
                maxPasswordLength: 128,
            },
            session: {
                expiresIn: DEFAULT_SESSION_EXPIRY,
                updateAge: DEFAULT_SESSION_UPDATE_AGE,
            },
            plugins: [bearer()],
            trustedOrigins: [
                'http://localhost:3008',
                'http://localhost:5173',
                'http://localhost:8081',
            ],
        });

        this.logger.log('BetterAuth engine initialized successfully');

        // Seed default admin user
        await this.seedDefaultUser();
    }

    /**
     * Sign in with email and password.
     * Calls BetterAuth sign-in endpoint and returns tokens + user profile.
     */
    async signIn(payload: SignInPayload, _request: globalThis.Request): Promise<AuthResponse> {
        try {
            const response = await this.authInstance.api.signInEmail({
                body: {
                    email: payload.email,
                    password: payload.password,
                },
            });

            if (!response || !response.user) {
                throw new UnauthorizedException('Email atau password salah');
            }

            const user = this.mapToUserProfile(response.user as unknown as Record<string, unknown>);
            const sessionToken = response.token ?? '';

            const tokens: AuthTokenResponse = {
                accessToken: sessionToken,
                refreshToken: sessionToken,
                expiresIn: DEFAULT_SESSION_EXPIRY,
                tokenType: 'Bearer' as const,
            };

            return { user, tokens };
        } catch (error: unknown) {
            this.logger.error(`Sign-in failed for ${payload.email}: ${String(error)}`);
            throw new UnauthorizedException('Email atau password salah');
        }
    }

    /**
     * Sign up with email, name, and password.
     * Calls BetterAuth sign-up endpoint and returns tokens + user profile.
     */
    async signUp(payload: SignUpPayload, _request: globalThis.Request): Promise<AuthResponse> {
        try {
            const response = await this.authInstance.api.signUpEmail({
                body: {
                    name: payload.name,
                    email: payload.email,
                    password: payload.password,
                },
            });

            if (!response || !response.user) {
                throw new UnauthorizedException('Gagal membuat akun');
            }

            const user = this.mapToUserProfile(response.user as unknown as Record<string, unknown>);
            const sessionToken = response.token ?? '';

            const tokens: AuthTokenResponse = {
                accessToken: sessionToken,
                refreshToken: sessionToken,
                expiresIn: DEFAULT_SESSION_EXPIRY,
                tokenType: 'Bearer' as const,
            };

            return { user, tokens };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Sign-up failed for ${payload.email}: ${message}`);

            if (message.includes('already exists') || message.includes('unique')) {
                throw new UnauthorizedException('Email sudah terdaftar');
            }
            throw new UnauthorizedException('Gagal membuat akun: ' + message);
        }
    }

    /**
     * Sign out by revoking the session.
     */
    async signOut(_sessionToken: string, request: globalThis.Request): Promise<void> {
        try {
            await this.authInstance.api.signOut({
                headers: request.headers,
            });
        } catch (error: unknown) {
            this.logger.warn(`Sign-out error: ${String(error)}`);
            // Sign-out should not throw - best effort
        }
    }

    /**
     * Get current session from request headers.
     */
    async getSession(headers: Headers): Promise<SessionResponse | null> {
        try {
            const session = await this.authInstance.api.getSession({
                headers,
            });

            if (!session || !session.user) {
                return null;
            }

            return {
                session: {
                    sessionId: session.session.id,
                    userId: session.session.userId,
                    expiresAt: new Date(session.session.expiresAt),
                    ipAddress: session.session.ipAddress ?? null,
                    userAgent: session.session.userAgent ?? null,
                },
                user: this.mapToUserProfile(session.user as unknown as Record<string, unknown>),
            };
        } catch {
            return null;
        }
    }

    /**
     * Refresh session token.
     */
    async refreshSession(sessionToken: string): Promise<AuthTokenResponse> {
        try {
            // Find the session by token
            const sessionRecord = await this.prisma.session.findUnique({
                where: { token: sessionToken },
            });

            if (!sessionRecord) {
                throw new UnauthorizedException('Session tidak ditemukan');
            }

            // Check if session is expired
            if (new Date(sessionRecord.expiresAt) < new Date()) {
                // Clean up expired session
                await this.prisma.session.delete({
                    where: { id: sessionRecord.id },
                });
                throw new UnauthorizedException('Session telah kedaluwarsa');
            }

            // Extend session expiry
            const newExpiresAt = new Date(Date.now() + DEFAULT_SESSION_EXPIRY * 1000);
            const { randomBytes } = await import('crypto');
            const newToken = randomBytes(32).toString('hex');

            await this.prisma.session.update({
                where: { id: sessionRecord.id },
                data: {
                    token: newToken,
                    expiresAt: newExpiresAt,
                    updatedAt: new Date(),
                },
            });

            return {
                accessToken: newToken,
                refreshToken: sessionToken, // Previous token serves as refresh reference
                expiresIn: DEFAULT_SESSION_EXPIRY,
                tokenType: 'Bearer' as const,
            };
        } catch (error: unknown) {
            if (error instanceof UnauthorizedException) throw error;
            this.logger.error(`Token refresh failed: ${String(error)}`);
            throw new UnauthorizedException('Gagal refresh token');
        }
    }

    /**
     * Change user password.
     * Verifies current password then updates to new password via BetterAuth API.
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        try {
            // Use BetterAuth's changePassword API
            await this.authInstance.api.changePassword({
                body: {
                    currentPassword,
                    newPassword,
                },
                headers: await this.buildUserHeaders(userId),
            });

            this.logger.log(`Password changed for user ${userId}`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Password change failed for ${userId}: ${message}`);

            if (message.includes('incorrect') || message.includes('Invalid') || message.includes('wrong')) {
                throw new UnauthorizedException('Password saat ini salah');
            }
            throw new UnauthorizedException('Gagal mengubah password: ' + message);
        }
    }

    /**
     * Build headers with a valid session for a specific user.
     * Used for internal API calls that require authentication context.
     */
    private async buildUserHeaders(userId: string): Promise<globalThis.Headers> {
        // Find the user's latest session
        const session = await this.prisma.session.findFirst({
            where: {
                userId,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        const headers = new globalThis.Headers();
        if (session) {
            headers.set('Authorization', `Bearer ${session.token}`);
        }
        return headers;
    }

    /**
     * Get the raw BetterAuth handler for mounting routes.
     */
    getHandler(): ReturnType<typeof betterAuth>['handler'] {
        return this.authInstance.handler;
    }

    // ============================================================
    // Private Helpers
    // ============================================================

    /**
     * Maps BetterAuth user object to our AuthUserProfile type.
     */
    private mapToUserProfile(user: Record<string, unknown>): AuthUserProfile {
        return {
            id: String(user.id ?? ''),
            name: String(user.name ?? ''),
            email: String(user.email ?? ''),
            emailVerified: Boolean(user.emailVerified ?? false),
            image: user.image ? String(user.image) : null,
            role: user.role ? String(user.role) : null,
            createdAt: user.createdAt instanceof Date
                ? user.createdAt
                : new Date(String(user.createdAt ?? Date.now())),
        };
    }

    /**
     * Builds tokens from BetterAuth response.
     */
    private buildTokens(response: Record<string, unknown>): AuthTokenResponse {
        const session = response.session as Record<string, unknown> | undefined;
        const token = session?.token ? String(session.token) : '';

        return {
            accessToken: token,
            refreshToken: token, // BetterAuth uses session token as both access + refresh
            expiresIn: DEFAULT_SESSION_EXPIRY,
            tokenType: 'Bearer' as const,
        };
    }

    /**
     * Seeds the default admin user on first startup.
     */
    private async seedDefaultUser(): Promise<void> {
        const defaultEmail = 'fastnetsolusindo@gmail.com';
        const defaultPassword = 'admin@123';
        const defaultName = 'Admin Fastnet';

        try {
            // Check if user already exists
            const existingUser = await this.prisma.user.findUnique({
                where: { email: defaultEmail },
            });

            if (existingUser) {
                this.logger.log(`Default user (${defaultEmail}) already exists, skipping seed.`);
                return;
            }

            // Create user via BetterAuth API
            await this.authInstance.api.signUpEmail({
                body: {
                    name: defaultName,
                    email: defaultEmail,
                    password: defaultPassword,
                },
            });

            // Update user role to admin
            await this.prisma.user.updateMany({
                where: { email: defaultEmail },
                data: { role: 'admin' },
            });

            this.logger.log(`✅ Default admin user seeded: ${defaultEmail}`);
        } catch (error: unknown) {
            this.logger.warn(`Default user seed skipped or failed: ${String(error)}`);
        }
    }
}
