/**
 * Auth Guard - NestJS guard that protects routes by validating Bearer tokens.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for route protection via token validation
 *
 * Follows Dependency Inversion Principle (DIP):
 * - Depends on injected services, not implementations
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BetterAuthEngineService } from '../services/better-auth-engine.service';
import { TokenManagerService } from '../services/token-manager.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
    private readonly logger = new Logger(AuthGuard.name);

    constructor(
        private readonly authEngine: BetterAuthEngineService,
        private readonly tokenManager: TokenManagerService,
        private readonly reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if route is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers['authorization'] as string | undefined;
        const token = this.tokenManager.extractBearerToken(authHeader);

        if (!token) {
            throw new UnauthorizedException('Token autentikasi diperlukan');
        }

        try {
            // Build headers with Authorization for BetterAuth session check
            const headers = new globalThis.Headers();
            headers.set('Authorization', `Bearer ${token}`);

            // Copy other relevant headers
            if (request.headers['user-agent']) {
                headers.set('User-Agent', request.headers['user-agent'] as string);
            }
            if (request.headers['x-forwarded-for']) {
                headers.set('X-Forwarded-For', request.headers['x-forwarded-for'] as string);
            }

            const session = await this.authEngine.getSession(headers);

            if (!session) {
                throw new UnauthorizedException('Session tidak valid atau telah kedaluwarsa');
            }

            // Attach user and session to request object for downstream use
            (request as unknown as Record<string, unknown>)['user'] = session.user;
            (request as unknown as Record<string, unknown>)['session'] = session.session;

            return true;
        } catch (error: unknown) {
            if (error instanceof UnauthorizedException) throw error;
            this.logger.error(`Auth guard error: ${String(error)}`);
            throw new UnauthorizedException('Session tidak valid atau telah kedaluwarsa');
        }
    }
}
