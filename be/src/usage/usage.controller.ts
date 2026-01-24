import { Controller, Get, Param } from '@nestjs/common';
import { UsageTrackingService } from './usage-tracking.service';

@Controller('usage')
export class UsageController {
    constructor(private readonly usageTrackingService: UsageTrackingService) { }

    /**
     * Get all usage data for a router
     */
    @Get('router/:routerId')
    async getRouterUsage(@Param('routerId') routerId: string) {
        return this.usageTrackingService.getRouterUsage(routerId);
    }

    /**
     * Get usage summary for a specific user
     */
    @Get('router/:routerId/user/:secretName')
    async getUserUsage(
        @Param('routerId') routerId: string,
        @Param('secretName') secretName: string,
    ) {
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
