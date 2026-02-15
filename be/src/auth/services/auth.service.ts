/**
 * Auth Service - Facade service that orchestrates authentication operations.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Orchestrates auth workflows without knowing implementation details
 *
 * Follows Dependency Inversion Principle (DIP):
 * - Depends on abstractions (injected services), not concrete implementations
 *
 * Follows Open/Closed Principle (OCP):
 * - New auth methods can be added without modifying existing ones
 */

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { BetterAuthEngineService } from './better-auth-engine.service';
import { CsrfService } from './csrf.service';
import { TokenManagerService } from './token-manager.service';
import type {
    SignInPayload,
    SignUpPayload,
    AuthResponse,
    AuthTokenResponse,
    SessionResponse,
} from '../types/auth.types';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly authEngine: BetterAuthEngineService,
        private readonly csrfService: CsrfService,
        private readonly tokenManager: TokenManagerService,
    ) { }

    /**
     * Authenticates a user with email and password after CSRF validation.
     */
    async signIn(
        payload: SignInPayload,
        csrfToken: string | undefined,
        request: globalThis.Request,
    ): Promise<AuthResponse & { csrfToken: string }> {
        // Validate CSRF token (skip for initial token fetch)
        if (csrfToken) {
            this.validateCsrf(csrfToken);
        }

        const result = await this.authEngine.signIn(payload, request);
        const newCsrfToken = this.csrfService.generateToken();

        this.logger.log(`User signed in: ${payload.email}`);

        return {
            ...result,
            csrfToken: newCsrfToken,
        };
    }

    /**
     * Registers a new user with email, name, and password.
     */
    async signUp(
        payload: SignUpPayload,
        csrfToken: string | undefined,
        request: globalThis.Request,
    ): Promise<AuthResponse & { csrfToken: string }> {
        if (csrfToken) {
            this.validateCsrf(csrfToken);
        }

        const result = await this.authEngine.signUp(payload, request);
        const newCsrfToken = this.csrfService.generateToken();

        this.logger.log(`User signed up: ${payload.email}`);

        return {
            ...result,
            csrfToken: newCsrfToken,
        };
    }

    /**
     * Signs out a user by revoking their session.
     */
    async signOut(authorizationHeader: string | undefined, request: globalThis.Request): Promise<void> {
        const token = this.tokenManager.extractBearerToken(authorizationHeader);
        if (!token) {
            throw new UnauthorizedException('Token tidak ditemukan');
        }

        await this.authEngine.signOut(token, request);
        this.logger.log('User signed out');
    }

    /**
     * Retrieves the current session from the request headers.
     */
    async getSession(headers: Headers): Promise<SessionResponse> {
        const session = await this.authEngine.getSession(headers);
        if (!session) {
            throw new UnauthorizedException('Session tidak valid atau telah kedaluwarsa');
        }
        return session;
    }

    /**
     * Refreshes an expired access token using the refresh token.
     */
    async refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
        if (!refreshToken || refreshToken.trim().length === 0) {
            throw new UnauthorizedException('Refresh token tidak valid');
        }

        return this.authEngine.refreshSession(refreshToken);
    }

    /**
     * Generates a new CSRF token (for initial page load).
     */
    generateCsrfToken(): string {
        return this.csrfService.generateToken();
    }

    /**
     * Changes the password for the authenticated user.
     */
    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string,
        csrfToken: string | undefined,
    ): Promise<void> {
        if (csrfToken) {
            this.validateCsrf(csrfToken);
        }

        await this.authEngine.changePassword(userId, currentPassword, newPassword);
        this.logger.log(`Password changed for user ${userId}`);
    }

    // ============================================================
    // Private Helpers
    // ============================================================

    /**
     * Validates a CSRF token and throws if invalid.
     */
    private validateCsrf(token: string): void {
        if (!this.csrfService.validateToken(token)) {
            throw new UnauthorizedException('CSRF token tidak valid atau telah kedaluwarsa');
        }
    }
}
