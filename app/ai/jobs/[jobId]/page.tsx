/**
 * app/ai/jobs/[jobId]/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Processing and result page for a single job.
 *
 * Server Component — fetches job state server-side using the authenticated
 * user session. Every job lookup is scoped to the authenticated user.
 *
 * States rendered (R3-005, AGENTS.md §19):
 * - pending    → ProcessingState (pending message)
 * - processing → ProcessingState (processing message)
 * - done       → ResultView + FollowUpResult button
 * - failed     → ProcessingState (failure message with error)
 *
 * No fake spinner. No success shown before validated result is persisted.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/guards';
import { findJobForUser } from '@/src/db/repositories/job.repository';
import ProcessingState from '@/components/ai/processing-state';
import ResultView from '@/components/ai/result-view';
import FollowUpResult from '@/components/ai/follow-up-result';
import type { StructuredNotes, ExpandedNotes } from '@/src/domain/ai/schemas';
import { JOB_STATUS } from '@/src/domain/ai/states';

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { jobId } = await params;
  return {
    title: `Job ${jobId.slice(0, 8)}… — AI Integration Slice`,
    description: 'Processing status and result for your uploaded handwritten notes.',
  };
}

export default async function JobPage({ params }: PageProps) {
  const session = await requireAuth();
  const { jobId } = await params;

  // Job lookup is always scoped to the authenticated user.
  const job = await findJobForUser(jobId, session.user.id);
  if (!job) {
    notFound();
  }

  const isDone = job.status === JOB_STATUS.DONE;
  const parsedResult: StructuredNotes | null = isDone && job.aiResult
    ? (job.aiResult.parsedResult as StructuredNotes)
    : null;

  const latestFollowUp: ExpandedNotes | undefined = job.followUpResult?.[0]
    ? (job.followUpResult[0].result as ExpandedNotes)
    : undefined;

  return (
    <main>
      <h1>Notes processing</h1>

      {/* Processing state — shown for all statuses */}
      <ProcessingState
        jobId={job.id}
        status={job.status}
        attempts={job.attempts}
        errorMessage={job.errorMessage}
      />

      {/* Result — shown only when done with validated output */}
      {isDone && parsedResult && (
        <>
          <ResultView result={parsedResult} />
          {/* Single follow-up action: Expand notes (R3-007) */}
          <FollowUpResult jobId={job.id} existingResult={latestFollowUp} />
        </>
      )}
    </main>
  );
}
