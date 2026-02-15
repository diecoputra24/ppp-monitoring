import { Controller, Get, Param } from '@nestjs/common';
import { UsageTrackingService } from './usage-tracking.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUserProfile } from '../auth/types/auth.types';

@Controller('usage')
export class UsageController {
    constructor(private readonly usageTrackingService: UsageTrackingService) { }

    /**
     * Get all usage data for a router
     */
    @Get('router/:routerId')
    async getRouterUsage(
        @Param('routerId') routerId: string,
        @CurrentUser() _user: AuthUserProfile,
    ) {
        // TODO: validate router ownership via routerService
        return this.usageTrackingService.getRouterUsage(routerId);
    }

    /**
     * Get usage summary for a specific user
     */
    @Get('router/:routerId/user/:secretName')
    async getUserUsage(
        @Param('routerId') routerId: string,
        @Param('secretName') secretName: string,
        @CurrentUser() _user: AuthUserProfile,
    ) {
        // TODO: validate router ownership via routerService
        const usage = await this.usageTrackingService.getUsageSummary(routerId, secretName);
        if (!usage) {
            return { message: 'No usage data found' };
        }
        return {
            secretName,
            isOnline: usage.isOnline,
            currentTxBytes: usage.currentTxBytes.toString(),
            currentRxBytes: usage.currentRxBytes.toString(),
            totalTxBytes: usage.totalTxBytes.toString(),
            totalRxBytes: usage.totalRxBytes.toString(),
        };
    }
}
