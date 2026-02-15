/**
 * CurrentUser Decorator - Extracts the authenticated user from the request.
 *
 * Usage:
 * ```ts
 * @Get('profile')
 * getProfile(@CurrentUser() user: AuthUserProfile) {
 *   return user;
 * }
 * ```
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUserProfile } from '../types/auth.types';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthUserProfile => {
        const request = ctx.switchToHttp().getRequest<Record<string, unknown>>();
        return request['user'] as AuthUserProfile;
    },
);
