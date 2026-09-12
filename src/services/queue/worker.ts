/**
 * src/services/queue/worker.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Background worker for AI job processing (R3-004, R3-013, R3-014, R3-015).
 *
 * OPEN QUESTIONS:
 *   - Queue implementation strategy: library (BullMQ/Redis, pg-boss) or
 *     bounded in-process executor? (ARCHITECTURE.md §23 item 3)
 *   - Concurrency cap value (ARCHITECTURE.md §23 item 4)
 *
 * Worker responsibilities (AGENTS.md §8, ARCHITECTURE.md §8):
 *   1. Claim a pending job atomically.
 *   2. Update status to processing, increment attempts.
 *   3. Load the stored file from storage.
 *   4. Call Role 1 with timeout.
 *   5. Validate output against application schema.
 *   6. Retry recoverable failures within configured limit.
 *   7. Persist failure when attempts exhausted.
 *   8. Persist validated success.
 *   9. Mark job done only after successful validation and persistence.
 *
 * SCAFFOLD: processJob() is fully defined but will throw StorageNotImplementedError
 * and ProviderNotImplementedError from their respective services until providers
 * are resolved. The processing logic structure is correct.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  claimNextPendingJob,
  markJobDone,
  markJobFailed,
  markJobProcessing,
  createAiResult,
  countActiveJobs,
} from '@/src/db/repositories/job.repository';
import { getFile } from '@/src/services/storage/storage';
import { runNoteStructurer } from '@/src/services/ai/roles/note-structurer';
import { StructuredNotesSchema, STRUCTURED_NOTES_SCHEMA_VERSION } from '@/src/domain/ai/schemas';
import { ProviderTransientError } from '@/src/services/ai/provider';
import { WORKER_CONFIG, RETRY_CONFIG } from '@/src/config/ai';
import { findFileAssetByIdForUser } from '@/src/db/repositories/file-asset.repository';

/**
 * Processes a single job through the full AI pipeline.
 *
 * Called by the worker executor once a job is claimed.
 * Not exposed as an HTTP endpoint.
 */
async function processJob(jobId: string, fileAssetId: string, userId: string): Promise<void> {
  // Load file bytes from storage using the stored key.
  // Throws StorageNotImplementedError in scaffold state.
  const fileAsset = await findFileAssetByIdForUser(fileAssetId, userId);
  if (!fileAsset) {
    await markJobFailed(jobId, 'FileAsset not found for this job.');
    return;
  }

  const fileBytes = await getFile(fileAsset.storageKey);

  // Call Role 1 — throws ProviderNotImplementedError in scaffold state.
  const role1Output = await runNoteStructurer({ fileContent: fileBytes });

  // Application-side schema validation — separate from provider-level request.
  const parseResult = StructuredNotesSchema.safeParse(role1Output.parsed);

  if (!parseResult.success) {
    // Validation failure — treated as a potentially retryable failure.
    throw new ProviderTransientError(
      `Role 1 output failed application schema validation: ${parseResult.error.message}`,
    );
  }

  // Persist the validated result and mark done.
  await createAiResult({
    jobId,
    schemaVersion: STRUCTURED_NOTES_SCHEMA_VERSION,
    rawOutput: role1Output.rawOutput,
    parsedResult: parseResult.data,
  });

  await markJobDone(jobId);
}

/**
 * Attempts to process a job with retry logic.
 *
 * Retry policy (ARCHITECTURE.md §14):
 *   - Only ProviderTransientError is retried.
 *   - Retries are bounded by RETRY_CONFIG.maxAttempts.
 *   - Each attempt increments Job.attempts.
 *   - Exhausted attempts → job marked failed with error message.
 *
 * TODO: Add backoff delay once RETRY_CONFIG.backoffBaseMs is confirmed.
 */
async function processJobWithRetry(
  jobId: string,
  fileAssetId: string,
  userId: string,
): Promise<void> {
  const maxAttempts = RETRY_CONFIG.maxAttempts || 1; // Default 1 during scaffold.

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await markJobProcessing(jobId);

    try {
      await processJob(jobId, fileAssetId, userId);
      return; // Success — done.
    } catch (err) {
      const isRetryable = err instanceof ProviderTransientError;
      const attemptsRemaining = maxAttempts - attempt;

      if (!isRetryable || attemptsRemaining === 0) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        await markJobFailed(jobId, `Processing failed after ${attempt} attempt(s): ${message}`);
        return;
      }

      // Retryable failure — wait backoff before next attempt.
      if (RETRY_CONFIG.backoffBaseMs > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_CONFIG.backoffBaseMs * attempt),
        );
      }
    }
  }
}

/**
 * Runs the bounded worker loop.
 *
 * Enforces WORKER_CONFIG.concurrency — the maximum number of simultaneous
 * provider calls. Jobs beyond the active limit remain pending until a slot
 * becomes available (R3-015, ARCHITECTURE.md §9).
 *
 * SCAFFOLD: In-process bounded executor. When queue library is chosen,
 * this function will be replaced with queue-library-specific worker startup.
 *
 * TODO: Implement once queue strategy is confirmed (open question).
 */
export async function runWorker(): Promise<void> {
  const concurrency = WORKER_CONFIG.concurrency || 1; // Default 1 during scaffold.
  const activeJobs = await countActiveJobs();

  if (activeJobs >= concurrency) {
    // Concurrency cap reached — no new slots available.
    return;
  }

  const job = await claimNextPendingJob();
  if (!job) return;

  // Process without awaiting — caller is responsible for bounded execution.
  processJobWithRetry(job.id, job.fileAssetId, job.userId).catch((err) => {
    console.error(`Worker error for job ${job.id}:`, err instanceof Error ? err.message : err);
  });
}
