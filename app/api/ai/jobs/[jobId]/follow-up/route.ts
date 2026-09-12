/**
 * app/api/ai/jobs/[jobId]/follow-up/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/ai/jobs/:jobId/follow-up
 *
 * Invokes AI Role 2 (Note Expander) on the validated Role 1 result.
 * The follow-up action is: "Expand notes".
 *
 * Order (ARCHITECTURE.md §10, PRD.md §10):
 *   1. Authenticate
 *   2. Ownership check (scope to authenticated user)
 *   3. Confirm original job is done (AiResult must exist)
 *   4. Rate limit
 *   5. Invoke Role 2 (scaffold: throws ProviderNotImplementedError)
 *   6. Validate output
 *   7. Persist follow-up result
 *   8. Return truthful result or failure state
 *
 * (R3-007, R3-009, R3-011, R3-017)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findJobForUser, createFollowUpResult } from '@/src/db/repositories/job.repository';
import { checkFollowUpRateLimit } from '@/src/services/rate-limit/ai';
import { runNoteExpander } from '@/src/services/ai/roles/note-expander';
import { ExpandedNotesSchema, EXPANDED_NOTES_SCHEMA_VERSION } from '@/src/domain/ai/schemas';
import type { StructuredNotes } from '@/src/domain/ai/schemas';
import { JOB_STATUS } from '@/src/domain/ai/states';
import { ProviderNotImplementedError } from '@/src/services/ai/provider';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const { jobId } = await params;
  const userId = session.user.id;

  // ── 2. Ownership check ────────────────────────────────────────────────────
  const job = await findJobForUser(jobId, userId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  // ── 3. Confirm job is done with a validated result ────────────────────────
  if (job.status !== JOB_STATUS.DONE || !job.aiResult) {
    return NextResponse.json(
      {
        error: 'Follow-up is only available for completed jobs with a validated result.',
        status: job.status,
      },
      { status: 409 },
    );
  }

  // ── 4. Rate limit ─────────────────────────────────────────────────────────
  const rateLimit = await checkFollowUpRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many follow-up requests. Please wait before trying again.',
        retryAfterMs: rateLimit.retryAfterMs,
      },
      {
        status: 429,
        headers: rateLimit.retryAfterMs
          ? { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) }
          : {},
      },
    );
  }

  // ── 5. Invoke Role 2 — receives VALIDATED Role 1 output ───────────────────
  // Role 2 receives AiResult.parsedResult — not raw provider response.
  const validatedStructuredNotes = job.aiResult.parsedResult as StructuredNotes;

  let role2Output: { rawOutput: string; parsed: unknown };
  try {
    role2Output = await runNoteExpander({ validatedStructuredNotes });
  } catch (err) {
    if (err instanceof ProviderNotImplementedError) {
      return NextResponse.json(
        {
          scaffold: true,
          error:
            'Follow-up route scaffolded. Provider not yet implemented. ' +
            'Resolve open questions before calling Role 2.',
        },
        { status: 503 },
      );
    }
    // Safe error — do not expose internal stack trace.
    const message = err instanceof Error ? err.message : 'Provider error.';
    return NextResponse.json({ error: `Follow-up failed: ${message}` }, { status: 500 });
  }

  // ── 6. Application-side schema validation ─────────────────────────────────
  const parseResult = ExpandedNotesSchema.safeParse(role2Output.parsed);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Follow-up result failed validation. Please try again.' },
      { status: 500 },
    );
  }

  // ── 7. Persist follow-up result ───────────────────────────────────────────
  const followUpResult = await createFollowUpResult({
    jobId,
    schemaVersion: EXPANDED_NOTES_SCHEMA_VERSION,
    result: parseResult.data,
  });

  // ── 8. Return result ──────────────────────────────────────────────────────
  return NextResponse.json(
    { success: true, followUpResultId: followUpResult.id, result: parseResult.data },
    { status: 200 },
  );
}
