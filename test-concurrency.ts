import { PrismaClient } from '@prisma/client';
import { runWorker } from './src/services/queue/worker';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('No user');

  const asset = await prisma.fileAsset.create({
    data: {
      userId: user.id,
      storageKey: 'uploads/test.jpg',
      originalName: 'test.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 100,
    }
  });

  // Create 5 pending jobs
  for (let i = 0; i < 5; i++) {
    await prisma.job.create({
      data: {
        userId: user.id,
        fileAssetId: asset.id,
        status: 'pending',
      }
    });
  }
  console.log('Created 5 pending jobs. Starting worker...');
  await runWorker();
}

main().catch(console.error);
