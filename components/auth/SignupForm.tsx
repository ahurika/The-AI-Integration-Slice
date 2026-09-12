'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Real-time password checks - length requirement is reshuffled to be the FINAL requirement displayed
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumberOrSpecial = /[\d\W]/.test(password);
  const isLengthValid = password.length >= 8 && password.length <= 64;

  const validateClient = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.length < 2) {
      newErrors.name = 'Full name must be at least 2 characters';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!isLengthValid) {
      newErrors.password = 'Password must be between 8 and 64 characters';
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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
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
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
          Account created! Redirecting to email verification...
        </p>
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

      <Input
        label="Full Name"
        name="name"
        type="text"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
        }}
        error={errors.name}
        disabled={isLoading}
      />

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
        }}
        error={errors.email}
        disabled={isLoading}
      />

      <div className="flex flex-col gap-1.5">
        <Input
          label="Password"
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

      <Button type="submit" isLoading={isLoading} className="w-full">
        Create Account
      </Button>
    </form>
  );
}
