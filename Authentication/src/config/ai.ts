/**
 * src/config/ai.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central configuration for the AI integration slice (R3-021).
 *
 * OPEN QUESTIONS — values marked TODO must be resolved by the project owner
 * before implementation proceeds. See ARCHITECTURE.md §23 and PRD.md §8.
 *
 * RULES:
 * - No model ID, timeout, token cap, concurrency, or rate-limit value may be
 *   hard-coded inside a route handler or worker. Import from here instead.
 * - Secrets (API keys, connection strings) belong in .env, not here.
 * - This file reads process.env only for infrastructure URLs/secrets, not for
 *   tuning parameters — tuning parameters are constants defined below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── OPEN QUESTION: AI provider / model selection ────────────────────────────
// Resolved by project owner before implementation.
// Do not invent a model identifier.

export const AI_CONFIG = {
  // TODO: Set once AI provider is chosen (open question — ARCHITECTURE.md §23 item 1)
  role1ModelId: process.env.AI_ROLE1_MODEL_ID ?? 'UNRESOLVED',
  // TODO: Set once AI provider is chosen (open question — ARCHITECTURE.md §23 item 1)
  role2ModelId: process.env.AI_ROLE2_MODEL_ID ?? 'UNRESOLVED',

  // TODO: Set once timeout values are confirmed (open question — ARCHITECTURE.md §23 item 5)
  role1TimeoutMs: parseInt(process.env.AI_ROLE1_TIMEOUT_MS ?? '0', 10),
  role2TimeoutMs: parseInt(process.env.AI_ROLE2_TIMEOUT_MS ?? '0', 10),

  // TODO: Set once token caps are confirmed (open question — PRD.md §8)
  role1MaxOutputTokens: parseInt(process.env.AI_ROLE1_MAX_OUTPUT_TOKENS ?? '0', 10),
  role2MaxOutputTokens: parseInt(process.env.AI_ROLE2_MAX_OUTPUT_TOKENS ?? '0', 10),

  // TODO: Set once temperature values are confirmed (open question — PRD.md §8)
  role1Temperature: parseFloat(process.env.AI_ROLE1_TEMPERATURE ?? '0'),
  role2Temperature: parseFloat(process.env.AI_ROLE2_TEMPERATURE ?? '0'),
} as const;

// ─── OPEN QUESTION: Retry / backoff ──────────────────────────────────────────
// (open question — ARCHITECTURE.md §23 item 6)

export const RETRY_CONFIG = {
  // TODO: Confirm max attempts
  maxAttempts: parseInt(process.env.AI_MAX_ATTEMPTS ?? '0', 10),
  // TODO: Confirm backoff strategy — value in milliseconds
  backoffBaseMs: parseInt(process.env.AI_BACKOFF_BASE_MS ?? '0', 10),
} as const;

// ─── OPEN QUESTION: Concurrency ───────────────────────────────────────────────
// (open question — ARCHITECTURE.md §23 item 4)

export const WORKER_CONFIG = {
  // TODO: Confirm concurrency cap (R3-015)
  concurrency: parseInt(process.env.AI_WORKER_CONCURRENCY ?? '0', 10),
} as const;

// ─── OPEN QUESTION: Rate limits ───────────────────────────────────────────────
// (open question — ARCHITECTURE.md §23 item 3)

export const RATE_LIMIT_CONFIG = {
  // TODO: Confirm upload rate limit (R3-016)
  uploadMaxRequests: parseInt(process.env.AI_UPLOAD_RATE_MAX ?? '0', 10),
  uploadWindowMs: parseInt(process.env.AI_UPLOAD_RATE_WINDOW_MS ?? '0', 10),
  // TODO: Confirm follow-up rate limit (R3-017)
  followUpMaxRequests: parseInt(process.env.AI_FOLLOWUP_RATE_MAX ?? '0', 10),
  followUpWindowMs: parseInt(process.env.AI_FOLLOWUP_RATE_WINDOW_MS ?? '0', 10),
} as const;

// ─── OPEN QUESTION: File limits and allowlist ─────────────────────────────────
// (open question — ARCHITECTURE.md §23 items 7 and 8)

export const FILE_CONFIG = {
  // TODO: Confirm max file size in bytes (R3-003)
  maxFileSizeBytes: parseInt(process.env.AI_MAX_FILE_SIZE_BYTES ?? '0', 10),
  // TODO: Confirm max files per submission (R3-002, R3-003)
  maxFilesPerSubmission: parseInt(process.env.AI_MAX_FILES_PER_SUBMISSION ?? '0', 10),
  // TODO: Confirm MIME type allowlist (R3-003)
  // Example entries only — do not treat as final until open question is resolved.
  allowedMimeTypes: (process.env.AI_ALLOWED_MIME_TYPES ?? '').split(',').filter(Boolean),
} as const;

// ─── Storage configuration ────────────────────────────────────────────────────
// (open question — ARCHITECTURE.md §23 item 2)

export const STORAGE_CONFIG = {
  // TODO: Set once storage provider is chosen
  // For local development equivalent, this will be an absolute directory path.
  localStoragePath: process.env.AI_LOCAL_STORAGE_PATH ?? './uploads',
} as const;
