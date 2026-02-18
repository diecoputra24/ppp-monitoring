import { create } from 'zustand';
import { routerApi, type Router, type PPPUser, type CreateRouterDto, type UpdateRouterDto } from '../api';
import { toast } from './toastStore';

interface RouterState {
    routers: Router[];
    selectedRouter: Router | null;
    pppUsers: PPPUser[];
    loading: boolean;
    syncing: boolean;
    error: string | null;

    // Actions
    fetchRouters: () => Promise<void>;
    selectRouter: (router: Router | null) => void;
    createRouter: (data: CreateRouterDto) => Promise<void>;
    updateRouter: (id: string, data: UpdateRouterDto) => Promise<void>;
    deleteRouter: (id: string) => Promise<void>;
    testConnection: (id: string) => Promise<{ isConnected: boolean; identity: string | null }>;
    syncRouter: (id: string) => Promise<void>;
    fetchPPPUsers: (id: string, isBackground?: boolean) => Promise<void>;
    updatePPPComment: (userName: string, comment: string, pppId?: string) => Promise<void>;
    toggleIsolateUser: (userName: string, pppId?: string, targetProfile?: string) => Promise<void>;
    createPPPUser: (data: any) => Promise<void>;
    getRouterProfiles: (id: string) => Promise<string[]>;
    clearError: () => void;
}

export const useRouterStore = create<RouterState>((set, get) => ({
    routers: [],
    selectedRouter: null,
    pppUsers: [],
    loading: false,
    syncing: false,
    error: null,

    fetchRouters: async () => {
        set({ loading: true, error: null });
        try {
            const response = await routerApi.getAll();
            set({ routers: response.data, loading: false });
        } catch (error) {
            set({ error: 'Failed to fetch routers', loading: false });
            toast.error('Gagal memuat daftar router');
        }
    },

    selectRouter: (router) => {
        set({ selectedRouter: router, pppUsers: [], loading: !!router });
    },

    createRouter: async (data) => {
        set({ loading: true, error: null });
        try {
            await routerApi.create(data);
            await get().fetchRouters();
            toast.success(`Router "${data.name}" berhasil ditambahkan`);
        } catch (error) {
            set({ error: 'Failed to create router', loading: false });
            toast.error('Gagal menambahkan router');
            throw error;
        }
    },

    updateRouter: async (id, data) => {
        set({ loading: true, error: null });
        try {
            await routerApi.update(id, data);
            await get().fetchRouters();
            toast.success('Router berhasil diperbarui');
        } catch (error) {
            set({ error: 'Failed to update router', loading: false });
            toast.error('Gagal memperbarui router');
            throw error;
        }
    },

    deleteRouter: async (id) => {
        set({ loading: true, error: null });
        try {
            await routerApi.delete(id);
            const { selectedRouter } = get();
            if (selectedRouter?.id === id) {
                set({ selectedRouter: null, pppUsers: [] });
            }
            await get().fetchRouters();
            toast.success('Router berhasil dihapus');
        } catch (error) {
            set({ error: 'Failed to delete router', loading: false });
            toast.error('Gagal menghapus router');
            throw error;
        }
    },

    testConnection: async (id) => {
        try {
            const response = await routerApi.testConnection(id);
            if (response.data.isConnected) {
                toast.success('Koneksi ke router berhasil');
            } else {
                toast.error('Koneksi ke router gagal');
            }
            return response.data;
        } catch (error) {
            toast.error('Gagal menguji koneksi router');
            throw error;
        }
    },

    syncRouter: async (id) => {
        set({ syncing: true, error: null });
        try {
            await routerApi.sync(id);
            await get().fetchRouters();
            await get().fetchPPPUsers(id);
            set({ syncing: false });
            toast.success('Sinkronisasi router berhasil');
        } catch (error) {
            set({ error: 'Failed to sync router', syncing: false });
            toast.error('Gagal sinkronisasi router');
            throw error;
        }
    },

    fetchPPPUsers: async (id: string, isBackground = false) => {
        if (!isBackground) {
            set({ loading: true, error: null });
        }
        try {
            const response = await routerApi.getPPPUsers(id);
            // Spread to create new array reference to force re-render
            set({ pppUsers: [...response.data], loading: false, error: null });
        } catch (error) {
            console.error("Fetch Error:", error);
            set({ error: 'Failed to fetch PPP users', loading: false });
            toast.error('Gagal memuat data PPP users');
        }
    },

    updatePPPComment: async (userName, comment, pppId) => {
        const { selectedRouter, fetchPPPUsers } = get();
        if (!selectedRouter) return;

        set({ loading: true, error: null });
        try {
            await routerApi.updatePPPComment(selectedRouter.id, userName, comment, pppId);
            await fetchPPPUsers(selectedRouter.id);
            set({ loading: false });
            toast.success(`Komentar untuk "${userName}" berhasil diperbarui`);
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || `Gagal memperbarui komentar untuk "${userName}"`;
            set({ error: errorMsg, loading: false });
            toast.error(errorMsg);
            throw error;
        }
    },

    toggleIsolateUser: async (userName: string, pppId?: string, targetProfile?: string) => {
        const { selectedRouter, fetchPPPUsers } = get();
        if (!selectedRouter) return;

        set({ loading: true, error: null });
        try {
            const response = await routerApi.toggleIsolate(selectedRouter.id, userName, pppId, targetProfile);
            await fetchPPPUsers(selectedRouter.id);
            set({ loading: false });

            const message = response.data.action === 'isolate'
                ? `User "${userName}" berhasil DIISOLIR`
                : `User "${userName}" berhasil DIPULIHKAN (Buka Isolir)`;

            toast.success(message);
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || `Gagal mengubah status isolir untuk "${userName}"`;
            set({ error: errorMsg, loading: false });
            toast.error(errorMsg);
            throw error;
        }
    },

    createPPPUser: async (data: any) => {
        const { selectedRouter, fetchPPPUsers } = get();
        if (!selectedRouter) return;

        set({ loading: true, error: null });
        try {
            await routerApi.createPPPUser(selectedRouter.id, data);
            // Slight delay to ensure DB/Cache is settled before refetching
            await new Promise(resolve => setTimeout(resolve, 500));
            await fetchPPPUsers(selectedRouter.id);
            set({ loading: false });
            toast.success(`User "${data.name}" berhasil ditambahkan`);
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || `Gagal menambahkan user "${data.name}"`;
            set({ error: errorMsg, loading: false });
            toast.error(errorMsg);
            throw error;
        }
    },

    async getRouterProfiles(id: string) {
        try {
            const response = await routerApi.getProfiles(id);
            return response.data;
        } catch (error) {
            console.error('Failed to fetch profiles', error);
            return [];
        }
    },

    clearError: () => set({ error: null }),
}));
