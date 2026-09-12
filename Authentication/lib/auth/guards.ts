/**
 * lib/auth/guards.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side route protection utilities.
 *
 * ARCHITECTURE NOTE
 * ─────────────────
 * Route protection MUST happen on the server, not only through client-side
 * navigation guards. A user bypassing React routing (e.g., direct URL entry
 * or a curl request) must still be redirected to sign-in.
 *
 * These guard functions are called at the top of Server Component page files
 * or in middleware. They call `redirect()` from Next.js, which throws a
 * special error that Next.js catches and converts into a 307 redirect response.
 *
 * USAGE
 * ─────
 * // In a protected page (Server Component):
 * import { requireAuth } from '@/lib/auth/guards';
 *
 * export default async function DashboardPage() {
 *   const session = await requireAuth();
 *   return <Dashboard user={session.user} />;
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

/**
 * Requires an authenticated session.
 * Redirects to /login if no valid session is found.
 *
 * Use this in any page that requires the user to be signed in.
 *
 * @returns The current session (including user data)
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

/**
 * Requires the user to be a guest (not authenticated).
 * Redirects to /dashboard if a valid session already exists.
 *
 * Use this on login/signup pages to prevent authenticated users
 * from accessing them unnecessarily.
 */
export async function requireGuest(): Promise<void> {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  }
}
