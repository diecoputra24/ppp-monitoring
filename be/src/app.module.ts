import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { RouterModule } from './router/router.module';
import { MikrotikModule } from './mikrotik/mikrotik.module';
import { UsageModule } from './usage/usage.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { CsrfGuard } from './auth/guards/csrf.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    MikrotikModule,
    RouterModule,
    UsageModule,
  ],
  providers: [
    // Apply AuthGuard globally - routes with @Public() bypass it
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    // Apply CsrfGuard globally - only for state-changing methods (POST/PUT/DELETE/PATCH)
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule { }
