/**
 * Auth Validation Schemas - Zod schemas for request validation.
 *
 * Follows Single Responsibility Principle (SRP):
 * - This file is solely responsible for validation schema definitions
 * - Each schema validates one specific payload type
 *
 * Uses Zod v4 API
 */

import { z } from 'zod';

// ============================================================
// Sign-In Schema
// ============================================================

export const signInSchema = z.object({
    email: z
        .string({ error: 'Email wajib diisi dan harus berupa string' })
        .email('Format email tidak valid')
        .min(1, 'Email tidak boleh kosong')
        .max(255, 'Email terlalu panjang')
        .trim()
        .toLowerCase(),

    password: z
        .string({ error: 'Password wajib diisi dan harus berupa string' })
        .min(6, 'Password minimal 6 karakter')
        .max(128, 'Password terlalu panjang'),
});

// ============================================================
// Sign-Up Schema
// ============================================================

export const signUpSchema = z.object({
    name: z
        .string({ error: 'Nama wajib diisi dan harus berupa string' })
        .min(2, 'Nama minimal 2 karakter')
        .max(100, 'Nama terlalu panjang')
        .trim(),

    email: z
        .string({ error: 'Email wajib diisi dan harus berupa string' })
        .email('Format email tidak valid')
        .min(1, 'Email tidak boleh kosong')
        .max(255, 'Email terlalu panjang')
        .trim()
        .toLowerCase(),

    password: z
        .string({ error: 'Password wajib diisi dan harus berupa string' })
        .min(6, 'Password minimal 6 karakter')
        .max(128, 'Password terlalu panjang'),
});

// ============================================================
// Refresh Token Schema
// ============================================================

export const refreshTokenSchema = z.object({
    refreshToken: z
        .string({ error: 'Refresh token wajib diisi dan harus berupa string' })
        .min(1, 'Refresh token tidak boleh kosong'),
});

// ============================================================
// Change Password Schema
// ============================================================

export const changePasswordSchema = z
    .object({
        currentPassword: z
            .string({ error: 'Password saat ini wajib diisi' })
            .min(1, 'Password saat ini tidak boleh kosong'),

        newPassword: z
            .string({ error: 'Password baru wajib diisi' })
            .min(6, 'Password baru minimal 6 karakter')
            .max(128, 'Password baru terlalu panjang'),

        confirmPassword: z
            .string({ error: 'Konfirmasi password wajib diisi' })
            .min(1, 'Konfirmasi password tidak boleh kosong'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Konfirmasi password tidak cocok dengan password baru',
        path: ['confirmPassword'],
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        message: 'Password baru tidak boleh sama dengan password saat ini',
        path: ['newPassword'],
    });

// ============================================================
// Update Profile Schema
// ============================================================

export const updateProfileSchema = z.object({
    name: z
        .string({ error: 'Nama wajib diisi dan harus berupa string' })
        .min(2, 'Nama minimal 2 karakter')
        .max(100, 'Nama terlalu panjang')
        .trim(),
});

// ============================================================
// Inferred Types from Zod Schemas
// ============================================================

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
