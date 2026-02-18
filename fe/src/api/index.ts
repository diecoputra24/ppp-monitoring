import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3008/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Router {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    password: string;
    isActive: boolean;
    isolirProfile?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
    lastSync: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PPPUser {
    id: string;
    name: string;
    service: string;
    profile: string;
    isOnline: boolean;
    address?: string;
    uptime?: string;
    callerId?: string;
    comment?: string;
    originalProfile?: string; // Need this to know if isolated
    // Coordinates
    latitude?: number;
    longitude?: number;
    odpId?: string;
    // Usage data
    currentTxBytes?: string;
    currentRxBytes?: string;
    currentTxRate?: string;
    currentRxRate?: string;
    storedTxBytes?: string;
    storedRxBytes?: string;
    totalTxBytes?: string;
    totalRxBytes?: string;
}

export interface ODP {
    id: string;
    routerId: string;
    name: string;
    latitude: number;
    longitude: number;
    createdAt: string;
    updatedAt: string;
}

export interface ODPCable {
    id: string;
    routerId: string;
    fromOdpId: string;
    toOdpId: string;
    label: string | null;
    waypoints: string | null; // JSON-encoded [number, number][]
    createdAt: string;
}

export interface MapData {
    users: {
        id: string;
        secretName: string;
        latitude: number | null;
        longitude: number | null;
        isOnline: boolean;
        odpId: string | null;
        comment: string | null;
        routerId?: string; // Add context
    }[];
    odps: ODP[];
    odpCables: ODPCable[];
    routers?: { id: string; name: string }[];
}

export interface PPPStatus {
    users: PPPUser[];
    secrets: unknown[];
    active: unknown[];
}

export interface CreateRouterDto {
    name: string;
    host: string;
    port?: number;
    username: string;
    password: string;
    isActive?: boolean;
    isolirProfile?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
}

export interface UpdateRouterDto {
    name?: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    isActive?: boolean;
    isolirProfile?: string;
    telegramBotToken?: string;
    telegramChatId?: string;
}

export const routerApi = {
    getAll: () => api.get<Router[]>('/routers'),
    getOne: (id: string) => api.get<Router>(`/routers/${id}`),
    create: (data: CreateRouterDto) => api.post<Router>('/routers', data),
    update: (id: string, data: UpdateRouterDto) => api.put<Router>(`/routers/${id}`, data),
    delete: (id: string) => api.delete(`/routers/${id}`),
    testConnection: (id: string) => api.post<{ isConnected: boolean; identity: string | null }>(`/routers/${id}/test`),
    sync: (id: string) => api.post<Router>(`/routers/${id}/sync`),
    getProfiles: (id: string) => api.get<string[]>(`/routers/${id}/profiles`),
    getPPPUsers: (id: string) => api.get<PPPUser[]>(`/routers/${id}/ppp`),
    updatePPPComment: (routerId: string, userName: string, comment: string, pppId?: string) =>
        api.post(`/routers/${routerId}/ppp/${userName}/comment`, { comment, pppId }),
    toggleIsolate: (routerId: string, userName: string, pppId?: string, targetProfile?: string) =>
        api.post(`/routers/${routerId}/ppp/${userName}/isolate`, { pppId, targetProfile }),
    createPPPUser: (routerId: string, data: any) =>
        api.post(`/routers/${routerId}/ppp`, data),

    // Map & ODP
    getMapData: (routerId: string) => api.get<MapData>(`/routers/${routerId}/map`),
    getAllMapData: () => api.get<MapData>('/routers/map/global'),
    updateUserCoordinates: (routerId: string, userName: string, data: { latitude: number | null; longitude: number | null; odpId?: string | null }) =>
        api.put(`/routers/${routerId}/ppp/${userName}/coordinates`, data),
    getODPs: (routerId: string) => api.get<ODP[]>(`/routers/${routerId}/odps`),
    createODP: (routerId: string, data: { name: string; latitude: number; longitude: number }) =>
        api.post<ODP>(`/routers/${routerId}/odps`, data),
    updateODP: (routerId: string, odpId: string, data: { name?: string; latitude?: number; longitude?: number }) =>
        api.put<ODP>(`/routers/${routerId}/odps/${odpId}`, data),
    deleteODP: (routerId: string, odpId: string) =>
        api.delete(`/routers/${routerId}/odps/${odpId}`),

    // ODP Cables
    createODPCable: (routerId: string, data: { fromOdpId: string; toOdpId: string; label?: string; waypoints?: [number, number][] }) =>
        api.post(`/routers/${routerId}/odp-cables`, data),
    updateODPCableWaypoints: (routerId: string, cableId: string, waypoints: [number, number][]) =>
        api.put(`/routers/${routerId}/odp-cables/${cableId}/waypoints`, { waypoints }),
    deleteODPCable: (routerId: string, cableId: string) =>
        api.delete(`/routers/${routerId}/odp-cables/${cableId}`),
};

// Helper function to format bytes to human readable
export function formatBytes(bytes: string | number | undefined, decimals = 2): string {
    if (!bytes || bytes === '0') return '0 B';

    const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(numBytes) || numBytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(numBytes) / Math.log(k));

    return parseFloat((numBytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to format bits per second
export function formatbps(bits: string | number | undefined, decimals = 1): string {
    if (!bits || bits === '0') return '0 bps';

    const numBits = typeof bits === 'string' ? parseInt(bits, 10) : bits;
    if (isNaN(numBits) || numBits === 0) return '0 bps';

    const k = 1000; // standard for bits
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];

    const i = Math.floor(Math.log(numBits) / Math.log(k));
    if (i < 0) return numBits + ' bps';

    const val = numBits / Math.pow(k, i);
    return parseFloat(val.toFixed(dm)) + ' ' + sizes[i];
}
