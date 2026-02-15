/**
 * Auth Module Barrel Exports
 *
 * Provides a clean public API surface for the auth module.
 * Other modules should import from this file.
 */

// Module
export { AuthModule } from './auth.module';

// Services
export { AuthService } from './services/auth.service';
export { BetterAuthEngineService } from './services/better-auth-engine.service';
export { CsrfService } from './services/csrf.service';
export { TokenManagerService } from './services/token-manager.service';

// Guards
export { AuthGuard } from './guards/auth.guard';
export { CsrfGuard } from './guards/csrf.guard';

// Decorators
export { Public } from './decorators/public.decorator';
export { CurrentUser } from './decorators/current-user.decorator';

// Types
export type {
    SignInPayload,
    SignUpPayload,
    RefreshTokenPayload,
    AuthTokenResponse,
    AuthUserProfile,
    AuthResponse,
    SessionInfo,
    SessionResponse,
    IAuthEngine,
    ICsrfProtection,
    ITokenManager,
} from './types/auth.types';

export {
    CSRF_HEADER,
    CSRF_COOKIE,
    AUTH_ENGINE_TOKEN,
    CSRF_SERVICE_TOKEN,
    TOKEN_MANAGER_TOKEN,
} from './types/auth.types';

// Schemas
export { signInSchema, signUpSchema, refreshTokenSchema } from './schemas/auth.schema';
export type { SignInInput, SignUpInput, RefreshTokenInput } from './schemas/auth.schema';

// Pipes
export { ZodValidationPipe } from './pipes/zod-validation.pipe';
