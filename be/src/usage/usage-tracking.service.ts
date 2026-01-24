import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MikrotikService, MikrotikConfig, PPPUserStatus } from '../mikrotik/mikrotik.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TelegramService } from './telegram.service';

interface OnlineUserCache {
    secretName: string;
    routerId: string;
    txBytes: bigint;
    rxBytes: bigint;
    lastUpdate: Date;
}

@Injectable()
export class UsageTrackingService implements OnModuleInit {
    // Cache of currently online users to detect disconnects
    private onlineUsersCache: Map<string, OnlineUserCache> = new Map();

    // Global cache for latest PPP status from all routers to serve API faster
    private routerDataCache: Map<string, { users: PPPUserStatus[], timestamp: number }> = new Map();

    constructor(
        private readonly prisma: PrismaService,
        private readonly mikrotikService: MikrotikService,
        private readonly telegramService: TelegramService,
    ) { }

    async onModuleInit() {
        console.log('UsageTrackingService initialized. Scheduler will run every 30s.');
    }

    private isSyncing = false;

    @Cron(CronExpression.EVERY_30_SECONDS)
    async handleUsageSync() {
        if (this.isSyncing) {
            console.warn('[SCHEDULER] Sync skipped: Previous sync cycle still running.');
            return;
        }

        this.isSyncing = true;
        try {
            await this.syncAllRouters();
        } catch (error) {
            console.error('[SCHEDULER] Error during scheduled sync:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Get cached data for a router if it's not older than 45 seconds
     */
    getCachedRouterData(routerId: string) {
        const cached = this.routerDataCache.get(routerId);
        if (cached && Date.now() - cached.timestamp < 45000) {
            return cached.users;
        }
        return null;
    }

    clearRouterCache(routerId: string) {
        this.routerDataCache.delete(routerId);
    }

    private async syncAllRouters() {
        try {
            const routers = await this.prisma.router.findMany({
                where: { isActive: true },
            });

            for (const router of routers) {
                // We don't await here to sync routers in parallel
                this.syncRouterUsage(router).catch(err =>
                    console.error(`Sync error for ${router.host}:`, err.message)
                );
            }
        } catch (error) {
            console.error('Error fetching routers for sync:', error.message);
        }
    }

    private async syncRouterUsage(router: any) {
        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };

        try {
            const { users, secrets } = await this.mikrotikService.getPPPStatus(config);

            // Save to global cache for fast API response
            this.routerDataCache.set(router.id, { users, timestamp: Date.now() });

            // 1. Sync Secrets (Delete from DB if removed from Mikrotik)
            const mikrotikSecretNames = new Set(secrets.map(s => s.name));
            const dbUsers = await this.prisma.pPPUser.findMany({
                where: { routerId: router.id },
                select: { secretName: true }
            });

            const toDelete = dbUsers
                .filter(u => !mikrotikSecretNames.has(u.secretName))
                .map(u => u.secretName);

            const loginList: string[] = [];
            const logoutList: string[] = [];

            if (toDelete.length > 0) {
                console.log(`[SYNC] Removing ${toDelete.length} defunct secrets for router ${router.host}`);
                await this.prisma.pPPUser.deleteMany({
                    where: {
                        routerId: router.id,
                        secretName: { in: toDelete }
                    }
                });
            }

            const currentOnlineNames = new Set<string>();

            console.log(`[SYNC] ${router.host}: Fetched ${users.length} users. Processing...`);

            // 2. Add/Update Users from Mikrotik
            for (const user of users) {
                try {
                    const cacheKey = `${router.id}:${user.name}`;

                    // Fetch existing user to get accumulation state
                    const existingUser = await this.prisma.pPPUser.findUnique({
                        where: {
                            routerId_secretName: {
                                routerId: router.id,
                                secretName: user.name,
                            },
                        },
                    });

                    const currentTx = user.isOnline ? user.currentTxBytes : 0n;
                    const currentRx = user.isOnline ? user.currentRxBytes : 0n;

                    let newAccumulatedTx = existingUser?.accumulatedTxBytes || 0n;
                    let newAccumulatedRx = existingUser?.accumulatedRxBytes || 0n;

                    if (existingUser) {
                        const prevCurrentTx = existingUser.currentTxBytes;
                        const prevCurrentRx = existingUser.currentRxBytes;

                        // SMART ACCUMULATION LOGIC
                        if (user.isOnline) {
                            // Detect Session Reset (Reconnect/Reboot)
                            if (currentTx < prevCurrentTx && prevCurrentTx > 0n) {
                                newAccumulatedTx += prevCurrentTx;
                                newAccumulatedRx += prevCurrentRx;
                                console.log(`[ACCUMULATE] RESET DETECTED for ${user.name}.`);
                                console.log(`   > Prev Session: ${formatBytes(prevCurrentTx)}`);
                                console.log(`   > New Session : ${formatBytes(currentTx)}`);
                                console.log(`   > Added to History. New Total History: ${formatBytes(newAccumulatedTx)}`);
                            }
                        } else {
                            // User went Offline - Store last session to history
                            // IMPORTANT: Only if prev was > 0, to avoid adding 0 repeatedly
                            if (prevCurrentTx > 0n || prevCurrentRx > 0n) {
                                newAccumulatedTx += prevCurrentTx;
                                newAccumulatedRx += prevCurrentRx;
                                console.log(`[ACCUMULATE] OFFLINE DETECTED for ${user.name}.`);
                                console.log(`   > Final Session Value: ${formatBytes(prevCurrentTx)}`);
                                console.log(`   > Added to History. New Total History: ${formatBytes(newAccumulatedTx)}`);
                            }
                        }
                    }

                    await this.prisma.pPPUser.upsert({
                        where: {
                            routerId_secretName: {
                                routerId: router.id,
                                secretName: user.name,
                            },
                        },
                        update: {
                            comment: user.comment ? String(user.comment) : null,
                            lastSeenOnline: user.isOnline ? new Date() : undefined,
                            accumulatedTxBytes: newAccumulatedTx,
                            accumulatedRxBytes: newAccumulatedRx,
                            // CONDITIONAL UPDATE:
                            // Only overwrite 'current' session bytes if user is ONLINE.
                            // If Offline, keep the last stored value so UI shows "Last Session" instead of 0.
                            currentTxBytes: user.isOnline ? currentTx : undefined,
                            currentRxBytes: user.isOnline ? currentRx : undefined,
                        },
                        create: {
                            routerId: router.id,
                            secretName: user.name,
                            comment: user.comment ? String(user.comment) : null,
                            accumulatedTxBytes: 0n,
                            accumulatedRxBytes: 0n,
                            currentTxBytes: currentTx,
                            currentRxBytes: currentRx,
                            lastSeenOnline: user.isOnline ? new Date() : null,
                        },
                    });

                    if (user.isOnline) {
                        currentOnlineNames.add(user.name);

                        // NOTIFIKASI LOGIN
                        // Jika tidak ada di cache RAM, berarti barusan connect
                        if (!this.onlineUsersCache.has(cacheKey)) {
                            if (!this.onlineUsersCache.has(cacheKey)) {
                                loginList.push(user.name);
                            }
                        }

                        // Update RAM cache for disconnect detection only
                        this.onlineUsersCache.set(cacheKey, {
                            secretName: user.name,
                            routerId: router.id,
                            txBytes: currentTx,
                            rxBytes: currentRx,
                            lastUpdate: new Date(),
                        });
                    }
                } catch (err: any) {
                    console.error(`[SYNC ERROR] Failed processing user ${user.name} on ${router.host}:`, err.message);
                }
            }

            // Cleanup RAM cache for users no longer tracked in this router
            // Cleanup RAM cache for users no longer tracked in this router
            for (const [cacheKey, cachedUser] of this.onlineUsersCache.entries()) {
                if (cachedUser.routerId === router.id && !currentOnlineNames.has(cachedUser.secretName)) {
                    logoutList.push(cachedUser.secretName);

                    // Record history
                    this.recordSessionHistory(cachedUser).catch(e => console.error(e));

                    this.onlineUsersCache.delete(cacheKey);
                }
            }

            // SEND BATCH REPORT
            if (router.telegramBotToken && router.telegramChatId) {
                const totalActive = users.filter(u => u.isOnline).length;
                const totalSecrets = users.length;
                const offlineList = users
                    .filter(u => !u.isOnline)
                    .map(u => u.name)
                    .sort();

                await this.telegramService.sendSyncReport(
                    router.telegramBotToken,
                    router.telegramChatId,
                    {
                        routerName: router.name || router.host,
                        logins: loginList,
                        logouts: logoutList,
                        totalSecrets,
                        totalActive,
                        disconnected: offlineList
                    }
                ).catch(e => console.error('[TELEGRAM] Error sending report:', e));
            }

            // Update router lastSync every 5 mins only (optimization)
            if (Math.random() < 0.1) { // 10% chance every 30s ~ approx 5 mins
                await this.prisma.router.update({
                    where: { id: router.id },
                    data: { lastSync: new Date() },
                });
            }

        } catch (error) {
            // Silently fail, log in console
        }
    }

    private async recordSessionHistory(cachedUser: OnlineUserCache) {
        try {
            const pppUser = await this.prisma.pPPUser.findUnique({
                where: {
                    routerId_secretName: {
                        routerId: cachedUser.routerId,
                        secretName: cachedUser.secretName,
                    },
                },
            });

            if (pppUser && (cachedUser.txBytes > 0n || cachedUser.rxBytes > 0n)) {
                await this.prisma.usageHistory.create({
                    data: {
                        pppUserId: pppUser.id,
                        txBytes: cachedUser.txBytes,
                        rxBytes: cachedUser.rxBytes,
                    },
                });
                console.log(`[HISTORY] Session total recorded for ${cachedUser.secretName}`);
            }
        } catch (error) {
            console.error(`Error recording session history for ${cachedUser.secretName}:`, error.message);
        }
    }

    /**
     * Get usage summary for a specific secret (Used by API)
     */
    async getUsageSummary(routerId: string, secretName: string): Promise<{
        currentTxBytes: bigint;
        currentRxBytes: bigint;
        totalTxBytes: bigint;
        totalRxBytes: bigint;
        isOnline: boolean;
    } | null> {
        const cacheKey = `${routerId}:${secretName}`;
        const cachedUser = this.onlineUsersCache.get(cacheKey);

        const pppUser = await this.prisma.pPPUser.findUnique({
            where: {
                routerId_secretName: { routerId, secretName },
            },
        });

        if (!pppUser && !cachedUser) {
            return null;
        }

        const currentTxBytes = pppUser?.currentTxBytes || BigInt(0);
        const currentRxBytes = pppUser?.currentRxBytes || BigInt(0);
        const accumulatedTxBytes = pppUser?.accumulatedTxBytes || BigInt(0);
        const accumulatedRxBytes = pppUser?.accumulatedRxBytes || BigInt(0);

        return {
            currentTxBytes,
            currentRxBytes,
            totalTxBytes: accumulatedTxBytes + currentTxBytes,
            totalRxBytes: accumulatedRxBytes + currentRxBytes,
            isOnline: !!cachedUser,
        };
    }

    async getRouterUsage(routerId: string) {
        const pppUsers = await this.prisma.pPPUser.findMany({
            where: { routerId },
            include: {
                usageHistory: {
                    orderBy: { sessionEnd: 'desc' },
                    take: 5,
                },
            },
        });

        return pppUsers.map(user => {
            const cacheKey = `${routerId}:${user.secretName}`;
            const cachedUser = this.onlineUsersCache.get(cacheKey);
            const currentTxBytes = user.currentTxBytes;
            const currentRxBytes = user.currentRxBytes;
            const accumulatedTx = user.accumulatedTxBytes;
            const accumulatedRx = user.accumulatedRxBytes;

            return {
                id: user.id,
                secretName: user.secretName,
                isOnline: !!cachedUser,
                currentTxBytes: currentTxBytes.toString(),
                currentRxBytes: currentRxBytes.toString(),
                totalTxBytes: (accumulatedTx + currentTxBytes).toString(),
                totalRxBytes: (accumulatedRx + currentRxBytes).toString(),
                storedTxBytes: accumulatedTx.toString(),
                storedRxBytes: accumulatedRx.toString(),
                lastSeenOnline: user.lastSeenOnline,
                recentHistory: user.usageHistory.map(h => ({
                    id: h.id,
                    txBytes: h.txBytes.toString(),
                    rxBytes: h.rxBytes.toString(),
                    sessionEnd: h.sessionEnd,
                })),
            };
        });
    }
}

function formatBytes(bytes: bigint): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = Number(bytes);
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
}
