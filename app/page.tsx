import Link from 'next/link';
import { requireGuest } from '@/lib/auth/guards';

export default async function HomePage() {
  const session = await requireGuest().catch(() => null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="flex flex-col items-center gap-8 px-4">
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          Authentication Slice
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-md text-center">
          A complete authentication system with sign up, sign in, email verification, and password recovery.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
