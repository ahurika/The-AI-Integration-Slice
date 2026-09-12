import { type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
  description?: string;
}

export default function FormField({
  label,
  htmlFor,
  error,
  children,
  description,
}: FormFieldProps) {
  const fieldId = htmlFor || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>
      {children}
      {description && !error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {error && (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
