import { api } from './index';

export interface AdminUserRouter {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    isActive: boolean;
    lastSync?: string | null;
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    routers: AdminUserRouter[];
    createdAt: string;
}

export const adminApi = {
    getUsers: () =>
        api.get<{ success: boolean; data: AdminUser[] }>('/admin/users'),

    updateUser: (id: string, data: Partial<Omit<AdminUser, 'routers' | 'createdAt' | 'id'>>) =>
        api.patch<{ success: boolean; data: AdminUser }>(`/admin/users/${id}`, data),

    deleteUser: (id: string) =>
        api.delete<{ success: boolean; message: string }>(`/admin/users/${id}`),
};
