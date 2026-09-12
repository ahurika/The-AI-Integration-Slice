'use client';

/**
 * components/ai/upload-form.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Upload form component — client-side file selection and submission.
 *
 * Client validation is for immediate user feedback only. The server repeats
 * all validation and is authoritative (R3-003, AGENTS.md §6).
 *
 * SCAFFOLD: Submits to POST /api/ai/upload. The server returns a scaffold
 * 202 response until storage and jobs are implemented.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef } from 'react';

interface UploadFormProps {
  /** Called with accepted job IDs once the server confirms the upload. */
  onJobsAccepted?: (jobIds: string[]) => void;
}

export default function UploadForm({ onJobsAccepted }: UploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scaffoldMessage, setScaffoldMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setScaffoldMessage(null);
    const selected = Array.from(e.target.files ?? []);
    setFiles(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one file.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setScaffoldMessage(null);

    try {
      const body = new FormData();
      for (const file of files) {
        body.append('files', file);
      }

      const res = await fetch('/api/ai/upload', { method: 'POST', body });
      const data = await res.json() as Record<string, unknown>;

      if (res.status === 429) {
        setError(String(data.error ?? 'Rate limit exceeded. Please wait and try again.'));
        return;
      }

      if (!res.ok) {
        const details = Array.isArray(data.details) ? (data.details as string[]).join(' ') : '';
        setError(String(data.error ?? 'Upload failed.') + (details ? ` ${details}` : ''));
        return;
      }

      // Scaffold response — no real job IDs yet.
      if (data.scaffold) {
        setScaffoldMessage(String(data.message));
        return;
      }

      const jobs = (data.jobs as Array<{ jobId: string }>) ?? [];
      onJobsAccepted?.(jobs.map((j) => j.jobId));
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Upload handwritten notes">
      <div>
        {/* Accessible file input with explicit label (R3-016 UI rules) */}
        <label htmlFor="file-upload-input">
          Select handwritten note files
        </label>
        <input
          id="file-upload-input"
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          aria-describedby={error ? 'upload-error' : undefined}
          disabled={submitting}
        />
      </div>

      {files.length > 0 && (
        <ul aria-label="Selected files">
          {files.map((f) => (
            <li key={f.name}>
              {f.name} ({(f.size / 1024).toFixed(1)} KB)
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p id="upload-error" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {scaffoldMessage && (
        <p role="status" aria-live="polite" style={{ color: 'orange' }}>
          [SCAFFOLD] {scaffoldMessage}
        </p>
      )}

      <button
        id="upload-submit-btn"
        type="submit"
        disabled={submitting || files.length === 0}
        aria-busy={submitting}
      >
        {submitting ? 'Uploading…' : 'Upload notes'}
      </button>
    </form>
  );
}
