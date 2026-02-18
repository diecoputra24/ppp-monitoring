import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

    async getRouters(userId: string) {
        console.log(`Fetching routers for user ${userId}...`);
        return this.prisma.router.findMany({
            where: { userId },
            orderBy: { name: 'asc' },
        });
    }

    async getRouter(id: string, userId: string) {
        const router = await this.prisma.router.findUnique({
            where: { id },
        });
        if (!router) throw new NotFoundException('Router not found');
        if (router.userId !== userId) throw new ForbiddenException('Akses ditolak: router bukan milik Anda');
        return router;
    }

    async createRouter(data: any, userId: string) {
        return this.prisma.router.create({
            data: {
                ...data,
                port: parseInt(data.port),
                userId,
            },
        });
    }

    async updateRouter(id: string, data: any, userId: string) {
        await this.getRouter(id, userId); // validates ownership
        return this.prisma.router.update({
            where: { id },
            data: {
                ...data,
                port: data.port ? parseInt(data.port) : undefined,
            },
        });
    }

    async deleteRouter(id: string, userId: string) {
        await this.getRouter(id, userId); // validates ownership
        return this.prisma.router.delete({
            where: { id },
        });
    }

    async testConnection(id: string, userId: string) {
        const router = await this.getRouter(id, userId);
        const config: MikrotikConfig = {
            host: router.host,
            port: router.port,
            username: router.username,
            password: router.password,
        };
        return this.mikrotik.testConnection(config);
    }

    async syncRouter(id: string, userId?: string) {
        const router = userId ? await this.getRouter(id, userId) : await this.prisma.router.findUniqueOrThrow({ where: { id } });
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

    async getPPPProfiles(id: string, userId: string) {
        const router = await this.getRouter(id, userId);
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

    async getPPPUsers(id: string, userId: string) {
        const router = await this.getRouter(id, userId);

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
                originalProfile: storedUser?.originalProfile,
                latitude: storedUser?.latitude,
                longitude: storedUser?.longitude,
                odpId: storedUser?.odpId,
            };
        });
    }

    async updatePPPComment(id: string, secretName: string, comment: string, userId: string, pppId?: string) {
        const router = await this.getRouter(id, userId);
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

    async toggleIsolateUser(routerId: string, secretName: string, userId: string, pppId?: string, targetProfileOverride?: string) {
        const router = await this.getRouter(routerId, userId);

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
                // Use override if valid, else DB original, else default
                const targetProfile = (targetProfileOverride && targetProfileOverride.trim() !== '')
                    ? targetProfileOverride
                    : (dbUser?.originalProfile || 'default');

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
                // Step 1: Get ALL active connections
                const allActive = await api.menu('/ppp/active').print();

                // Step 2: Filter MANUALLY by exact name match (safest approach)
                const matchedConnections = (allActive || []).filter(
                    (a: any) => a.name === secretName
                );

                if (matchedConnections.length === 0) {
                    console.log(`[KILL] No active connection found for ${secretName}, skipping.`);
                } else {
                    console.log(`[KILL] Found ${matchedConnections.length} active connection(s) for ${secretName}`);

                    // Step 3: Remove ONLY matched connections
                    for (const conn of matchedConnections) {
                        // Debug: log actual object keys to find where ID is stored
                        console.log(`[KILL] Connection object keys:`, Object.keys(conn));
                        console.log(`[KILL] Connection data:`, JSON.stringify(conn));

                        // Try multiple possible ID key names
                        const connId = conn['.id'] || conn['id'] || conn['$$id'] || conn['number'];

                        if (connId) {
                            console.log(`[KILL] Removing connection id=${connId} name=${conn.name}`);
                            try {
                                await api.menu('/ppp/active').where('.id', connId).remove();
                                console.log(`[KILL] Successfully removed ${connId}`);
                            } catch (removeErr: any) {
                                // Fallback: try remove with just the number ID
                                console.warn(`[KILL] .where(.id) failed, trying direct remove...`);
                                try {
                                    const activeMenu = api.menu('/ppp/active');
                                    await activeMenu.remove(connId);
                                    console.log(`[KILL] Direct remove succeeded for ${connId}`);
                                } catch (directErr: any) {
                                    console.warn(`[KILL] Direct remove also failed:`, directErr?.message);
                                }
                            }
                        } else {
                            console.warn(`[KILL] Could not find ID for connection: ${conn.name}. Skipping remove.`);
                        }
                    }
                }
            } catch (killErr: any) {
                console.warn(`[KILL] Error for ${secretName}:`, killErr?.message || killErr);
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

    async createPPPUser(routerId: string, data: any, userId: string) {
        const router = await this.getRouter(routerId, userId);

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

    // ==================== MAP / ODP Methods ====================

    async getMapData(routerId: string, userId: string) {
        await this.getRouter(routerId, userId); // validate ownership

        const users = await this.prisma.pPPUser.findMany({
            where: { routerId, latitude: { not: null } },
            select: {
                id: true,
                secretName: true,
                latitude: true,
                longitude: true,
                isOnline: true,
                odpId: true,
                comment: true,
            },
        });

        const odps = await this.prisma.oDP.findMany({
            where: { routerId },
        });

        const odpCables = await this.prisma.oDPCable.findMany({
            where: { routerId },
        });

        return { users, odps, odpCables };
    }

    async getAllMapData(userId: string) {
        const routers = await this.prisma.router.findMany({
            where: { userId },
            select: { id: true, name: true }
        });
        const routerIds = routers.map(r => r.id);

        const [users, odps, odpCables] = await Promise.all([
            this.prisma.pPPUser.findMany({
                where: { routerId: { in: routerIds }, latitude: { not: null } },
                select: {
                    id: true,
                    secretName: true,
                    latitude: true,
                    longitude: true,
                    isOnline: true,
                    odpId: true,
                    comment: true,
                    routerId: true, // Include routerId for context
                }
            }),
            this.prisma.oDP.findMany({ where: { routerId: { in: routerIds } } }),
            this.prisma.oDPCable.findMany({ where: { routerId: { in: routerIds } } })
        ]);

        return { users, odps, odpCables, routers };
    }

    async updateUserCoordinates(routerId: string, secretName: string, userId: string, data: { latitude: number | null; longitude: number | null; odpId?: string | null }) {
        await this.getRouter(routerId, userId);

        const updated = await this.prisma.pPPUser.update({
            where: {
                routerId_secretName: { routerId, secretName },
            },
            data: {
                latitude: data.latitude,
                longitude: data.longitude,
                odpId: data.odpId ?? undefined,
            },
            select: {
                id: true,
                secretName: true,
                latitude: true,
                longitude: true,
                odpId: true,
            },
        });
        return updated;
    }

    async getODPs(routerId: string, userId: string) {
        await this.getRouter(routerId, userId);
        return this.prisma.oDP.findMany({
            where: { routerId },
            orderBy: { name: 'asc' },
        });
    }

    async createODP(routerId: string, userId: string, data: { name: string; latitude: number; longitude: number }) {
        await this.getRouter(routerId, userId);
        return this.prisma.oDP.create({
            data: {
                routerId,
                name: data.name,
                latitude: data.latitude,
                longitude: data.longitude,
            },
        });
    }

    async updateODP(routerId: string, odpId: string, userId: string, data: { name?: string; latitude?: number; longitude?: number }) {
        await this.getRouter(routerId, userId);
        return this.prisma.oDP.update({
            where: { id: odpId },
            data,
        });
    }

    async deleteODP(routerId: string, odpId: string, userId: string) {
        await this.getRouter(routerId, userId);
        return this.prisma.oDP.delete({
            where: { id: odpId },
        });
    }

    // ==================== ODP Cable Methods ====================

    async createODPCable(routerId: string, userId: string, data: { fromOdpId: string; toOdpId: string; label?: string; waypoints?: [number, number][] }) {
        await this.getRouter(routerId, userId);
        return this.prisma.oDPCable.create({
            data: {
                routerId,
                fromOdpId: data.fromOdpId,
                toOdpId: data.toOdpId,
                label: data.label || null,
                waypoints: data.waypoints ? JSON.stringify(data.waypoints) : null,
            },
        });
    }

    async updateODPCableWaypoints(routerId: string, cableId: string, userId: string, waypoints: [number, number][]) {
        await this.getRouter(routerId, userId);
        return this.prisma.oDPCable.update({
            where: { id: cableId },
            data: {
                waypoints: waypoints.length > 0 ? JSON.stringify(waypoints) : null,
            },
        });
    }

    async deleteODPCable(routerId: string, cableId: string, userId: string) {
        await this.getRouter(routerId, userId);
        return this.prisma.oDPCable.delete({
            where: { id: cableId },
        });
    }
}
