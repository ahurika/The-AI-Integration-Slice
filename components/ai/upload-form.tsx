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
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setScaffoldMessage(null);
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) setFiles(selected);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragActive(false);
    setError(null);
    setScaffoldMessage(null);
    const selected = Array.from(e.dataTransfer.files ?? []);
    if (selected.length > 0) {
      setFiles(selected);
    }
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

      const jobs = (data.acceptedJobs as Array<{ jobId: string }>) ?? [];
      onJobsAccepted?.(jobs.map((j) => j.jobId));
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Upload handwritten notes">
      <div 
        className={`ai-dropzone ${isDragActive ? 'drag-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="ai-dropzone-icon">📝</span>
        <div className="ai-dropzone-text">
          {isDragActive ? 'Drop your files here...' : 'Click or drag files here'}
        </div>
        <div className="ai-dropzone-hint">Supports JPEG, PNG, WEBP, and PDF</div>
        <input
          id="file-upload-input"
          ref={inputRef}
          className="ai-file-input"
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          aria-describedby={error ? 'upload-error' : undefined}
          disabled={submitting}
        />
      </div>

      {files.length > 0 && (
        <ul className="ai-file-list" aria-label="Selected files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="ai-file-item" style={{ animationDelay: `${i * 0.1}s` }}>
              <span className="ai-file-name" title={f.name}>{f.name}</span>
              <span className="ai-file-size">{(f.size / 1024).toFixed(1)} KB</span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div id="upload-error" className="ai-error" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {scaffoldMessage && (
        <div className="ai-scaffold-msg" role="status" aria-live="polite">
          <strong>Note:</strong> {scaffoldMessage}
        </div>
      )}

      <button
        id="upload-submit-btn"
        className="ai-submit-btn"
        type="submit"
        disabled={submitting || files.length === 0}
        aria-busy={submitting}
      >
        {submitting ? (
          <>
            <span className="ai-loading-spinner"></span>
            Processing your notes...
          </>
        ) : (
          'Extract Text with AI'
        )}
      </button>
    </form>
  );
}
