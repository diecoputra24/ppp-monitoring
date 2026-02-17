import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { RouterOSClient } from 'routeros-client';

export interface MikrotikConfig {
    id?: string;
    host: string;
    port: number;
    username: string;
    password: string;
}

export interface PPPSecret {
    '.id': string;
    name: string;
    password?: string;
    service: string;
    profile?: string;
    'local-address'?: string;
    'remote-address'?: string;
    disabled?: string;
    comment?: string;
}

export interface PPPActive {
    '.id': string;
    name: string;
    service: string;
    'caller-id': string;
    address: string;
    uptime: string;
    'session-id'?: string;
}

export interface PPPUserStatus {
    id: string;
    name: string;
    service: string;
    profile: string;
    isOnline: boolean;
    address?: string;
    uptime?: string;
    callerId?: string;
    comment?: string;
    currentTxBytes: bigint;
    currentRxBytes: bigint;
    currentTxRate?: bigint;
    currentRxRate?: bigint;
    accumulatedTxBytes?: bigint;
    accumulatedRxBytes?: bigint;
}

@Injectable()
export class MikrotikService {
    public createClient(config: MikrotikConfig): RouterOSClient {
        const client = new RouterOSClient({
            host: config.host,
            user: config.username,
            password: config.password,
            port: config.port,
            timeout: 10, // Increased timeout to 10s
            keepalive: true,
        });

        // Prevent Unhandled 'error' event crashing the Node process
        client.on('error', (err: any) => {
            // Just log, don't throw. The calling function (connect) will catch the rejection.
            console.error(`[Mikrotik Client Error] ${config.host}:`, err.message);
        });

        return client;
    }

    async testConnection(config: MikrotikConfig): Promise<{ isConnected: boolean; identity: string | null }> {
        const client = this.createClient(config);
        try {
            console.log(`Testing connection to ${config.host}...`);
            const api: any = await client.connect();
            const result = await api.menu('/system/identity').print();
            const identity = result[0]?.name || 'Unknown';
            await client.close();
            console.log(`Connection to ${config.host} (Identity: ${identity}) successful.`);
            return { isConnected: true, identity };
        } catch (error) {
            console.error(`Connection test failed for ${config.host}:`, error.message);
            try { await client.close(); } catch (e) { }
            return { isConnected: false, identity: null };
        }
    }

    async getSystemIdentity(config: MikrotikConfig): Promise<string> {
        const client = this.createClient(config);
        try {
            const api: any = await client.connect();
            const result = await api.menu('/system/identity').print();
            await client.close();
            return result[0]?.name || 'Unknown';
        } catch (error) {
            try { await client.close(); } catch (e) { }
            return 'Unknown';
        }
    }

    async getPPPStatus(config: MikrotikConfig): Promise<{
        secrets: PPPSecret[];
        active: PPPActive[];
        users: PPPUserStatus[];
    }> {
        const client = this.createClient(config);
        const start = Date.now();
        try {
            console.log(`[MIKROTIK] Fetching PPP Status from ${config.host}...`);
            const api: any = await client.connect();

            // Execute sequentially to avoid race conditions/timeouts in client
            const secrets = await api.menu('/ppp/secret').print();
            const active = await api.menu('/ppp/active').print();
            const interfaces = await api.menu('/interface').print();

            await client.close();
            console.log(`[MIKROTIK] Fetch completed in ${Date.now() - start}ms. Active sessions found: ${active ? active.length : 0}`);

            // Ensure active is an array before mapping
            const safeActive = Array.isArray(active) ? active : [];
            const safeInterfaces = Array.isArray(interfaces) ? interfaces : [];
            const safeSecrets = Array.isArray(secrets) ? secrets : [];

            // DEBUG: Print first active session structure to verify 'name' field
            if (safeActive.length > 0) {
                // console.log('[DEBUG] First active session:', JSON.stringify(safeActive[0]));
            }

            const activeMap = new Map();
            safeActive.forEach((a: any) => {
                if (a.name) activeMap.set(a.name, a);
            });

            const interfaceBytesMap = new Map<string, { txBytes: bigint; rxBytes: bigint; txRate: bigint; rxRate: bigint }>();

            for (const iface of safeInterfaces) {
                // Adjust regex to match your interface naming convention
                // Default Mikrotik PPP interface usually format: <pppoe-username>
                // But some configs use explicit names. We try to match widespread patterns.
                const name = iface.name as string;
                if (!name) continue;

                // Pattern 1: <pppoe-username>
                const match1 = name.match(/^<pppoe-(.+?)>$/);
                // Pattern 2: pppoe-username (without brackets)
                const match2 = name.match(/^pppoe-(.+?)$/);
                // Pattern 3: simply username (rare but possible if manually named)

                let username = '';
                if (match1) username = match1[1];
                else if (match2) username = match2[1];

                // Fallback: Check if interface name matches a secret user directly (sometimes happens)
                if (!username && activeMap.has(name)) {
                    username = name;
                }

                if (username) {
                    interfaceBytesMap.set(username, {
                        txBytes: BigInt(iface['rx-byte'] || iface.rxByte || '0'), // Swap logic might be needed depending on perspective
                        rxBytes: BigInt(iface['tx-byte'] || iface.txByte || '0'),
                        txRate: BigInt(iface['rx-bits-per-second'] || '0'),
                        rxRate: BigInt(iface['tx-bits-per-second'] || '0'),
                    });
                }

                // Also map by direct interface name (for <ovpn-user>, <l2tp-user> etc)
                // interfaceBytesMap.set(name, ...); // Can add if needed
            }

            const users: PPPUserStatus[] = safeSecrets.map((secret: any) => {
                const activeSession = activeMap.get(secret.name);

                // Try to find traffic data using secret name
                // Note: Mikrotik interface name for PPP is usually <pppoe-NAME>
                let interfaceBytes = interfaceBytesMap.get(secret.name);

                // If not found, try searching interface map for <pppoe-NAME> format manually
                if (!interfaceBytes) {
                    const pppoeName1 = `<pppoe-${secret.name}>`;
                    const pppoeName2 = `pppoe-${secret.name}`;

                    // Optimization needed here if interface list is huge, but fine for now
                    const iface1 = safeInterfaces.find((i: any) => i.name === pppoeName1);
                    const iface2 = safeInterfaces.find((i: any) => i.name === pppoeName2);
                    const targetIface = iface1 || iface2;

                    if (targetIface) {
                        interfaceBytes = {
                            txBytes: BigInt(targetIface['rx-byte'] || targetIface.rxByte || '0'),
                            rxBytes: BigInt(targetIface['tx-byte'] || targetIface.txByte || '0'),
                            txRate: BigInt(targetIface['rx-bits-per-second'] || '0'),
                            rxRate: BigInt(targetIface['tx-bits-per-second'] || '0'),
                        };
                    }
                }

                return {
                    id: secret['.id'],
                    name: secret.name,
                    service: secret.service,
                    profile: secret.profile || 'default',
                    isOnline: !!activeSession,
                    address: activeSession?.address,
                    uptime: activeSession?.uptime,
                    callerId: activeSession?.['caller-id'],
                    comment: secret.comment,
                    currentTxBytes: interfaceBytes?.txBytes || BigInt(0),
                    currentRxBytes: interfaceBytes?.rxBytes || BigInt(0),
                    currentTxRate: interfaceBytes?.txRate || BigInt(0),
                    currentRxRate: interfaceBytes?.rxRate || BigInt(0),
                };
            });

            return { secrets: safeSecrets, active: safeActive, users };
        } catch (error) {
            console.error(`[MIKROTIK] Error fetching PPP status from ${config.host}:`, error.message);
            try { await client.close(); } catch (e) { }
            return { secrets: [], active: [], users: [] };
        }
    }

    async updatePPPSecretComment(config: MikrotikConfig, secretName: string, comment: string, pppId?: string): Promise<boolean> {
        const client = this.createClient(config);
        try {
            const api: any = await client.connect();

            // Normalize function
            const normalize = (str: string) => {
                if (!str) return '';
                return str.replace(/[^\x20-\x7E]/g, '').trim().toLowerCase();
            };

            const searchName = normalize(secretName);
            console.log(`Searching for: "${secretName}" (normalized: "${searchName}")`);

            // Get secrets menu
            const secretsMenu = api.menu('/ppp/secret');

            // Use where() to find and update the specific secret
            const result = await secretsMenu
                .where('name', secretName)
                .set({ comment: comment });

            console.log(`Update result:`, result);
            console.log(`Successfully updated comment for PPP User: ${secretName}`);

            await client.close();
            return true;
        } catch (error) {
            console.error(`Error updating PPP comment for ${secretName}:`, error.message);
            try { await client.close(); } catch (e) { }
            throw error;
        }
    }

    async createPPPSecret(config: MikrotikConfig, data: { name: string, password: string, service?: string, profile: string, comment?: string }): Promise<boolean> {
        const client = this.createClient(config);
        try {
            const api: any = await client.connect();
            const secretsMenu = api.menu('/ppp/secret');

            await secretsMenu.add({
                name: data.name,
                password: data.password,
                service: data.service || 'pppoe',
                profile: data.profile,
                comment: data.comment || ''
            });

            await client.close();
            return true;
        } catch (error) {
            console.error(`Error creating PPP Secret ${data.name}:`, error.message);
            try { await client.close(); } catch (e) { }
            throw error;
        }
    }
}
