/**
 * src/db/repositories/job.repository.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Database access for Job, AiResult, and FollowUpResult records.
 *
 * SCAFFOLD — method signatures are complete; bodies are implemented for
 * the queries that are fully provider-independent.
 *
 * Rules:
 * - Every job lookup must be scoped to userId (R3-005, ARCHITECTURE.md §3).
 * - Job claiming must be safe against duplicate workers (R3-015).
 * - Status transitions are validated at the application layer before writes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { prisma } from '@/lib/db/prisma';
import { JOB_STATUS } from '@/src/domain/ai/states';
import type { JobRecord, JobWithResult, AiResultRecord, FollowUpResultRecord } from '@/src/domain/ai/types';
import type { StructuredNotes, ExpandedNotes } from '@/src/domain/ai/schemas';

// ─── Job creation ─────────────────────────────────────────────────────────────

export async function createJob(
  userId: string,
  fileAssetId: string,
): Promise<JobRecord> {
  return prisma.job.create({
    data: {
      userId,
      fileAssetId,
      status: JOB_STATUS.PENDING,
      attempts: 0,
    },
  }) as Promise<JobRecord>;
}

// ─── Job queries ──────────────────────────────────────────────────────────────

/**
 * Finds a job by id, scoped to the authenticated user.
 * Returns null if not found or not owned — prevents information leakage (R3-005).
 */
export async function findJobForUser(
  jobId: string,
  userId: string,
): Promise<JobWithResult | null> {
  return prisma.job.findFirst({
    where: { id: jobId, userId },
    include: {
      aiResult: true,
      followUpResult: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  }) as Promise<JobWithResult | null>;
}

/**
 * Claims one pending job atomically by transitioning it to `processing`.
 * Returns null if no pending job is available.
 *
 * SCAFFOLD: The atomic claim strategy depends on the chosen queue mechanism.
 * When the queue/worker implementation is resolved, this may be replaced with
 * a queue-library-specific claim. For a basic in-process bounded executor,
 * a transaction + SELECT FOR UPDATE is the safe approach.
 *
 * TODO: Implement atomic claim once queue strategy is confirmed (open question).
 */
export async function claimNextPendingJob(): Promise<JobRecord | null> {
  // Scaffold stub — not safe for concurrent workers yet.
  // Full implementation requires an atomic DB operation or queue-level claim.
  const job = await prisma.job.findFirst({
    where: { status: JOB_STATUS.PENDING },
    orderBy: { createdAt: 'asc' },
  });

  if (!job) return null;

  return prisma.job.update({
    where: { id: job.id },
    data: {
      status: JOB_STATUS.PROCESSING,
      attempts: { increment: 1 },
    },
  }) as Promise<JobRecord>;
}

// ─── Job status updates ───────────────────────────────────────────────────────

export async function markJobProcessing(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: JOB_STATUS.PROCESSING,
      attempts: { increment: 1 },
      updatedAt: new Date(),
    },
  });
}

export async function markJobDone(jobId: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: { status: JOB_STATUS.DONE, updatedAt: new Date() },
  });
}

export async function markJobFailed(jobId: string, errorMessage: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: JOB_STATUS.FAILED,
      errorMessage,
      updatedAt: new Date(),
    },
  });
}

// ─── AiResult persistence ─────────────────────────────────────────────────────

export interface CreateAiResultInput {
  jobId: string;
  schemaVersion: string;
  rawOutput: string | null;
  parsedResult: StructuredNotes;
}

export async function createAiResult(
  input: CreateAiResultInput,
): Promise<AiResultRecord> {
  const record = await prisma.aiResult.create({
    data: {
      jobId: input.jobId,
      schemaVersion: input.schemaVersion,
      rawOutput: input.rawOutput,
      parsedResult: input.parsedResult as object,
    },
  });
  // Prisma returns JsonValue for Json fields; cast through unknown to domain type.
  return { ...record, parsedResult: record.parsedResult as unknown as AiResultRecord['parsedResult'] } as AiResultRecord;
}

// ─── FollowUpResult persistence ───────────────────────────────────────────────

export interface CreateFollowUpResultInput {
  jobId: string;
  schemaVersion: string;
  result: ExpandedNotes;
}

export async function createFollowUpResult(
  input: CreateFollowUpResultInput,
): Promise<FollowUpResultRecord> {
  const record = await prisma.followUpResult.create({
    data: {
      jobId: input.jobId,
      action: 'expand',
      schemaVersion: input.schemaVersion,
      result: input.result as object,
    },
  });
  // Prisma returns JsonValue for Json fields; cast through unknown to domain type.
  return { ...record, result: record.result as unknown as FollowUpResultRecord['result'] } as FollowUpResultRecord;
}

/**
 * Counts how many jobs are currently in `processing` state.
 * Used by the bounded worker to enforce the concurrency cap (R3-015).
 */
export async function countActiveJobs(): Promise<number> {
  return prisma.job.count({
    where: { status: JOB_STATUS.PROCESSING },
  });
}
