'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface VerifyEmailFormProps {
  email: string;
}

export default function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendError, setResendError] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details);
        } else {
          setServerError(data.error || 'An error occurred. Please try again.');
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setServerError('A network error occurred. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setResendError('');
    setResendSuccess('');
    setIsResending(true);

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResendError(data.error || 'Failed to resend code.');
        return;
      }

      setResendSuccess(data.message || 'A new code has been sent.');
      setTimeLeft(15 * 60); // Reset timer on success
    } catch {
      setResendError('A network error occurred.');
    } finally {
      setIsResending(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-green-600 dark:text-green-400">
          Email verified successfully! Redirecting to sign in...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter the 6-digit code sent to <strong>{email}</strong>.
      </p>
      <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
        Code expires in {formatTime(timeLeft)}
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {serverError && (
          <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {serverError}
          </div>
        )}

        <Input
          label="Verification Code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          error={errors.code?.[0]}
          disabled={isLoading}
        />

        <Button type="submit" isLoading={isLoading} className="w-full">
          Verify Email
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2">
        {resendSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">
            {resendSuccess}
          </p>
        )}
        {resendError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {resendError}
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          isLoading={isResending}
          onClick={handleResend}
          disabled={isResending}
        >
          Resend Code
        </Button>
      </div>
    </div>
  );
}
