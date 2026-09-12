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
import { validateFiles, describeValidationError } from '@/src/validation/files';
import { putFile, deleteFile } from '@/src/services/storage/storage';
import { createFileAsset } from '@/src/db/repositories/file-asset.repository';
import { createJob } from '@/src/db/repositories/job.repository';
import { runWorker } from '@/src/services/queue/worker';

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

  // ── 5. Storage + Job creation + Worker enqueue ───────────────
  const acceptedJobs: { jobId: string; originalName: string }[] = [];
  const errors: string[] = [];

  for (const file of fileEntries) {
    let storageKey = '';
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const putResult = await putFile({
        originalName: file.name,
        mimeType: file.type,
        bytes,
      });
      storageKey = putResult.storageKey;

      const fileAsset = await createFileAsset({
        userId,
        storageKey,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });

      const job = await createJob(userId, fileAsset.id);
      acceptedJobs.push({ jobId: job.id, originalName: file.name });
    } catch (error: any) {
      console.error(`Failed to process upload for ${file.name}:`, error);
      errors.push(`Failed to process ${file.name}: ${error.message}`);
      
      // Cleanup orphaned storage object if job creation failed
      if (storageKey) {
        await deleteFile(storageKey).catch((cleanupErr) => {
          console.error(`Failed to clean up orphaned file ${storageKey}:`, cleanupErr);
        });
      }
    }
  }

  // If we couldn't create any jobs, return an error
  if (acceptedJobs.length === 0) {
    return NextResponse.json({ error: 'Failed to process any uploaded files.', details: errors }, { status: 500 });
  }

  // Trigger the background worker without awaiting it
  runWorker().catch((workerErr) => {
    console.error('Failed to trigger background worker:', workerErr);
  });

  return NextResponse.json(
    {
      acceptedJobs,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully accepted ${acceptedJobs.length} file(s) for processing.`,
    },
    { status: 202 },
  );
}
