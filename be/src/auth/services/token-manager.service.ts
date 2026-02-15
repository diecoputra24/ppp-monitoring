/**
 * Token Manager Service - Handles token extraction and building.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for token management operations
 *
 * Follows Dependency Inversion Principle (DIP):
 * - Implements the ITokenManager interface
 */

import { Injectable } from '@nestjs/common';
import type { ITokenManager, AuthTokenResponse } from '../types/auth.types';

@Injectable()
export class TokenManagerService implements ITokenManager {
    /**
     * Extracts the Bearer token from the Authorization header.
     * Returns null if the header is missing or malformed.
     */
    extractBearerToken(authorizationHeader: string | undefined): string | null {
        if (!authorizationHeader) {
            return null;
        }

        const parts = authorizationHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return null;
        }

        const token = parts[1];
        if (!token || token.trim().length === 0) {
            return null;
        }

        return token;
    }

    /**
     * Builds a standardized AuthTokenResponse object.
     */
    buildAuthTokenResponse(
        sessionToken: string,
        refreshToken: string,
        expiresInSeconds: number,
    ): AuthTokenResponse {
        return {
            accessToken: sessionToken,
            refreshToken,
            expiresIn: expiresInSeconds,
            tokenType: 'Bearer' as const,
        };
    }
}
