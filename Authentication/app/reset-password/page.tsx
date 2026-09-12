import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Reset Password | Auth',
  description: 'Set a new password',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your new password below
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <ResetPasswordForm token={token ?? ''} />
        </div>
      </div>
    </div>
  );
}
