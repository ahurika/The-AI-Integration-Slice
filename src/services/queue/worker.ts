import { prisma } from '@/lib/db/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// Zod schema for structured output validation
const noteSchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
});

// Configure Google Gen AI SDK
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables. Please add it to your .env file.');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize the models (Role 1 and Role 2)
const extractorModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
const categorizerModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

// System prompts for roles
const EXTRACTOR_SYSTEM_PROMPT = "You are an OCR Extractor. Extract the handwritten text from the image exactly as written. Do not summarize.";
const CATEGORIZER_SYSTEM_PROMPT = "You are a Note Structurer. Parse the raw text of the handwritten note into the following JSON schema: { \"title\": \"string\", \"content\": \"string\", \"tags\": [\"string\"] }. Return ONLY valid JSON.";

export async function processJob(jobId: string) {
  try {
    // 1. Mark job as processing
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'processing', attempts: { increment: 1 } },
    });

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { fileAsset: true },
    });

    if (!job || !job.fileAsset) {
      throw new Error("Job or FileAsset not found");
    }

    // 2. Read file from local "object storage"
    const filePath = path.join(process.cwd(), 'uploads', job.fileAsset.storageKey);
    const fileBytes = await fs.readFile(filePath);
    
    // Convert to base64 for Gemini
    const base64Data = fileBytes.toString('base64');
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: job.fileAsset.mimeType
      }
    };

    // 3. Role 1: OCR Extraction
    const extractorResult = await extractorModel.generateContent({
      contents: [{ role: 'user', parts: [imagePart] }],
      systemInstruction: EXTRACTOR_SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.1
      }
    });

    const extractedText = extractorResult.response.text();
    if (!extractedText) throw new Error("Failed to extract text from image");

    // 4. Role 2: Categorization (Structured Output)
    const categorizerResult = await categorizerModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: extractedText }] }],
      systemInstruction: CATEGORIZER_SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const categorizedJson = categorizerResult.response.text();
    
    // 5. Validation using schema
    let parsedResult;
    try {
      const parsedData = JSON.parse(categorizedJson);
      parsedResult = noteSchema.parse(parsedData);
    } catch (e: any) {
      throw new Error(`Validation failed on AI output: ${e.message}`);
    }

    // 6. Save result
    await prisma.$transaction([
      prisma.job.update({
        where: { id: jobId },
        data: { status: 'done', errorMessage: null },
      }),
      prisma.aiResult.create({
        data: {
          jobId: jobId,
          schemaVersion: '1.0',
          rawOutput: extractedText,
          parsedResult: parsedResult as any,
        }
      })
    ]);

  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'failed', errorMessage: error.message },
    });
  }
}

let isPolling = false;
export function startQueuePoller() {
  if (isPolling) return;
  isPolling = true;

  setInterval(async () => {
    const processingCount = await prisma.job.count({ where: { status: 'processing' } });
    if (processingCount >= 3) return;

    const job = await prisma.job.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' }
    });

    if (job) {
      processJob(job.id);
    }
  }, 5000);
}

export function runWorker() {
  startQueuePoller();
}

