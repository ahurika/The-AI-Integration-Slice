'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from '@/components/ui/Button';

export default function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/login');
      }
    } catch {
      // Sign out failed silently - user can retry
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="secondary"
      isLoading={isLoading}
      onClick={handleSignOut}
    >
      Sign Out
    </Button>
  );
}
