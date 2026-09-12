'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  showVisibilityToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, type = 'text', showVisibilityToggle, className = '', ...props }, ref) => {
    const inputId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordType = type === 'password';
    const currentType = isPasswordType && showPassword ? 'text' : type;
    const enableToggle = showVisibilityToggle ?? isPasswordType;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex justify-between items-center"
        >
          <span>{label}</span>
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={currentType}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors
              placeholder:text-zinc-400
              focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400
              disabled:cursor-not-allowed disabled:opacity-50
              ${enableToggle ? 'pr-12' : ''}
              ${error
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                : 'border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100'
              }
              ${className}`}
            {...props}
          />
          {enableToggle && isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 select-none px-1 py-0.5"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
