'use client';

/**
 * components/ai/follow-up-result.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the "Expand notes" follow-up result (AI Role 2 output).
 * Also provides the Expand notes button to trigger the follow-up action.
 *
 * UI rules (R3-007, AGENTS.md §19):
 * - One follow-up action: Expand notes.
 * - Has its own loading, success, timeout, and failure states.
 * - Do not display success until validated output has been persisted.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import type { ExpandedNotes } from '@/src/domain/ai/schemas';

interface FollowUpResultProps {
  jobId: string;
  /** If a follow-up result already exists (from a previous action), render it directly. */
  existingResult?: ExpandedNotes;
}

export default function FollowUpResult({ jobId, existingResult }: FollowUpResultProps) {
  const [result, setResult] = useState<ExpandedNotes | null>(existingResult ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExpandNotes() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/ai/jobs/${jobId}/follow-up`, { method: 'POST' });
      const data = await res.json() as Record<string, unknown>;

      if (res.status === 429) {
        setError(String(data.error ?? 'Too many requests. Please wait and try again.'));
        return;
      }

      if (res.status === 503 && data.scaffold) {
        setError('[SCAFFOLD] Follow-up provider not yet implemented. Resolve open questions first.');
        return;
      }

      if (!res.ok) {
        setError(String(data.error ?? 'Expand notes failed. Please try again.'));
        return;
      }

      setResult(data.result as ExpandedNotes);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-label="Expand notes follow-up">
      <h2>Expanded notes</h2>

      {!result && (
        <>
          <p>Get a more detailed expansion of your structured notes.</p>
          <button
            id="expand-notes-btn"
            type="button"
            onClick={handleExpandNotes}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Expanding…' : 'Expand notes'}
          </button>
        </>
      )}

      {error && (
        <p role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {result && (
        <article aria-label="Expanded notes result">
          <h3>{result.title}</h3>
          <p>{result.overview}</p>

          {result.sections.map((section, i) => (
            <section key={i} aria-label={section.heading}>
              <h4>{section.heading}</h4>
              <p>{section.explanation}</p>
              <ul>
                {section.keyPoints.map((point, j) => (
                  <li key={j}>{point}</li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      )}
    </section>
  );
}
