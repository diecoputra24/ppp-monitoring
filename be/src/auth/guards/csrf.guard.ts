/**
 * CSRF Guard - NestJS guard for CSRF token validation on mutation requests.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for CSRF validation on state-changing requests
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfService } from '../services/csrf.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CSRF_HEADER } from '../types/auth.types';
import type { Request } from 'express';

/** HTTP methods that are considered safe (do not change state) */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
    constructor(
        private readonly csrfService: CsrfService,
        private readonly reflector: Reflector,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        // Check if route is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();

        // Skip CSRF validation for safe methods
        if (SAFE_METHODS.has(request.method.toUpperCase())) {
            return true;
        }

        // Skip CSRF for Bearer token auth (CSRF only applies to cookie-based auth)
        const authHeader = request.headers['authorization'] as string | undefined;
        if (authHeader?.startsWith('Bearer ')) {
            return true;
        }

        const csrfToken = request.headers[CSRF_HEADER] as string | undefined;
        if (!csrfToken) {
            throw new ForbiddenException('CSRF token diperlukan untuk request ini');
        }

        if (!this.csrfService.validateToken(csrfToken)) {
            throw new ForbiddenException('CSRF token tidak valid atau telah kedaluwarsa');
        }

        return true;
    }
}
