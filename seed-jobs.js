const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');

    // Create file asset
    const asset1 = await prisma.fileAsset.create({
      data: {
        userId: user.id,
        storageKey: 'uploads/success-note.jpg',
        originalName: 'meeting-notes.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 154200,
      }
    });

    const asset2 = await prisma.fileAsset.create({
      data: {
        userId: user.id,
        storageKey: 'uploads/fail-note.pdf',
        originalName: 'corrupted-scan.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 254200,
      }
    });

    // Create successful job
    const job1 = await prisma.job.create({
      data: {
        userId: user.id,
        fileAssetId: asset1.id,
        status: 'done',
        attempts: 1,
        aiResult: {
          create: {
            schemaVersion: '1.0',
            rawOutput: '{\n  "title": "Project Kickoff",\n  "content": "Discussed Q3 roadmap and feature priorities.",\n  "actionItems": ["Draft PRD", "Schedule design review"]\n}',
            parsedResult: {
              title: "Project Kickoff",
              content: "Discussed Q3 roadmap and feature priorities.",
              actionItems: ["Draft PRD", "Schedule design review"]
            }
          }
        }
      }
    });

    // Create failed job
    const job2 = await prisma.job.create({
      data: {
        userId: user.id,
        fileAssetId: asset2.id,
        status: 'failed',
        attempts: 3,
        errorMessage: 'Validation failed: Invalid JSON schema received from provider (Expected string for "title", received number).',
        aiResult: {
          create: {
            schemaVersion: '1.0',
            rawOutput: '{\n  "title": 12345,\n  "content": "Broken structure"\n}',
            parsedResult: { error: 'Validation failed' }
          }
        }
      }
    });

    console.log('Seeded jobs for screenshots');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
seed();
