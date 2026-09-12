/**
 * lib/auth/tokens.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Token generation and validation for:
 *   1. Email verification codes (6-digit numeric)
 *   2. Password reset tokens (secure random URL-safe strings)
 *
 * TOKEN SECURITY MODEL
 * ─────────────────────
 * Verification codes: Short-lived (15 min), 6-digit codes that are stored
 * as plaintext in the DB (they're low-entropy but short-lived and single-use).
 *
 * Password reset tokens: High-entropy (32-byte) random values. The raw token
 * is sent to the user via email. Only the SHA-256 hash is stored in the
 * database. This means even if the DB is compromised, the actual token cannot
 * be recovered — similar to how password hashes work.
 *
 * EXPIRY ENFORCEMENT
 * ─────────────────────
 * All expiry is enforced server-side via database timestamps. The client
 * receives no indication of when a token expires. A UI countdown is optional
 * UX sugar only — the server always re-checks the DB expiresAt field.
 *
 * SINGLE-USE ENFORCEMENT
 * ──────────────────────
 * Reset tokens have a `consumed` boolean. Once used, the token is marked
 * consumed and can never be used again, even before it expires.
 *
 * RESEND COOLDOWN
 * ───────────────
 * Before creating a new verification code, the server checks whether the
 * most recent code for the user was created within the cooldown window.
 * This is enforced server-side, not by a client timer.
 *
 * USAGE
 * ─────
 * import { generateVerificationCode, ... } from '@/lib/auth/tokens';
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';

/** Verification code expiry: 15 minutes */
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;

/** Password reset token expiry: 1 hour */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Resend cooldown: 60 seconds */
const RESEND_COOLDOWN_MS = 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL VERIFICATION CODES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a cryptographically random 6-digit verification code.
 * Uses randomBytes to avoid modulo bias from Math.random().
 */
function generateCode(): string {
  const buf = randomBytes(4);
  const num = buf.readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

/**
 * Creates a new email verification code for the given user.
 * Deletes any existing codes for the user before creating the new one
 * (prevents stale codes from remaining valid).
 *
 * SERVER-SIDE RESEND COOLDOWN: Checks if a code was generated within the
 * last 60 seconds and rejects the request if so.
 *
 * @param userId - The user to generate a code for
 * @returns The raw 6-digit code (to be sent via email/console)
 * @throws Error if the resend cooldown has not elapsed
 */
export async function createVerificationCode(userId: string): Promise<string> {
  // Check cooldown — find the most recent code for this user
  const recent = await prisma.verificationCode.findFirst({
    where: { userId },
    orderBy: { expiresAt: 'desc' },
  });

  if (recent) {
    const createdAt = new Date(recent.expiresAt.getTime() - VERIFICATION_CODE_TTL_MS);
    const elapsed = Date.now() - createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new code.`);
    }
  }

  // Remove old codes for this user
  await prisma.verificationCode.deleteMany({ where: { userId } });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

  await prisma.verificationCode.create({
    data: { code, userId, expiresAt },
  });

  return code;
}

/**
 * Validates a verification code for the given user.
 * Returns the userId if valid, throws if invalid or expired.
 *
 * @param userId - The user the code belongs to
 * @param code - The 6-digit code submitted by the user
 */
export async function validateVerificationCode(userId: string, code: string): Promise<void> {
  const record = await prisma.verificationCode.findFirst({
    where: { userId, code },
  });

  if (!record) {
    throw new Error('Invalid verification code.');
  }

  if (record.expiresAt < new Date()) {
    throw new Error('Verification code has expired. Please request a new one.');
  }

  // Delete the used code (single-use)
  await prisma.verificationCode.delete({ where: { id: record.id } });
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD RESET TOKENS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hashes a raw token with SHA-256 for safe database storage.
 * The raw token is sent to the user; only the hash is stored.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new password reset token for the given user.
 * Deletes any existing tokens for the user first.
 *
 * @param userId - The user requesting a password reset
 * @returns The raw token string (to be embedded in the reset URL/email)
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  // Remove existing tokens for this user
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { tokenHash, userId, expiresAt, consumed: false },
  });

  return rawToken;
}

/**
 * Validates a raw password reset token.
 * Returns the userId if valid (not expired, not consumed).
 * Throws if the token is invalid, expired, or already used.
 *
 * @param rawToken - The raw token from the reset URL
 * @returns The userId associated with the valid token
 */
export async function validatePasswordResetToken(rawToken: string): Promise<string> {
  const tokenHash = hashToken(rawToken);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    throw new Error('Invalid or unknown reset token.');
  }

  if (record.consumed) {
    throw new Error('This reset link has already been used.');
  }

  if (record.expiresAt < new Date()) {
    throw new Error('This reset link has expired. Please request a new one.');
  }

  return record.userId;
}

/**
 * Marks a password reset token as consumed (single-use enforcement).
 * Should be called immediately after the password has been updated.
 *
 * @param rawToken - The raw token to invalidate
 */
export async function consumePasswordResetToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.passwordResetToken.update({
    where: { tokenHash },
    data: { consumed: true },
  });
}
