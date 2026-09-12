/**
 * lib/validation/auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared Zod validation schemas for all authentication flows.
 *
 * SINGLE SOURCE OF TRUTH
 * ──────────────────────
 * Validation rules are defined ONCE here and used in two places:
 *   1. Server-side: API route handlers validate incoming request bodies
 *   2. Client-side: React Hook Form uses the same schema for immediate feedback
 *
 * This ensures the client can never show rules that differ from what the
 * server enforces (e.g., a different minimum password length on client vs server).
 *
 * WHICH RULES CAN'T BE ENFORCED CLIENT-SIDE?
 * ────────────────────────────────────────────
 * The following can only be verified server-side:
 *   - Email uniqueness (requires a DB query)
 *   - Password correctness during sign-in (requires the stored hash)
 *   - Token validity (requires DB lookup)
 *   - Rate limits (requires server-side state)
 *
 * Client-side validation catches format errors early (empty fields, invalid
 * email format, weak passwords) but the server is always authoritative.
 *
 * USAGE
 * ─────
 * import { signUpSchema, type SignUpInput } from '@/lib/validation/auth';
 * const result = signUpSchema.safeParse(body);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from 'zod';

// ── Sign Up ────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters'),

  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254, 'Email address is too long'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be under 64 characters'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// ── Sign In ────────────────────────────────────────────────────────────────

export const signInSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

export type SignInInput = z.infer<typeof signInSchema>;

// ── Email Verification ─────────────────────────────────────────────────────

export const verifyEmailSchema = z.object({
  code: z
    .string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only digits'),

  email: z
    .string()
    .email(),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ── Forgot Password ────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ── Reset Password ─────────────────────────────────────────────────────────

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password must be under 64 characters'),

  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
