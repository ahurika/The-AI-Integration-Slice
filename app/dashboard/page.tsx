import { requireAuth } from '@/lib/auth/guards';
import SignOutButton from '@/components/auth/SignOutButton';

export const metadata = {
  title: 'Dashboard | Auth',
  description: 'Your account dashboard',
};

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <div className="flex flex-col items-center gap-6 px-4">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Dashboard
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          You are signed in as <strong>{session.user.name}</strong>.
        </p>
        <SignOutButton />
      </div>
    </main>
  );
}
