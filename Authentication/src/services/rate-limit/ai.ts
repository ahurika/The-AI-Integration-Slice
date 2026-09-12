/**
 * src/services/rate-limit/ai.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rate limiting for AI endpoints (R3-016, R3-017, ARCHITECTURE.md §16).
 *
 * Reuses the existing Prisma-backed RateLimit mechanism from Assessment 1
 * (lib/auth/rateLimit.ts) with namespaced keys for AI actions.
 *
 * Rate limits act as BOTH abuse protection AND AI cost control.
 * They are applied server-side, before any expensive provider work begins.
 *
 * Two independently limited actions:
 *   1. upload:userId   — POST /api/ai/upload (processing trigger)
 *   2. followup:userId — POST /api/ai/jobs/:jobId/follow-up
 *
 * OPEN QUESTION: Exact limit values (requests per window) are not yet confirmed.
 * See ARCHITECTURE.md §23 item 3. Values come from RATE_LIMIT_CONFIG (src/config/ai.ts).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { prisma } from '@/lib/db/prisma';
import { RATE_LIMIT_CONFIG } from '@/src/config/ai';

export interface RateLimitResult {
  allowed: boolean;
  /** Milliseconds until the window resets, if blocked. */
  retryAfterMs?: number;
}

/**
 * Checks and records a rate-limited event.
 * Uses the existing RateLimit table from Assessment 1.
 *
 * SCAFFOLD: config values are 0 until open questions are resolved.
 * When maxRequests is 0, the guard passes (fail-open during scaffold).
 * This will correctly enforce limits once RATE_LIMIT_CONFIG is populated.
 */
async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  // During scaffold: config values are 0 — allow all requests.
  if (maxRequests === 0 || windowMs === 0) {
    return { allowed: true };
  }

  const now = new Date();
  const windowExpiry = new Date(now.getTime() + windowMs);

  const record = await prisma.rateLimit.upsert({
    where: { key },
    update: {
      points: { increment: 1 },
    },
    create: {
      key,
      points: 1,
      expiresAt: windowExpiry,
    },
  });

  // If the window has expired, reset the counter.
  if (record.expiresAt < now) {
    await prisma.rateLimit.update({
      where: { key },
      data: { points: 1, expiresAt: windowExpiry },
    });
    return { allowed: true };
  }

  if (record.points > maxRequests) {
    return {
      allowed: false,
      retryAfterMs: record.expiresAt.getTime() - now.getTime(),
    };
  }

  return { allowed: true };
}

/**
 * Rate limit for POST /api/ai/upload.
 * Key: "ai:upload:{userId}" — scoped to authenticated user, not a spoofable header.
 */
export async function checkUploadRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `ai:upload:${userId}`,
    RATE_LIMIT_CONFIG.uploadMaxRequests,
    RATE_LIMIT_CONFIG.uploadWindowMs,
  );
}

/**
 * Rate limit for POST /api/ai/jobs/:jobId/follow-up.
 * Key: "ai:followup:{userId}" — scoped to authenticated user.
 */
export async function checkFollowUpRateLimit(userId: string): Promise<RateLimitResult> {
  return checkRateLimit(
    `ai:followup:${userId}`,
    RATE_LIMIT_CONFIG.followUpMaxRequests,
    RATE_LIMIT_CONFIG.followUpWindowMs,
  );
}
