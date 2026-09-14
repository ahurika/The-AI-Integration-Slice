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
import './ai.css';

export const metadata = {
  title: 'Upload Notes — AI Integration Slice',
  description: 'Upload handwritten notes to convert them into structured text.',
};

export default async function AiUploadPage() {
  const session = await requireAuth();

  return (
    <div className="ai-page-container">
      <main className="ai-card">
        <h1 className="ai-title">Process Handwritten Notes</h1>
        <p className="ai-subtitle">
          Welcome back, {session.user.name}. Select or drag & drop one or more handwritten note files to process.
        </p>
        <UploadForm />
      </main>
    </div>
  );
}
