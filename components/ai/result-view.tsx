/**
 * components/ai/result-view.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the validated structured notes from AI Role 1.
 *
 * UI rules (AGENTS.md §19):
 * - Do not display success until validated output has been persisted.
 * - Do not turn this into a notes editor or dashboard.
 * - Result is readable without relying on color alone.
 * - This is a Server Component — no 'use client' needed for display.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { StructuredNotes } from '@/src/domain/ai/schemas';

interface ResultViewProps {
  result: StructuredNotes;
}

export default function ResultView({ result }: ResultViewProps) {
  return (
    <article aria-label="Structured notes result">
      <h2>{result.title}</h2>
      <p>{result.summary}</p>

      {result.sections.map((section, i) => (
        <section key={i} aria-label={section.heading}>
          <h3>{section.heading}</h3>
          <ul>
            {section.points.map((point, j) => (
              <li key={j}>{point}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
