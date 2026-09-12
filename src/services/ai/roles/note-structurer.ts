/**
 * src/services/ai/roles/note-structurer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Role 1: Note Structurer (R3-008, R3-009, R3-010, R3-011).
 *
 * Converts a source handwritten note file into a validated StructuredNotes object.
 *
 * This role:
 *   - Uses ROLE1_SYSTEM_PROMPT (application-controlled, never user-supplied).
 *   - Uses AI_CONFIG.role1ModelId, role1Temperature, role1MaxOutputTokens, role1TimeoutMs.
 *   - Calls generateStructuredOutput() — never calls the provider SDK directly.
 *   - Returns { rawOutput, parsed } — raw is for evidence storage only.
 *
 * Application schema validation (StructuredNotesSchema.safeParse) happens in
 * the WORKER after this function returns, not inside this role. This ensures
 * the validation gate is separate from the provider call.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AI_CONFIG } from '@/src/config/ai';
import { generateStructuredOutput } from '@/src/services/ai/provider';
import { ROLE1_SYSTEM_PROMPT } from '@/src/services/ai/prompts';
import { StructuredNotesSchema, type StructuredNotes } from '@/src/domain/ai/schemas';

export interface Role1Input {
  /** File bytes or extracted text representation to pass to the model. */
  fileContent: Buffer | string;
}

export interface Role1Output {
  /** Raw provider response string — stored for evidence purposes only. */
  rawOutput: string;
  /** Provider-parsed structured object — must still pass application validation. */
  parsed: StructuredNotes;
}

/**
 * Invokes AI Role 1: Note Structurer.
 *
 * Throws ProviderTransientError on recoverable failures (worker will retry).
 * Throws ProviderFatalError on unrecoverable failures (worker will fail the job).
 * Throws ProviderNotImplementedError in scaffold state.
 *
 * Does NOT apply application-side schema validation — that is the worker's
 * responsibility, ensuring the validation gate is observable and separate.
 */
export async function runNoteStructurer(input: Role1Input): Promise<Role1Output> {
  return generateStructuredOutput<StructuredNotes>({
    systemPrompt: ROLE1_SYSTEM_PROMPT,
    userContent: input.fileContent,
    schema: StructuredNotesSchema,
    modelId: AI_CONFIG.role1ModelId,
    temperature: AI_CONFIG.role1Temperature,
    maxOutputTokens: AI_CONFIG.role1MaxOutputTokens,
    timeoutMs: AI_CONFIG.role1TimeoutMs,
  });
}
