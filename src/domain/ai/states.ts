/**
 * src/domain/ai/states.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Job state constants — mirrors the Prisma JobStatus enum.
 *
 * Use these constants throughout application code so that state strings are
 * never hard-coded as bare literals in handlers or workers (R3-021).
 *
 * Allowed transitions (R3-005):
 *   pending → processing → done
 *   pending → processing → failed
 *
 * A retry may re-enter processing from a recoverable failure state
 * when attempts remain under the configured limit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED: 'failed',
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

/**
 * Valid state transitions.
 * Used by application logic to reject illegal transitions before
 * writing to the database.
 */
export const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JOB_STATUS.PENDING]: [JOB_STATUS.PROCESSING],
  [JOB_STATUS.PROCESSING]: [JOB_STATUS.DONE, JOB_STATUS.FAILED, JOB_STATUS.PROCESSING],
  [JOB_STATUS.DONE]: [],
  [JOB_STATUS.FAILED]: [],
};
