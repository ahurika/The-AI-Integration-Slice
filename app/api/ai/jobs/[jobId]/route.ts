/**
 * app/api/ai/jobs/[jobId]/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GET /api/ai/jobs/:jobId
 *
 * Returns current job state and available validated result.
 * Every lookup is scoped to the authenticated user — a job ID alone is never
 * sufficient authorization (AGENTS.md §5, ARCHITECTURE.md §3).
 *
 * (R3-005, R3-013, R3-014)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { findJobForUser } from '@/src/db/repositories/job.repository';
import type { JobStatusResponse } from '@/src/domain/ai/types';
import type { StructuredNotes, ExpandedNotes } from '@/src/domain/ai/schemas';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const { jobId } = await params;
  const userId = session.user.id;

  // ── 2. Scope lookup to authenticated user ─────────────────────────────────
  // Returns null for any job that does not belong to this user.
  // We return 404 rather than 403 to avoid revealing whether the job exists.
  const job = await findJobForUser(jobId, userId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  // ── 3. Build response ─────────────────────────────────────────────────────
  const parsedResult: StructuredNotes | null =
    job.aiResult ? (job.aiResult.parsedResult as StructuredNotes) : null;

  const followUpResult: ExpandedNotes | null =
    job.followUpResult?.[0] ? (job.followUpResult[0].result as ExpandedNotes) : null;

  const response: JobStatusResponse = {
    jobId: job.id,
    status: job.status,
    attempts: job.attempts,
    errorMessage: job.errorMessage,
    result: parsedResult,
    followUpResult,
  };

  return NextResponse.json(response, { status: 200 });
}
