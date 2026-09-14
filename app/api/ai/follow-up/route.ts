import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/session';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const summarizerModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkRateLimit, getClientIp } = await import('@/lib/auth/rateLimit');
    const ip = await getClientIp();
    await checkRateLimit('followup', ip);

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { aiResult: true, followUpResult: true },
    });

    if (!job || job.userId !== session.userId) {
      return NextResponse.json({ error: 'Job not found or forbidden' }, { status: 404 });
    }

    if (job.followUpResult && job.followUpResult.length > 0) {
      return NextResponse.json({ error: 'Follow-up already completed' }, { status: 400 });
    }

    if (!job.aiResult) {
      return NextResponse.json({ error: 'No AI result to summarize' }, { status: 400 });
    }

    // Call Gemini to summarize the structured data
    const summaryPrompt = `You are a financial summarizer. Create a 1-sentence summary of the following expense data: ${JSON.stringify(job.aiResult.parsedResult)}`;
    
    const result = await summarizerModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
      generationConfig: {
        maxOutputTokens: 256,
        temperature: 0.3
      }
    });

    const summaryText = result.response.text();

    await prisma.followUpResult.create({
      data: {
        jobId: job.id,
        action: 'summarize',
        schemaVersion: '1.0',
        result: { summary: summaryText }
      }
    });

    return NextResponse.json({ message: 'Summarized successfully', summary: summaryText });
  } catch (error: any) {
    console.error('Follow-up error:', error);
    return NextResponse.json({ error: 'Follow-up failed', details: error.message }, { status: 500 });
  }
}
