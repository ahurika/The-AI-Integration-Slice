/**
 * app/ai/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Upload page for the AI Integration Slice.
 *
 * Server Component — uses requireAuth() to protect the page server-side.
 * Redirects to /login if no valid session exists (reuses Assessment 1 auth).
 *
 * Scope (R3-028): Upload entry point only. No dashboard, landing page,
 * or marketing content.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { requireAuth } from '@/lib/auth/guards';
import UploadForm from '@/components/ai/upload-form';

export const metadata = {
  title: 'Upload Notes — AI Integration Slice',
  description: 'Upload handwritten notes to convert them into structured text.',
};

export default async function AiUploadPage() {
  const session = await requireAuth();

  return (
    <main>
      <h1>Upload handwritten notes</h1>
      <p>
        Welcome, {session.user.name}. Select one or more handwritten note files to process.
      </p>

      {/* SCAFFOLD NOTE:
          UploadForm submits to POST /api/ai/upload.
          Jobs will redirect to /ai/jobs/[jobId] once storage is implemented.
          Currently returns a scaffold 202 response. */}
      <UploadForm />
    </main>
  );
}
