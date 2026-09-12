/**
 * lib/auth/rateLimit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side rate limiting using the PostgreSQL RateLimit table.
 *
 * RATE LIMITING STRATEGY
 * ──────────────────────
 * Rate limits are stored in the database (not in-memory) so they survive
 * server restarts and work correctly in multi-instance deployments.
 *
 * Each rate-limited endpoint has a unique "key" composed of the endpoint
 * name and the client's IP address:
 *   e.g. "signup:192.168.1.1"
 *
 * The "points" column tracks how many requests have been made in the window.
 * The "expiresAt" column defines when the window resets.
 *
 * RATE LIMITS (PRD FR-08)
 * ────────────────────────
 * signin:     5 attempts per 15 minutes
 * signup:     3 attempts per hour
 * reset:      3 attempts per hour
 * resend:     3 attempts per hour
 *
 * RESPONSE
 * ────────
 * On limit breach:  HTTP 429 Too Many Requests
 * Retry-After header indicates when the window resets (seconds).
 *
 * USAGE
 * ─────
 * import { checkRateLimit } from '@/lib/auth/rateLimit';
 * await checkRateLimit('signin', ip); // throws on limit exceeded
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { prisma } from '@/lib/db/prisma';
import { headers } from 'next/headers';

type RateLimitConfig = {
  maxPoints: number;  // Maximum requests allowed in the window
  windowMs: number;   // Window duration in milliseconds
};

/** Rate limit configurations per endpoint */
const LIMITS: Record<string, RateLimitConfig> = {
  signin:  { maxPoints: 5,  windowMs: 15 * 60 * 1000 },  // 5 per 15 min
  signup:  { maxPoints: 3,  windowMs: 60 * 60 * 1000 },  // 3 per hour
  reset:   { maxPoints: 3,  windowMs: 60 * 60 * 1000 },  // 3 per hour
  resend:  { maxPoints: 3,  windowMs: 60 * 60 * 1000 },  // 3 per hour
};

/**
 * Error thrown when a rate limit is exceeded.
 * Includes `retryAfterSeconds` for the Retry-After header.
 */
export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Too many requests. Please try again in ${retryAfterSeconds} seconds.`);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Retrieves the client IP address from the request headers.
 * Falls back to 'unknown' if not available.
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Checks and increments the rate limit for a given endpoint and IP.
 * Throws a RateLimitError if the limit has been exceeded.
 *
 * @param endpoint - One of: 'signin' | 'signup' | 'reset' | 'resend'
 * @param ip - The client IP address
 */
export async function checkRateLimit(endpoint: string, ip: string): Promise<void> {
  const config = LIMITS[endpoint];
  if (!config) throw new Error(`Unknown rate-limit endpoint: ${endpoint}`);

  const key = `${endpoint}:${ip}`;
  const now = new Date();

  // Fetch or create the rate limit record
  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  if (!existing || existing.expiresAt < now) {
    // Window expired or first request — start a fresh window
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, points: 1, expiresAt: new Date(now.getTime() + config.windowMs) },
      update: { points: 1, expiresAt: new Date(now.getTime() + config.windowMs) },
    });
    return; // First request in window — allow
  }

  if (existing.points >= config.maxPoints) {
    // Limit exceeded — calculate retry-after
    const retryAfterMs = existing.expiresAt.getTime() - now.getTime();
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    throw new RateLimitError(retryAfterSeconds);
  }

  // Increment the counter
  await prisma.rateLimit.update({
    where: { key },
    data: { points: { increment: 1 } },
  });
}
