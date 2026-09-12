/**
 * src/services/ai/roles/note-expander.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Role 2: Note Expander (R3-007, R3-009, R3-010, R3-011).
 *
 * Expands a validated StructuredNotes object into an ExpandedNotes object.
 *
 * CRITICAL: This role receives AiResult.parsedResult — the VALIDATED Role 1
 * output — never the raw unvalidated provider response. Enforced at call sites.
 * (AGENTS.md §9: "Do not call the second role using the raw unvalidated response
 *  from Role 1.")
 *
 * This role:
 *   - Uses ROLE2_SYSTEM_PROMPT (application-controlled).
 *   - Uses AI_CONFIG.role2ModelId, role2Temperature, role2MaxOutputTokens, role2TimeoutMs.
 *   - Calls generateStructuredOutput() — never calls the provider SDK directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { AI_CONFIG } from '@/src/config/ai';
import { generateStructuredOutput } from '@/src/services/ai/provider';
import { ROLE2_SYSTEM_PROMPT } from '@/src/services/ai/prompts';
import {
  ExpandedNotesSchema,
  type StructuredNotes,
  type ExpandedNotes,
} from '@/src/domain/ai/schemas';

export interface Role2Input {
  /**
   * The VALIDATED Role 1 output (AiResult.parsedResult).
   * Must not be a raw, unvalidated provider response.
   */
  validatedStructuredNotes: StructuredNotes;
}

export interface Role2Output {
  rawOutput: string;
  parsed: ExpandedNotes;
}

/**
 * Invokes AI Role 2: Note Expander.
 *
 * Receives validated Role 1 output — serialized as JSON for the provider's
 * user turn. The system prompt instructs the model to expand this input.
 */
export async function runNoteExpander(input: Role2Input): Promise<Role2Output> {
  // Serialize the validated structured notes as the user-turn content.
  // The system prompt instructs the model to treat this as data to expand.
  const userContent = JSON.stringify(input.validatedStructuredNotes, null, 2);

  return generateStructuredOutput<ExpandedNotes>({
    systemPrompt: ROLE2_SYSTEM_PROMPT,
    userContent,
    schema: ExpandedNotesSchema,
    modelId: AI_CONFIG.role2ModelId,
    temperature: AI_CONFIG.role2Temperature,
    maxOutputTokens: AI_CONFIG.role2MaxOutputTokens,
    timeoutMs: AI_CONFIG.role2TimeoutMs,
  });
}
