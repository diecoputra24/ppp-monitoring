import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MikrotikService, MikrotikConfig } from '../mikrotik/mikrotik.service';
import { UsageTrackingService } from '../usage/usage-tracking.service';

@Injectable()
export class RouterService {
    constructor(
        private prisma: PrismaService,
        private mikrotik: MikrotikService,
        private usageTracking: UsageTrackingService
    ) { }

    async getRouters() {
        console.log('Fetching all routers from DB...');
        return this.prisma.router.findMany({
            orderBy: { name: 'asc' },
        });
    }

    async getRouter(id: string) {
        const router = await this.prisma.router.findUnique({
            where: { id },
        });
        if (!router) throw new NotFoundException('Router not found');
        return router;
    }

    async createRouter(data: any) {
        return this.prisma.router.create({
            data: {
                ...data,
                port: parseInt(data.port),
            },
        });
    }

    async updateRouter(id: string, data: any) {
        return this.prisma.router.update({
            where: { id },
            data: {
                ...data,
                port: data.port ? parseInt(data.port) : undefined,
            },
        });
    }

    async deleteRouter(id: string) {
        return this.prisma.router.delete({
            where: { id },
        });
    }

    async testConnection(id: string) {
        const router = await this.getRouter(id);
        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };
        return this.mikrotik.testConnection(config);
    }

    async syncRouter(id: string) {
        const router = await this.getRouter(id);
        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };

        const identity = await this.mikrotik.getSystemIdentity(config);
        return this.prisma.router.update({
            where: { id },
            data: {
                name: identity !== 'Unknown' ? identity : router.name,
                lastSync: new Date(),
            },
        });
    }

    async getPPPProfiles(id: string) {
        const router = await this.getRouter(id);
        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };

        const client = this.mikrotik.createClient(config);

        try {
            const api: any = await client.connect();
            const profiles = await api.menu('/ppp/profile').print();
            await client.close();

            return profiles.map((p: any) => p.name);
        } catch (error) {
            console.error('Error fetching profiles:', error);
            try { await client.close(); } catch (e) { }
            return [];
        }
    }

    async getPPPUsers(id: string) {
        const router = await this.getRouter(id);

        // 1. Try to get from Cache first (MOST IMPORTANT FOR SPEED)
        let pppUsers = this.usageTracking.getCachedRouterData(id);

        // 2. If not in cache, fetch from Mikrotik with tight timeout
        if (!pppUsers) {
            console.log(`Cache miss for router ${id}, fetching from Mikrotik...`);
            const config: MikrotikConfig = {
                host: router.host,
                port: router.port,
                username: router.username,
                password: router.password,
            };

            try {
                // Timeout 3 detik agar tidak memblokir UI jika Mikrotik lemot
                const fetchPromise = this.mikrotik.getPPPStatus(config);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Mikrotik Timeout')), 3000)
                );

                const pppStatus: any = await Promise.race([fetchPromise, timeoutPromise]);
                pppUsers = pppStatus.users;
            } catch (err) {
                console.error(`Fetch failed for router ${id}:`, err.message);
                pppUsers = []; // Return empty list instead of hanging
            }
        }

        // 3. Get stored usage data from DB
        const storedUsers = await this.prisma.pPPUser.findMany({
            where: { routerId: id },
        });
        const usageMap = new Map(storedUsers.map(u => [u.secretName, u]));

        // 4. Merge Logic:
        // - If online (in pppUsers): Show Current Live + Accumulated History
        // - If offline (in storedUsers ONLY): Show Stored Current (Last Session) + Accumulated History

        // Start with all stored users (Superset of likely users)
        const safePPPUsers = pppUsers || [];
        const allUserNames = new Set([...safePPPUsers.map(u => u.name), ...storedUsers.map(u => u.secretName)]);

        return Array.from(allUserNames).map(name => {
            const liveUser = safePPPUsers.find(u => u.name === name);
            const storedUser = usageMap.get(name);

            // Base data from either source
            const baseUser = liveUser || {
                name: name,
                service: 'pppoe', // Default as stored user doesn't have service field
                profile: storedUser?.originalProfile || 'default',
                comment: storedUser?.comment,
                id: storedUser?.id || 'unknown',
                isOnline: false,
                currentTxBytes: BigInt(0),
                currentRxBytes: BigInt(0),
            };

            const accumulatedTx = storedUser?.accumulatedTxBytes || BigInt(0);
            const accumulatedRx = storedUser?.accumulatedRxBytes || BigInt(0);

            // If offline, maybe we want to show the LAST Session bytes?
            // "Smart Accumulation" usually means: Accumulated = All Past Sessions. Current = Active Session.
            // If offline, Current is 0. 
            // BUT, user asked to "show data in database".
            // If you want to show the "Last Session" value even when offline, we can use storedUser.currentTxBytes

            // Let's stick to standard: Offline = 0 Current. History = Accumulated.
            // UNLESS user explicitly wants "Total = Accumulated + Last Stored Session"

            let displayCurrentTx = liveUser ? liveUser.currentTxBytes : BigInt(0);
            let displayCurrentRx = liveUser ? liveUser.currentRxBytes : BigInt(0);

            // SPECIAL REQUEST: "saat offline juga tx rx ... kembali ke 0, padahal sudah ada didatabase"
            // This implies user WANTS to see the last session value even if offline.
            if (!liveUser && storedUser) {
                displayCurrentTx = storedUser.currentTxBytes;
                displayCurrentRx = storedUser.currentRxBytes;
            }

            const totalTx = accumulatedTx + displayCurrentTx;
            const totalRx = accumulatedRx + displayCurrentRx;

            return {
                ...baseUser,
                currentTxBytes: displayCurrentTx.toString(),
                currentRxBytes: displayCurrentRx.toString(),
                currentTxRate: liveUser?.currentTxRate?.toString() || '0',
                currentRxRate: liveUser?.currentRxRate?.toString() || '0',
                storedTxBytes: accumulatedTx.toString(),
                storedRxBytes: accumulatedRx.toString(),
                totalTxBytes: totalTx.toString(),
                totalRxBytes: totalRx.toString(),
            };
        });
    }

    async updatePPPComment(id: string, secretName: string, comment: string, pppId?: string) {
        const router = await this.getRouter(id);
        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };

        const success = await this.mikrotik.updatePPPSecretComment(config, secretName, comment, pppId);

        if (success) {
            // Update database as well
            await this.prisma.pPPUser.update({
                where: {
                    routerId_secretName: {
                        routerId: id,
                        secretName: secretName,
                    }
                },
                data: { comment: comment }
            }).catch(() => { /* User might not be in DB yet, ignore */ });

            // Invalidate cache to force fresh fetch on next UI request
            this.usageTracking.clearRouterCache(id);
        }

        return success;
    }

    async toggleIsolateUser(routerId: string, secretName: string, pppId?: string) {
        const router = await this.getRouter(routerId);

        if (!router.isolirProfile) {
            throw new Error('Router Settings: Isolir Profile not configured!');
        }

        // Get user from DB to check current state
        const dbUser = await this.prisma.pPPUser.findUnique({
            where: {
                routerId_secretName: { routerId, secretName }
            }
        });

        // Get current state from Mikrotik
        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };

        const client = this.mikrotik.createClient(config);
        let action = '';

        try {
            const api: any = await client.connect();

            // Find the secret
            const secrets = await api.menu('/ppp/secret').print();
            const secret = secrets.find((s: any) => s.name === secretName);

            if (!secret) throw new Error('User not found on Mikrotik');

            const currentProfile = secret.profile;
            const isIsolated = currentProfile === router.isolirProfile;

            // Logic:
            // If currently isolated -> RESTORE to original
            // If NOT isolated -> SAVE original and SWITCH to isolir

            if (isIsolated) {
                action = 'unisolate';
                const targetProfile = dbUser?.originalProfile || 'default';

                console.log(`[UNISOLATE] restoring ${secretName} to ${targetProfile}`);
                await api.menu('/ppp/secret').where('name', secretName).set({ profile: targetProfile });

                if (dbUser) {
                    await this.prisma.pPPUser.update({
                        where: { id: dbUser.id },
                        data: { originalProfile: null }
                    });
                }
            } else {
                action = 'isolate';
                console.log(`[ISOLATE] switching ${secretName} from ${currentProfile} to ${router.isolirProfile}`);

                if (dbUser) {
                    await this.prisma.pPPUser.update({
                        where: { id: dbUser.id },
                        data: { originalProfile: currentProfile }
                    });
                }

                await api.menu('/ppp/secret').where('name', secretName).set({ profile: router.isolirProfile });
            }

            // KILL Active Connection to force reconnect with new profile
            try {
                const activeConnections = await api.menu('/ppp/active').print();
                const active = activeConnections.find((a: any) => a.name === secretName);

                if (active) {
                    console.log(`[KILL] Removing active connection for ${secretName}`);
                    await api.menu('/ppp/active').remove(active['.id']);
                }
            } catch (killErr) {
                console.warn('Failed to kill active connection:', killErr);
            }

            await client.close();

            // Clear cache
            this.usageTracking.clearRouterCache(routerId);

            return { success: true, action, message: `User ${action === 'isolate' ? 'ISOLATED' : 'RESTORED'} successfully` };

        } catch (error) {
            console.log(`Error toggling isolate: ${error.message}`);
            try { await client.close(); } catch (e) { }
            throw new Error(`Failed to ${action || 'toggle'} isolate: ${error.message}`);
        }
    }

    async createPPPUser(routerId: string, data: any) {
        const router = await this.prisma.router.findUnique({ where: { id: routerId } });
        if (!router) throw new NotFoundException('Router not found');

        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };

        const result = await this.mikrotik.createPPPSecret(config, data);

        if (result) {
            this.usageTracking.clearRouterCache(routerId);
            await this.syncRouter(routerId);
        }

        return result;
    }
}
