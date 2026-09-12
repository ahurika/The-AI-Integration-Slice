'use client';

/**
 * components/ai/processing-state.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the current job status with truthful state communication.
 *
 * UI rules (R3-005, AGENTS.md §19):
 * - Show pending, processing, done, or failed honestly.
 * - Do not use a fake indefinite spinner.
 * - Do not display success until validated output has been persisted.
 * - Failed jobs show a designed failure state, not a blank screen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JobStatus } from '@/src/domain/ai/states';
import { JOB_STATUS } from '@/src/domain/ai/states';

interface ProcessingStateProps {
  jobId: string;
  status: JobStatus;
  attempts: number;
  errorMessage: string | null;
}

export default function ProcessingState({
  jobId,
  status,
  attempts,
  errorMessage,
}: ProcessingStateProps) {
  return (
    <section aria-label={`Job ${jobId} status`} aria-live="polite">
      <h2>Processing status</h2>

      {status === JOB_STATUS.PENDING && (
        <div role="status">
          <p>
            <strong>Pending</strong> — your job is queued and waiting for a processing slot.
          </p>
          <p>Attempts made: {attempts}</p>
        </div>
      )}

      {status === JOB_STATUS.PROCESSING && (
        <div role="status">
          <p>
            <strong>Processing</strong> — your notes are being analysed.
          </p>
          <p>Attempt {attempts} in progress.</p>
        </div>
      )}

      {status === JOB_STATUS.DONE && (
        <div role="status">
          <p>
            <strong>Done</strong> — your structured notes are ready.
          </p>
        </div>
      )}

      {status === JOB_STATUS.FAILED && (
        <div role="alert">
          <p>
            <strong>Failed</strong> — processing could not be completed.
          </p>
          <p>Attempts made: {attempts}</p>
          {/* Show a user-safe message — never expose internal stack traces */}
          {errorMessage && (
            <p>
              Reason:{' '}
              <span>
                {errorMessage.includes('ProviderNotImplementedError') ||
                errorMessage.includes('StorageNotImplementedError')
                  ? 'The processing service is not yet available (scaffold state).'
                  : errorMessage}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
