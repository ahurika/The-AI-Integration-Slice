/**
 * lib/auth/session.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Session creation, reading, and invalidation.
 *
 * SESSION STRATEGY — DATABASE-BACKED SESSIONS
 * ────────────────────────────────────────────
 * Sessions are stored in the PostgreSQL `Session` table. The client receives
 * only an opaque session ID in an HttpOnly cookie. The actual user association
 * lives server-side in the database.
 *
 * WHY NOT JWT?
 * ────────────
 * JWTs are stateless — once issued, they cannot be revoked until expiry. This
 * means a signed-out session could still be used if a token was captured. With
 * database-backed sessions, logout immediately deletes the row, making the
 * session ID worthless.
 *
 * COOKIE CONFIGURATION
 * ─────────────────────
 * httpOnly: true   — Prevents JavaScript access (XSS mitigation)
 * secure: true     — Only sent over HTTPS (set false for local dev)
 * sameSite: 'lax'  — Prevents CSRF for top-level navigations; allows
 *                    same-site GET requests (e.g., redirects from email links)
 * path: '/'        — Available across the entire application
 * maxAge: 30 days  — Session duration; must match DB expiresAt
 *
 * WHERE THE SESSION IS CREATED
 * ─────────────────────────────
 * createSession() is called immediately after successful credential
 * verification in the sign-in route handler, and after email verification
 * is confirmed in the verify-email route handler.
 *
 * USAGE
 * ─────
 * import { createSession, getSession, deleteSession } from '@/lib/auth/session';
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db/prisma';

/** Session cookie name */
const SESSION_COOKIE = 'session_id';

/** Session lifetime in milliseconds (30 days) */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Generates a cryptographically secure, random session ID.
 * 32 bytes → 64 hex characters.
 */
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Creates a new authenticated session for the given user.
 * Stores the session in the database and sets the session cookie.
 *
 * @param userId - The ID of the authenticated user
 */
export async function createSession(userId: string): Promise<void> {
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // Persist session to database
  await prisma.session.create({
    data: { id, userId, expiresAt },
  });

  // Set the HttpOnly cookie on the response
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Reads the current session from the request cookie and validates it.
 * Returns null if no valid session exists (missing cookie, expired, or not found).
 *
 * @returns The session record with its associated user, or null
 */
export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, name: true, email: true, isEmailVerified: true } } },
  });

  // Return null if session not found or has expired
  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

/**
 * Invalidates the current session — removes it from the database and
 * clears the session cookie from the client.
 *
 * Must be called during logout to properly end the authenticated state.
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    // Delete from database — makes the session ID worthless even if cookie persists
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => null);
  }

  // Clear the cookie regardless
  cookieStore.delete(SESSION_COOKIE);
}
