/**
 * src/domain/ai/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared TypeScript types for the AI integration slice.
 *
 * These types are derived from the Prisma schema and domain schemas. They are
 * used across repositories, services, and API route handlers without importing
 * Prisma types directly into the UI layer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JobStatus } from '@/src/domain/ai/states';
import type { StructuredNotes, ExpandedNotes } from '@/src/domain/ai/schemas';

// ─── FileAsset ────────────────────────────────────────────────────────────────

export interface FileAssetRecord {
  id: string;
  userId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

// ─── Job ─────────────────────────────────────────────────────────────────────

export interface JobRecord {
  id: string;
  userId: string;
  fileAssetId: string;
  status: JobStatus;
  attempts: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Job with its AI result included when available. */
export interface JobWithResult extends JobRecord {
  aiResult: AiResultRecord | null;
  followUpResult: FollowUpResultRecord[];
}

// ─── AiResult ────────────────────────────────────────────────────────────────

export interface AiResultRecord {
  id: string;
  jobId: string;
  schemaVersion: string;
  rawOutput: string | null;
  parsedResult: StructuredNotes;
  createdAt: Date;
}

// ─── FollowUpResult ───────────────────────────────────────────────────────────

export interface FollowUpResultRecord {
  id: string;
  jobId: string;
  action: string;
  schemaVersion: string;
  result: ExpandedNotes;
  createdAt: Date;
}

// ─── API response shapes ──────────────────────────────────────────────────────

/** Response from POST /api/ai/upload — job accepted, not processed. */
export interface UploadAcceptedResponse {
  accepted: true;
  jobs: Array<{ jobId: string; fileAssetId: string; originalName: string }>;
}

/** Response from GET /api/ai/jobs/[jobId] */
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  attempts: number;
  errorMessage: string | null;
  result: StructuredNotes | null;
  followUpResult: ExpandedNotes | null;
}
