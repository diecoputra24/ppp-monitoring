/**
 * Auth Types - Core type definitions for the authentication module.
 *
 * Follows Interface Segregation Principle (ISP):
 * - Separate interfaces for different auth concerns
 * - Clients only depend on interfaces they actually use
 */

// ============================================================
// Request / Response DTOs
// ============================================================

/** Payload for email + password sign-in */
export interface SignInPayload {
    readonly email: string;
    readonly password: string;
}

/** Payload for email + password sign-up */
export interface SignUpPayload {
    readonly name: string;
    readonly email: string;
    readonly password: string;
}

/** Payload for token refresh */
export interface RefreshTokenPayload {
    readonly refreshToken: string;
}

/** Standard auth token response */
export interface AuthTokenResponse {
    readonly accessToken: string;
    readonly refreshToken: string;
    readonly expiresIn: number;
    readonly tokenType: 'Bearer';
}

/** User profile returned after authentication */
export interface AuthUserProfile {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly emailVerified: boolean;
    readonly image: string | null;
    readonly role: string | null;
    readonly createdAt: Date;
}

/** Combined auth response with tokens + user profile */
export interface AuthResponse {
    readonly user: AuthUserProfile;
    readonly tokens: AuthTokenResponse;
}

/** Session information */
export interface SessionInfo {
    readonly sessionId: string;
    readonly userId: string;
    readonly expiresAt: Date;
    readonly ipAddress: string | null;
    readonly userAgent: string | null;
}

/** Session response with user data */
export interface SessionResponse {
    readonly session: SessionInfo;
    readonly user: AuthUserProfile;
}

// ============================================================
// Service Interfaces (Dependency Inversion Principle)
// ============================================================

/** Interface for the auth engine adapter (DIP) */
export interface IAuthEngine {
    signIn(payload: SignInPayload, request: Request): Promise<AuthResponse>;
    signUp(payload: SignUpPayload, request: Request): Promise<AuthResponse>;
    signOut(sessionToken: string, request: Request): Promise<void>;
    getSession(headers: Headers): Promise<SessionResponse | null>;
    refreshSession(sessionToken: string): Promise<AuthTokenResponse>;
}

/** Interface for CSRF protection service (DIP) */
export interface ICsrfProtection {
    generateToken(): string;
    validateToken(token: string): boolean;
}

/** Interface for token management (DIP) */
export interface ITokenManager {
    extractBearerToken(authorizationHeader: string | undefined): string | null;
    buildAuthTokenResponse(
        sessionToken: string,
        refreshToken: string,
        expiresInSeconds: number,
    ): AuthTokenResponse;
}

// ============================================================
// Constants
// ============================================================

export const AUTH_ENGINE_TOKEN = 'AUTH_ENGINE' as const;
export const CSRF_SERVICE_TOKEN = 'CSRF_SERVICE' as const;
export const TOKEN_MANAGER_TOKEN = 'TOKEN_MANAGER' as const;

/** Default session expiration in seconds (7 days) */
export const DEFAULT_SESSION_EXPIRY = 60 * 60 * 24 * 7;

/** Default session update age in seconds (1 day) */
export const DEFAULT_SESSION_UPDATE_AGE = 60 * 60 * 24;

/** CSRF Header name */
export const CSRF_HEADER = 'x-csrf-token' as const;

/** CSRF Cookie name */
export const CSRF_COOKIE = 'csrf_token' as const;
