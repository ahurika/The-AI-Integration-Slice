/**
 * src/services/ai/provider.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI provider adapter (R3-022, ARCHITECTURE.md §10).
 *
 * OPEN QUESTION: AI provider is not yet chosen. See ARCHITECTURE.md §23 item 1.
 *
 * This adapter owns ALL provider-specific SDK details.
 * Route handlers and role files call generateStructuredOutput() — they do not
 * import or call any provider SDK directly.
 *
 * Once the provider is confirmed, this file will:
 *   1. Import the official SDK (e.g. openai, @google/generative-ai, @anthropic-ai/sdk).
 *   2. Initialize the client using process.env.AI_API_KEY (never hardcoded).
 *   3. Implement generateStructuredOutput() using the SDK's structured output API.
 *
 * SCAFFOLD: generateStructuredOutput throws ProviderNotImplementedError.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ZodType } from 'zod';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';

// Initialize the OpenAI client lazily to avoid throwing at startup if missing in CI
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new ProviderFatalError('OPENAI_API_KEY is not set in environment variables.');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export class ProviderNotImplementedError extends Error {
  constructor() {
    super(
      'AI provider not implemented. ' +
      'Resolve open question (ARCHITECTURE.md §23 item 1) before calling the provider.',
    );
    this.name = 'ProviderNotImplementedError';
  }
}

/** Errors that are considered recoverable and eligible for retry (R3-012). */
export class ProviderTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderTransientError';
  }
}

/** Errors that are NOT recoverable — do not retry. */
export class ProviderFatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderFatalError';
  }
}

export interface GenerateStructuredOutputOptions<T> {
  /** Application-controlled system prompt (never from uploaded content). */
  systemPrompt: string;
  /** User turn content — the file bytes or extracted representation. */
  userContent: string | Buffer;
  /** Zod schema used to request structured output from the provider. */
  schema: ZodType<T>;
  /** Configured model identifier — sourced from AI_CONFIG, never hardcoded. */
  modelId: string;
  /** Temperature — sourced from AI_CONFIG. */
  temperature: number;
  /** Max output tokens — sourced from AI_CONFIG. */
  maxOutputTokens: number;
  /** Timeout in milliseconds — sourced from AI_CONFIG. */
  timeoutMs: number;
}

/**
 * Calls the AI provider and returns structured output validated by the provider SDK.
 *
 * NOTE: Application-side schema validation (src/domain/ai/schemas.ts) is a
 * SEPARATE step that must happen AFTER this function returns. The provider's
 * structured output request and the application schema are two distinct controls.
 *
 * SCAFFOLD: Throws ProviderNotImplementedError until provider is chosen.
 *
 * TODO: Implement once AI provider is confirmed (open question).
 *   - Use official SDK only (R3-022). Do not replace with raw HTTP.
 *   - Apply timeoutMs using AbortController or SDK timeout option.
 *   - Classify errors as ProviderTransientError or ProviderFatalError.
 *   - Never log the API key or raw stack trace.
 */
export async function generateStructuredOutput<T>(
  options: GenerateStructuredOutputOptions<T>,
): Promise<{ rawOutput: string; parsed: T }> {
  const openai = getOpenAI();
  
  // Format the user content based on whether it is a string or an image buffer
  const userMessageContent: OpenAI.Chat.ChatCompletionContentPart[] = [];
  if (Buffer.isBuffer(options.userContent)) {
    const base64Image = options.userContent.toString('base64');
    userMessageContent.push({
      type: 'image_url',
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`,
      },
    });
  } else {
    userMessageContent.push({
      type: 'text',
      text: options.userContent,
    });
  }

  try {
    const response = await (openai.beta as any).chat.completions.parse(
      {
        model: options.modelId,
        temperature: options.temperature,
        max_tokens: options.maxOutputTokens,
        messages: [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: userMessageContent },
        ],
        response_format: zodResponseFormat(options.schema, 'result'),
      },
      { timeout: options.timeoutMs }
    );

    const choice = response.choices[0];
    
    // Fallback error if refusal or missing message
    if (!choice || !choice.message) {
      throw new ProviderTransientError('Provider returned an empty or invalid response.');
    }
    
    if (choice.message.refusal) {
      throw new ProviderFatalError(`Provider refused to process: ${choice.message.refusal}`);
    }

    if (!choice.message.parsed) {
      throw new ProviderTransientError('Provider failed to return parsed structured output.');
    }

    return {
      // The SDK doesn't expose the raw JSON string directly on the parsed message in all versions,
      // but we can serialize the parsed object as a best-effort raw output for evidence.
      rawOutput: JSON.stringify(choice.message.parsed, null, 2),
      parsed: choice.message.parsed as T,
    };
  } catch (error: any) {
    if (error instanceof ProviderFatalError || error instanceof ProviderTransientError) {
      throw error;
    }
    
    // Classify OpenAI SDK errors
    if (error instanceof OpenAI.APIConnectionError || error instanceof OpenAI.APIConnectionTimeoutError || error.status === 429 || error.status >= 500) {
      throw new ProviderTransientError(`Transient OpenAI error: ${error.message}`);
    }
    
    throw new ProviderFatalError(`Fatal OpenAI error: ${error.message}`);
  }
}
