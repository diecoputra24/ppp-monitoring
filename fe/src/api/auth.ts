import { api } from './index';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    role: string | null;
    createdAt: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    data: {
        user: AuthUser;
        tokens: AuthTokens;
        csrfToken: string;
    };
}

export interface SignInPayload {
    email: string;
    password: string;
}

export interface SignUpPayload {
    name: string;
    email: string;
    password: string;
}

export interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface UpdateProfilePayload {
    name: string;
}

export const authApi = {
    signIn: (data: SignInPayload) =>
        api.post<AuthResponse>('/auth/sign-in', data),

    signUp: (data: SignUpPayload) =>
        api.post<AuthResponse>('/auth/sign-up', data),

    signOut: () =>
        api.post('/auth/sign-out'),

    getMe: () =>
        api.get<{ success: boolean; data: { user: AuthUser } }>('/auth/me'),

    changePassword: (data: ChangePasswordPayload) =>
        api.post<{ success: boolean; message: string }>('/auth/change-password', data),

    updateProfile: (data: UpdateProfilePayload) =>
        api.post<{ success: boolean; message: string; data: { user: AuthUser } }>('/auth/update-profile', data),
};
