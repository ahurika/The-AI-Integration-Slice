import { requireGuest } from '@/lib/auth/guards';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export const metadata = {
  title: 'Sign In | Auth',
  description: 'Sign in to your account',
};

export default async function LoginPage() {
  await requireGuest();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Sign In
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your credentials to access your account
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <LoginForm />
        </div>

        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          <Link
            href="/forgot-password"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Forgot your password?
          </Link>
          <p className="text-zinc-600 dark:text-zinc-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
