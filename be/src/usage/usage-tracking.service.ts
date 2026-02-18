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
        await this.loadOnlineUsersFromDB();
    }

    private async loadOnlineUsersFromDB() {
        try {
            const onlineUsers = await this.prisma.pPPUser.findMany({
                where: { isOnline: true }
            });
            console.log(`[INIT] Loading ${onlineUsers.length} online users from DB into cache...`);
            for (const user of onlineUsers) {
                const cacheKey = `${user.routerId}:${user.secretName}`;
                this.onlineUsersCache.set(cacheKey, {
                    secretName: user.secretName,
                    routerId: user.routerId,
                    txBytes: user.currentTxBytes, // Might be stale but okay for identifying "was online"
                    rxBytes: user.currentRxBytes,
                    lastUpdate: user.lastSeenOnline || new Date(),
                });
            }
        } catch (error) {
            console.error('[INIT] Failed to load online users:', error);
        }
    }

    private isSyncing = false;
    private lastSyncStart: number = 0;
    private readonly SYNC_TIMEOUT_MS = 120000; // 2 minutes max for a sync cycle

    @Cron(CronExpression.EVERY_30_SECONDS)
    async handleUsageSync() {
        const now = Date.now();

        // Self-Healing: Check if previous sync is stuck
        if (this.isSyncing) {
            if (now - this.lastSyncStart > this.SYNC_TIMEOUT_MS) {
                console.error(`[SCHEDULER] CRITICAL: Sync process stuck for ${(now - this.lastSyncStart) / 1000}s. Forcing reset.`);
                this.isSyncing = false; // Force release lock
            } else {
                console.warn('[SCHEDULER] Sync skipped: Previous sync cycle still running.');
                return;
            }
        }

        this.isSyncing = true;
        this.lastSyncStart = now;

        try {
            // Race condition: If sync takes too long, we want to know, but we rely on the next cycle to Force Reset.
            // Alternatively, we can use Promise.race to timeout locally, but that doesn't kill the underlying hanging promise.
            // Best approach: Just run it, and let the Self-Healing logic above handle "Stuck" states in the next tick.

            // However, wrapping in a timeout ensures we at least get an error log in this cycle.
            await Promise.race([
                this.syncAllRouters(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Sync Execution Timeout')), 90000))
            ]);

        } catch (error) {
            console.error('[SCHEDULER] Error during scheduled sync:', error.message);
        } finally {
            // Only release lock if we finished within timeout. 
            // If we timed out, we might want to leave it "stuck" so the next cycle forces a hard reset?
            // No, standard `finally` is safer. If the underlying process is TRULY hung (e.g. native code), 
            // this finally block might not even run. That's why the Check at the top is crucial.
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
                // We await here sequentially to avoid overwhelming the database with too many parallel transactions
                // But you can change to parallel if needed
                await this.syncRouterUsage(router);
            }
        } catch (error) {
            console.error('Error fetching routers for sync:', error.message);
        }
    }

    // Cache for last heartbeat time per router
    private routerHeartbeats: Map<string, number> = new Map();

    private async syncRouterUsage(router: any) {
        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };

        // Determine if this run should be a heartbeat (every 1 hour)
        const lastHeartbeat = this.routerHeartbeats.get(router.id) || 0;
        const now = Date.now();
        const isHeartbeat = (now - lastHeartbeat) > 3600000; // 3600000 ms = 1 hour

        if (isHeartbeat) {
            this.routerHeartbeats.set(router.id, now);
        }

        try {
            const { users, secrets } = await this.mikrotikService.getPPPStatus(config);

            // ... (rest of the code is same until sendSyncReport)

            // Save to global cache for fast API response
            this.routerDataCache.set(router.id, { users, timestamp: Date.now() });

            // 1. Sync Secrets (Delete from DB if removed from Mikrotik)
            const mikrotikSecretNames = new Set(secrets.map(s => s.name));

            // OPTIMIZED: Fetch complete user data for in-memory processing
            const dbUsers = await this.prisma.pPPUser.findMany({
                where: { routerId: router.id },
            });
            const dbUserMap = new Map(dbUsers.map(u => [u.secretName, u]));

            const toDelete = dbUsers
                .filter(u => !mikrotikSecretNames.has(u.secretName))
                .map(u => u.secretName);

            const loginList: string[] = [];
            const logoutList: string[] = [];
            const currentOnlineNames = new Set<string>();

            // Transaction Container
            const transactionOperations: any[] = [];

            // A. Add DELETE operations
            if (toDelete.length > 0) {
                console.log(`[SYNC] Removing ${toDelete.length} defunct secrets for router ${router.host}`);
                transactionOperations.push(
                    this.prisma.pPPUser.deleteMany({
                        where: {
                            routerId: router.id,
                            secretName: { in: toDelete }
                        }
                    })
                );
            }

            // Console log removed to reduce noise
            // console.log(`[SYNC] ${router.host}: Fetched ${users.length} users. Processing batch updates...`);

            // B. Add UPSERT operations (Prepared in Memory)
            for (const user of users) {
                try {
                    const cacheKey = `${router.id}:${user.name}`;
                    const existingUser = dbUserMap.get(user.name);

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
                                // console.log(`[ACCUMULATE] RESET DETECTED for ${user.name}.`);
                            }
                        } else {
                            // User went Offline - Store last session to history
                            if (prevCurrentTx > 0n || prevCurrentRx > 0n) {
                                newAccumulatedTx += prevCurrentTx;
                                newAccumulatedRx += prevCurrentRx;
                                // console.log(`[ACCUMULATE] OFFLINE DETECTED for ${user.name}.`);
                            }
                        }
                    }

                    // Prepare Data
                    const updateData = {
                        comment: user.comment ? String(user.comment) : null,
                        lastSeenOnline: user.isOnline ? new Date() : undefined,
                        accumulatedTxBytes: newAccumulatedTx,
                        accumulatedRxBytes: newAccumulatedRx,
                        currentTxBytes: user.isOnline ? currentTx : undefined,
                        currentRxBytes: user.isOnline ? currentRx : undefined,
                        isOnline: user.isOnline,
                    };

                    const createData = {
                        routerId: router.id,
                        secretName: user.name,
                        comment: user.comment ? String(user.comment) : null,
                        accumulatedTxBytes: 0n,
                        accumulatedRxBytes: 0n,
                        currentTxBytes: currentTx,
                        currentRxBytes: currentRx,
                        lastSeenOnline: user.isOnline ? new Date() : null,
                        isOnline: user.isOnline,
                    };

                    // Add to transaction batch
                    transactionOperations.push(
                        this.prisma.pPPUser.upsert({
                            where: {
                                routerId_secretName: {
                                    routerId: router.id,
                                    secretName: user.name,
                                },
                            },
                            update: updateData,
                            create: createData,
                        })
                    );

                    // Side Effects (Cache & Notifications) - handle here, commit assumes success
                    if (user.isOnline) {
                        currentOnlineNames.add(user.name);
                        // NOTIFIKASI LOGIN
                        if (!this.onlineUsersCache.has(cacheKey)) {
                            loginList.push(user.name);
                        }
                        // Update RAM cache
                        this.onlineUsersCache.set(cacheKey, {
                            secretName: user.name,
                            routerId: router.id,
                            txBytes: currentTx,
                            rxBytes: currentRx,
                            lastUpdate: new Date(),
                        });
                    }
                } catch (err: any) {
                    console.error(`[PROCESS ERROR] Failed prepping user ${user.name}:`, err.message);
                }
            }

            // C. EXECUTE TRANSACTION IN CHUNKS
            // SQLite has limits on query variables and transaction size. keeping chunks small is safer.
            const CHUNK_SIZE = 50;
            for (let i = 0; i < transactionOperations.length; i += CHUNK_SIZE) {
                const chunk = transactionOperations.slice(i, i + CHUNK_SIZE);
                try {
                    await this.prisma.$transaction(chunk);
                } catch (txError) {
                    console.error(`[DB SYNC] Transaction chunk ${i} failed:`, txError.message);
                }
            }

            // Cleanup RAM cache for disconnected users
            for (const [cacheKey, cachedUser] of this.onlineUsersCache.entries()) {
                if (cachedUser.routerId === router.id && !currentOnlineNames.has(cachedUser.secretName)) {
                    logoutList.push(cachedUser.secretName);
                    this.recordSessionHistory(cachedUser).catch(e => console.error(e));
                    this.onlineUsersCache.delete(cacheKey);
                }
            }

            // SEND SUMMARY REPORT
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
                        disconnected: offlineList,
                        isHeartbeat: isHeartbeat
                    }
                ).catch(e => console.error('[TELEGRAM] Error sending report:', e));
            }

            // Update router lastSync (randomly to avoid constant writes)
            if (Math.random() < 0.1) {
                await this.prisma.router.update({
                    where: { id: router.id },
                    data: { lastSync: new Date() },
                });
            }

        } catch (error) {
            console.error(`[SYNC FATAL] Error syncing router ${router.host}:`, error.message);
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
