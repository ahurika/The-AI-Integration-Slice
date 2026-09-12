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
  // Resolved: OpenAI gpt-4o-mini
  role1ModelId: 'gpt-4o-mini',
  role2ModelId: 'gpt-4o-mini',

  // Resolved: 30 second timeouts
  role1TimeoutMs: 30000,
  role2TimeoutMs: 30000,

  // Resolved: token caps
  role1MaxOutputTokens: 2048,
  role2MaxOutputTokens: 2048,

  // Resolved: temperatures
  role1Temperature: 0.1,
  role2Temperature: 0.7,
} as const;

// ─── OPEN QUESTION: Retry / backoff ──────────────────────────────────────────
// (open question — ARCHITECTURE.md §23 item 6)

export const RETRY_CONFIG = {
  maxAttempts: 3,
  backoffBaseMs: 1000,
} as const;

// ─── OPEN QUESTION: Concurrency ───────────────────────────────────────────────
// (open question — ARCHITECTURE.md §23 item 4)

export const WORKER_CONFIG = {
  concurrency: 2, // Max 2 active AI jobs simultaneously
} as const;

// ─── OPEN QUESTION: Rate limits ───────────────────────────────────────────────
// (open question — ARCHITECTURE.md §23 item 3)

export const RATE_LIMIT_CONFIG = {
  uploadMaxRequests: 5,
  uploadWindowMs: 3600000, // 1 hour
  followUpMaxRequests: 10,
  followUpWindowMs: 3600000, // 1 hour
} as const;

// ─── OPEN QUESTION: File limits and allowlist ─────────────────────────────────
// (open question — ARCHITECTURE.md §23 items 7 and 8)

export const FILE_CONFIG = {
  maxFileSizeBytes: 5242880, // 5MB
  maxFilesPerSubmission: 5,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// ─── Storage configuration ────────────────────────────────────────────────────
// (open question — ARCHITECTURE.md §23 item 2)

export const STORAGE_CONFIG = {
  // TODO: Set once storage provider is chosen
  // For local development equivalent, this will be an absolute directory path.
  localStoragePath: process.env.AI_LOCAL_STORAGE_PATH ?? './uploads',
} as const;
