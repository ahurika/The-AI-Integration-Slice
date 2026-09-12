'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time password requirement checks with length requirement displayed as the FINAL item
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumberOrSpecial = /[\d\W]/.test(password);
  const isLengthValid = password.length >= 8 && password.length <= 64;

  const validateClient = () => {
    const newErrors: Record<string, string> = {};
    if (!isLengthValid) {
      newErrors.password = 'Password must be between 8 and 64 characters';
    }
    if (confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    return newErrors;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
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

  if (success) {
    return (
      <div className="text-center">
        <p className="text-green-600 dark:text-green-400">
          Password has been reset successfully. Redirecting to sign in...
        </p>
      </div>
    );
  }

  if (!token) {
    return (
      <div role="alert" className="text-center text-red-600 dark:text-red-400">
        Invalid reset link. Please request a new one.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Input
          label="New Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={64}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
          }}
          error={errors.password}
          disabled={isLoading}
        />

        {/* Real-time feedback checklist - length requirement displayed as the FINAL item */}
        <div className="mt-1 flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          <p className="font-medium text-zinc-700 dark:text-zinc-300">Password requirements:</p>
          <ul className="space-y-0.5 pl-1">
            <li className={`flex items-center gap-1.5 ${hasUppercase ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}>
              <span>{hasUppercase ? '✓' : '•'}</span>
              <span>Contains uppercase letter</span>
            </li>
            <li className={`flex items-center gap-1.5 ${hasLowercase ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}>
              <span>{hasLowercase ? '✓' : '•'}</span>
              <span>Contains lowercase letter</span>
            </li>
            <li className={`flex items-center gap-1.5 ${hasNumberOrSpecial ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}>
              <span>{hasNumberOrSpecial ? '✓' : '•'}</span>
              <span>Contains number or special character</span>
            </li>
            {/* Final requirement displayed: Length (8 - 64 characters) */}
            <li className={`flex items-center gap-1.5 ${isLengthValid ? 'text-green-600 dark:text-green-400 font-medium' : ''}`}>
              <span>{isLengthValid ? '✓' : '•'}</span>
              <span>Between 8 and 64 characters long</span>
            </li>
          </ul>
        </div>
      </div>

      <Input
        label="Confirm Password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        }}
        error={errors.confirmPassword}
        disabled={isLoading}
      />

      <Button type="submit" isLoading={isLoading} className="w-full">
        Reset Password
      </Button>
    </form>
  );
}
