import { create } from 'zustand';
import { authApi, type AuthUser, type SignInPayload, type SignUpPayload, type ChangePasswordPayload } from '../api/auth';
import { api } from '../api';
import { toast } from './toastStore';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;

    // Actions
    signIn: (payload: SignInPayload) => Promise<void>;
    signUp: (payload: SignUpPayload) => Promise<void>;
    signOut: () => Promise<void>;
    changePassword: (payload: ChangePasswordPayload) => Promise<void>;
    updateProfile: (name: string) => Promise<void>;
    initAuth: () => Promise<void>; // Changed to Async
    fetchUser: () => Promise<void>; // New action to refresh user data
}

function saveAuth(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

function loadAuth(): { token: string | null; user: AuthUser | null } {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    let user: AuthUser | null = null;
    if (userStr) {
        try { user = JSON.parse(userStr); } catch { /* ignore */ }
    }
    return { token, user };
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,

    initAuth: async () => {
        const { token, user } = loadAuth();
        if (token && user) {
            // Set axios default header immediately for subsequent calls
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            set({ token, user, isAuthenticated: true });

            // Refresh user data from server to get latest role/changes
            try {
                await get().fetchUser();
            } catch (error) {
                // If token invalid, sign out
                console.error("Session invalid", error);
                // Optional: get().signOut(); 
                // But usually axios interceptor handles 401
            }
        }
    },

    fetchUser: async () => {
        try {
            const res = await authApi.getMe();
            const userData = res.data.data.user;
            const { token } = get();

            // Update state and local storage
            set({ user: userData });
            if (token) {
                saveAuth(token, userData);
            }
        } catch (error) {
            throw error;
        }
    },

    signIn: async (payload) => {
        set({ loading: true });
        try {
            const res = await authApi.signIn(payload);
            const { user, tokens } = res.data.data;

            saveAuth(tokens.accessToken, user);
            api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
            set({ user, token: tokens.accessToken, isAuthenticated: true, loading: false });
            toast.success(`Selamat datang, ${user.name}!`);
        } catch (error: any) {
            set({ loading: false });
            const msg = error.response?.data?.message
                || error.response?.data?.errors?.[0]?.message
                || 'Login gagal';
            toast.error(msg);
            throw error;
        }
    },

    signUp: async (payload) => {
        set({ loading: true });
        try {
            const res = await authApi.signUp(payload);
            const { user, tokens } = res.data.data;

            saveAuth(tokens.accessToken, user);
            api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
            set({ user, token: tokens.accessToken, isAuthenticated: true, loading: false });
            toast.success(`Akun berhasil dibuat. Selamat datang, ${user.name}!`);
        } catch (error: any) {
            set({ loading: false });
            const msg = error.response?.data?.message
                || error.response?.data?.errors?.[0]?.message
                || 'Registrasi gagal';
            toast.error(msg);
            throw error;
        }
    },

    signOut: async () => {
        try {
            await authApi.signOut();
        } catch { /* ignore */ }
        delete api.defaults.headers.common['Authorization'];
        clearAuth();
        set({ user: null, token: null, isAuthenticated: false });
        // toast.success('Berhasil logout');
    },

    changePassword: async (payload) => {
        set({ loading: true });
        try {
            await authApi.changePassword(payload);
            set({ loading: false });
            toast.success('Password berhasil diubah');
        } catch (error: any) {
            set({ loading: false });
            const msg = error.response?.data?.message
                || error.response?.data?.errors?.[0]?.message
                || 'Gagal mengubah password';
            toast.error(msg);
            throw error;
        }
    },

    updateProfile: async (name) => {
        set({ loading: true });
        try {
            const res = await authApi.updateProfile({ name });
            const { user } = res.data.data;
            const { token } = get();

            if (token) {
                saveAuth(token, user);
            }

            set({ user, loading: false });
            toast.success('Profil berhasil diperbarui');
        } catch (error: any) {
            set({ loading: false });
            const msg = error.response?.data?.message
                || error.response?.data?.errors?.[0]?.message
                || 'Gagal memperbarui profil';
            toast.error(msg);
            throw error;
        }
    },
}));

// Axios interceptor: redirect to login on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && useAuthStore.getState().isAuthenticated) {
            // Token expired or invalid
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/register') {
                useAuthStore.getState().signOut();
                toast.error('Sesi telah berakhir, silakan login kembali');
            }
        }
        return Promise.reject(error);
    }
);
