/**
 * Auth Controller - HTTP endpoints for authentication operations.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for HTTP request/response handling
 * - Delegates business logic to AuthService
 *
 * Follows Interface Segregation Principle (ISP):
 * - Each endpoint has a specific, focused purpose
 */

import {
    Controller,
    Post,
    Get,
    Body,
    Headers,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    UsePipes,
    All,
    Logger,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthService } from '../services/auth.service';
import { BetterAuthEngineService } from '../services/better-auth-engine.service';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { signInSchema, signUpSchema, refreshTokenSchema, changePasswordSchema } from '../schemas/auth.schema';
import type { SignInInput, SignUpInput, RefreshTokenInput, ChangePasswordInput } from '../schemas/auth.schema';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CSRF_HEADER } from '../types/auth.types';
import type { AuthUserProfile } from '../types/auth.types';
import { toNodeHandler } from 'better-auth/node';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly betterAuthEngine: BetterAuthEngineService,
    ) { }

    // ============================================================
    // Public Routes (no auth required)
    // ============================================================

    /**
     * POST /api/auth/sign-in
     * Authenticates a user with email and password.
     */
    @Public()
    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(signInSchema))
    async signIn(
        @Body() body: SignInInput,
        @Headers(CSRF_HEADER) csrfToken: string | undefined,
        @Req() req: ExpressRequest,
    ) {
        const webRequest = this.toWebRequest(req);
        const result = await this.authService.signIn(body, csrfToken, webRequest);

        return {
            success: true,
            message: 'Login berhasil',
            data: result,
        };
    }

    /**
     * POST /api/auth/sign-up
     * Registers a new user.
     */
    @Public()
    @Post('sign-up')
    @HttpCode(HttpStatus.CREATED)
    @UsePipes(new ZodValidationPipe(signUpSchema))
    async signUp(
        @Body() body: SignUpInput,
        @Headers(CSRF_HEADER) csrfToken: string | undefined,
        @Req() req: ExpressRequest,
    ) {
        const webRequest = this.toWebRequest(req);
        const result = await this.authService.signUp(body, csrfToken, webRequest);

        return {
            success: true,
            message: 'Registrasi berhasil',
            data: result,
        };
    }

    /**
     * POST /api/auth/refresh
     * Refreshes an access token using a refresh token.
     */
    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(refreshTokenSchema))
    async refreshToken(@Body() body: RefreshTokenInput) {
        const result = await this.authService.refreshToken(body.refreshToken);

        return {
            success: true,
            message: 'Token berhasil diperbarui',
            data: result,
        };
    }

    /**
     * GET /api/auth/csrf-token
     * Returns a new CSRF token for the client.
     */
    @Public()
    @Get('csrf-token')
    @HttpCode(HttpStatus.OK)
    getCsrfToken() {
        const token = this.authService.generateCsrfToken();

        return {
            success: true,
            data: { csrfToken: token },
        };
    }

    // ============================================================
    // Protected Routes (auth required)
    // ============================================================

    /**
     * POST /api/auth/sign-out
     * Signs out the current user.
     */
    @Post('sign-out')
    @HttpCode(HttpStatus.OK)
    async signOut(
        @Headers('authorization') authorization: string | undefined,
        @Req() req: ExpressRequest,
    ) {
        const webRequest = this.toWebRequest(req);
        await this.authService.signOut(authorization, webRequest);

        return {
            success: true,
            message: 'Logout berhasil',
        };
    }

    /**
     * GET /api/auth/session
     * Returns the current authenticated session.
     */
    @Get('session')
    @HttpCode(HttpStatus.OK)
    async getSession(@Req() req: ExpressRequest) {
        const headers = this.extractHeaders(req);
        const session = await this.authService.getSession(headers);

        return {
            success: true,
            data: session,
        };
    }

    /**
     * GET /api/auth/me
     * Returns the current authenticated user profile.
     */
    @Get('me')
    @HttpCode(HttpStatus.OK)
    getMe(@CurrentUser() user: AuthUserProfile) {
        return {
            success: true,
            data: { user },
        };
    }

    /**
     * POST /api/auth/change-password
     * Changes the password for the authenticated user.
     */
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    async changePassword(
        @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
        @CurrentUser() user: AuthUserProfile,
        @Headers(CSRF_HEADER) csrfToken: string | undefined,
    ) {
        await this.authService.changePassword(
            user.id,
            body.currentPassword,
            body.newPassword,
            csrfToken,
        );

        return {
            success: true,
            message: 'Password berhasil diubah',
        };
    }

    /**
     * Catch-all handler for BetterAuth internal routes.
     * Routes like /api/auth/callback/*, /api/auth/verify/*, etc.
     */
    @Public()
    @All('*path')
    async betterAuthHandler(@Req() req: ExpressRequest, @Res() res: ExpressResponse) {
        const handler = toNodeHandler(this.betterAuthEngine.getHandler());
        return handler(req, res);
    }

    // ============================================================
    // Private Helpers
    // ============================================================

    /**
     * Converts an Express Request to a Web API Request for BetterAuth.
     */
    private toWebRequest(req: ExpressRequest): globalThis.Request {
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:3008';
        const url = `${protocol}://${host}${req.originalUrl}`;

        const headers = new globalThis.Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (value) {
                headers.set(key, Array.isArray(value) ? value.join(', ') : value);
            }
        }

        return new globalThis.Request(url, {
            method: req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method)
                ? undefined
                : JSON.stringify(req.body),
        });
    }

    /**
     * Extracts relevant headers from Express Request as Web API Headers.
     */
    private extractHeaders(req: ExpressRequest): globalThis.Headers {
        const headers = new globalThis.Headers();
        if (req.headers['authorization']) {
            headers.set('Authorization', req.headers['authorization'] as string);
        }
        if (req.headers['user-agent']) {
            headers.set('User-Agent', req.headers['user-agent'] as string);
        }
        if (req.headers['cookie']) {
            headers.set('Cookie', req.headers['cookie'] as string);
        }
        return headers;
    }
}
