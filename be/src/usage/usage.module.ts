import { Module } from '@nestjs/common';
import { UsageTrackingService } from './usage-tracking.service';
import { UsageController } from './usage.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { TelegramService } from './telegram.service';

@Module({
    imports: [PrismaModule, MikrotikModule],
    providers: [UsageTrackingService, TelegramService],
    controllers: [UsageController],
    exports: [UsageTrackingService, TelegramService],
})
export class UsageModule { }
