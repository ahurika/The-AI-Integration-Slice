import { requireGuest } from '@/lib/auth/guards';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import Link from 'next/link';

export const metadata = {
  title: 'Forgot Password | Auth',
  description: 'Request a password reset link',
};

export default async function ForgotPasswordPage() {
  await requireGuest();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <ForgotPasswordForm />
        </div>

        <div className="mt-4 text-center text-sm">
          <Link
            href="/login"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
