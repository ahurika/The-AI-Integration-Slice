/**
 * src/domain/ai/schemas.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Zod schemas for AI-produced structured output.
 *
 * These schemas are the APPLICATION'S acceptance gate (R3-011).
 * Both the provider SDK's structured-output request AND this second
 * application-side validation are required — they are different controls.
 *
 * Role 1 output: StructuredNotes
 * Role 2 output: ExpandedNotes
 *
 * schemaVersion is embedded so that future schema changes can be identified
 * when reading historical AiResult / FollowUpResult records.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from 'zod';

// ─── Role 1: Note Structurer output ──────────────────────────────────────────

export const SectionSchema = z.object({
  heading: z.string().min(1),
  points: z.array(z.string().min(1)).min(1),
});

export const StructuredNotesSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  sections: z.array(SectionSchema).min(1),
});

export type Section = z.infer<typeof SectionSchema>;
export type StructuredNotes = z.infer<typeof StructuredNotesSchema>;

/** Schema version tag — increment when the shape changes. */
export const STRUCTURED_NOTES_SCHEMA_VERSION = '1.0';

// ─── Role 2: Note Expander output ────────────────────────────────────────────

export const ExpandedSectionSchema = z.object({
  heading: z.string().min(1),
  explanation: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(1),
});

export const ExpandedNotesSchema = z.object({
  title: z.string().min(1),
  overview: z.string().min(1),
  sections: z.array(ExpandedSectionSchema).min(1),
});

export type ExpandedSection = z.infer<typeof ExpandedSectionSchema>;
export type ExpandedNotes = z.infer<typeof ExpandedNotesSchema>;

/** Schema version tag — increment when the shape changes. */
export const EXPANDED_NOTES_SCHEMA_VERSION = '1.0';
