import { prisma } from '../lib/db/prisma';

async function seed() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No user found, cannot seed.');
      return;
    }

    // 1. Create a dummy FileAsset
    const fileAsset = await prisma.fileAsset.create({
      data: {
        userId: user.id,
        storageKey: 'evidence-test-storage-key-1234',
        originalName: 'handwritten_note.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 102400,
      }
    });

    // 2. Create a dummy successful job
    const successfulJob = await prisma.job.create({
      data: {
        userId: user.id,
        fileAssetId: fileAsset.id,
        status: 'done',
      }
    });

    // 3. Create AiResult for the successful job
    await prisma.aiResult.create({
      data: {
        jobId: successfulJob.id,
        schemaVersion: '1.0',
        rawOutput: 'Grocery\nApples 5.00\nMilk 2.50\nTotal 7.50',
        parsedResult: {
          title: 'Grocery List',
          content: 'Apples 5.00, Milk 2.50. Total 7.50',
          tags: ['groceries', 'expense']
        }
      }
    });

    // 4. Create a failed job to show error message
    const failedFile = await prisma.fileAsset.create({
      data: {
        userId: user.id,
        storageKey: 'evidence-fail-storage-key-5678',
        originalName: 'blurred_note.png',
        mimeType: 'image/png',
        sizeBytes: 51200,
      }
    });

    await prisma.job.create({
      data: {
        userId: user.id,
        fileAssetId: failedFile.id,
        status: 'failed',
        errorMessage: 'Validation failed on AI output: Expected string, received number'
      }
    });

    console.log('Successfully seeded evidence data.');
  } catch (e: any) {
    console.error('Error seeding data:', e.message);
  }
}

seed();
