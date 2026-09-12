/**
 * app/api/ai/upload/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/ai/upload
 *
 * Accepts handwritten note files, validates them, stores them, creates Job
 * records, and returns accepted job IDs. Does NOT call the AI model.
 * (R3-002, R3-003, R3-004, R3-013, R3-016, R3-018, R3-019)
 *
 * SCAFFOLD: Storage and worker are not yet implemented.
 * The route returns a clear scaffold response rather than pretending to succeed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { checkUploadRateLimit } from '@/src/services/rate-limit/ai';
import { validateFiles } from '@/src/validation/files';
import { describeValidationError } from '@/src/validation/files';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }
  const userId = session.user.id;

  // ── 2. Rate limit ─────────────────────────────────────────────────────────
  const rateLimit = await checkUploadRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many upload requests. Please wait before submitting again.',
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

  // ── 3. Parse multipart body ───────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body.' }, { status: 400 });
  }

  const fileEntries = formData.getAll('files') as File[];
  if (fileEntries.length === 0) {
    return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
  }

  // ── 4. Server-side file validation (authoritative) ────────────────────────
  const fileInputs = fileEntries.map((f) => ({
    name: f.name,
    mimeType: f.type,
    sizeBytes: f.size,
  }));

  const validation = validateFiles(fileInputs);
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: 'File validation failed.',
        details: validation.errors.map(describeValidationError),
      },
      { status: 400 },
    );
  }

  // ── 5–8. SCAFFOLD: Storage + Job creation + Worker enqueue ───────────────
  // TODO: Implement once storage provider and queue strategy are confirmed.
  // Steps to implement here:
  //   5. for each file: await putFile({ originalName, mimeType, bytes })
  //   6. await createFileAsset({ userId, storageKey, originalName, mimeType, sizeBytes })
  //   7. await createJob(userId, fileAsset.id)
  //   8. trigger worker (runWorker() or enqueue via queue library)
  //
  // On partial failure (storage succeeds, job create fails):
  //   await deleteFile(storageKey) to clean up the orphaned object.

  return NextResponse.json(
    {
      scaffold: true,
      message:
        'Upload route scaffolded. Storage and job creation will be implemented once ' +
        'open questions (provider, storage, queue) are resolved. ' +
        `Received ${fileEntries.length} valid file(s) for user ${userId}.`,
    },
    { status: 202 },
  );
}
