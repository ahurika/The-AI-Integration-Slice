import VerifyEmailForm from '@/components/auth/VerifyEmailForm';

export const metadata = {
  title: 'Verify Email | Auth',
  description: 'Verify your email address',
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Verify Email
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Check your email for a verification code
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <VerifyEmailForm email={email ?? ''} />
        </div>
      </div>
    </div>
  );
}
