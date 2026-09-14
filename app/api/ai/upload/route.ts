import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { startQueuePoller } from '@/src/services/queue/worker';


// Start the poller in the background if it hasn't started yet
// In a real app this would be in a separate worker process
startQueuePoller();

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkRateLimit, getClientIp } = await import('@/lib/auth/rateLimit');
    const ip = await getClientIp();
    await checkRateLimit('upload', ip);

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const acceptedJobs = [];
    for (const file of files) {
      // Validate size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        continue;
      }

      // Validate type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        continue;
      }

      const storageKey = `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const filePath = path.join(process.cwd(), 'uploads', storageKey);

      // Read the file stream and write to disk
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(filePath, buffer);

      // Create DB records transactionally
      const job = await prisma.$transaction(async (tx) => {
        const fileAsset = await tx.fileAsset.create({
          data: {
            userId: session.userId,
            storageKey,
            originalName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }
        });

        return tx.job.create({
          data: {
            userId: session.userId,
            fileAssetId: fileAsset.id,
            status: 'pending',
          }
        });
      });
      
      acceptedJobs.push({ jobId: job.id });
    }

    if (acceptedJobs.length === 0) {
      return NextResponse.json({ error: 'No valid files uploaded' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Upload successful', acceptedJobs }, { status: 201 });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed', details: [error.message] }, { status: 500 });
  }
}
