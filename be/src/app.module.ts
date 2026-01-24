import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { RouterModule } from './router/router.module';
import { MikrotikModule } from './mikrotik/mikrotik.module';
import { UsageModule } from './usage/usage.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    MikrotikModule,
    RouterModule,
    UsageModule,
  ],
})
export class AppModule { }
