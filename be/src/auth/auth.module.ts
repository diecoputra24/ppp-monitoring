/**
 * Auth Module - NestJS module that encapsulates the authentication system.
 *
 * Follows Single Responsibility Principle (SRP):
 * - Only responsible for wiring auth dependencies together
 *
 * Follows Dependency Inversion Principle (DIP):
 * - Registers concrete implementations against their service tokens
 */

import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { BetterAuthEngineService } from './services/better-auth-engine.service';
import { CsrfService } from './services/csrf.service';
import { TokenManagerService } from './services/token-manager.service';
import { AuthGuard } from './guards/auth.guard';
import { CsrfGuard } from './guards/csrf.guard';

@Module({
    controllers: [AuthController],
    providers: [
        // Core services
        AuthService,
        BetterAuthEngineService,
        CsrfService,
        TokenManagerService,

        // Guards
        AuthGuard,
        CsrfGuard,
    ],
    exports: [
        AuthService,
        BetterAuthEngineService,
        CsrfService,
        TokenManagerService,
        AuthGuard,
        CsrfGuard,
    ],
})
export class AuthModule { }
