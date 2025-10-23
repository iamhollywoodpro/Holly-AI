/**
 * HOLLY Groq Configuration
 * 
 * Groq AI client for ultra-fast inference.
 * Uses Llama 3.1 models for quick responses.
 * 
 * Speed: ~500 tokens/second (10x faster than Claude)
 * Cost: Free tier available, then $0.27/1M tokens
 * Use for: Quick responses, simple queries, real-time chat
 */

import Groq from 'groq-sdk';

// ============================================================================
// Environment Variables
// ============================================================================

const groqApiKey = process.env.GROQ_API_KEY || '';
const groqModel = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

if (!groqApiKey) {
  console.warn('GROQ_API_KEY not set - Groq features disabled');
}

// ============================================================================
// Groq Client
// ============================================================================

export const groq = groqApiKey ? new Groq({
  apiKey: groqApiKey
}) : null;

// ============================================================================
// Available Models
// ============================================================================

export const GROQ_MODELS = {
  // Llama 3.1 Models (Recommended)
  'llama-3.1-70b-versatile': {
    name: 'Llama 3.1 70B',
    contextWindow: 131072,
    speed: 'ultra-fast',
    quality: 'high',
    useCase: 'General purpose, best balance'
  },
  'llama-3.1-8b-instant': {
    name: 'Llama 3.1 8B',
    contextWindow: 131072,
    speed: 'blazing-fast',
    quality: 'good',
    useCase: 'Quick responses, simple queries'
  },
  
  // Llama 3 Models
  'llama3-70b-8192': {
    name: 'Llama 3 70B',
    contextWindow: 8192,
    speed: 'fast',
    quality: 'high',
    useCase: 'Complex reasoning'
  },
  'llama3-8b-8192': {
    name: 'Llama 3 8B',
    contextWindow: 8192,
    speed: 'very-fast',
    quality: 'good',
    useCase: 'Rapid responses'
  },
  
  // Mixtral Models
  'mixtral-8x7b-32768': {
    name: 'Mixtral 8x7B',
    contextWindow: 32768,
    speed: 'fast',
    quality: 'high',
    useCase: 'Long context, multilingual'
  },
  
  // Gemma Models (Google)
  'gemma-7b-it': {
    name: 'Gemma 7B',
    contextWindow: 8192,
    speed: 'fast',
    quality: 'good',
    useCase: 'Lightweight, efficient'
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate chat completion with Groq
 */
export async function generateGroqResponse(
  prompt: string,
  options?: {
    model?: keyof typeof GROQ_MODELS;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): Promise<{
  success: boolean;
  response?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}> {
  if (!groq) {
    return {
      success: false,
      error: 'Groq client not configured'
    };
  }

  try {
    const messages: any[] = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    const completion = await groq.chat.completions.create({
      model: options?.model || groqModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 2000,
      top_p: 1,
      stream: false
    });

    const response = completion.choices[0]?.message?.content || '';

    return {
      success: true,
      response,
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      } : undefined
    };

  } catch (error) {
    console.error('Groq error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Stream chat completion with Groq (for real-time responses)
 */
export async function* streamGroqResponse(
  prompt: string,
  options?: {
    model?: keyof typeof GROQ_MODELS;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }
): AsyncGenerator<string> {
  if (!groq) {
    yield 'Error: Groq client not configured';
    return;
  }

  try {
    const messages: any[] = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    const stream = await groq.chat.completions.create({
      model: options?.model || groqModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens || 2000,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }

  } catch (error) {
    console.error('Groq streaming error:', error);
    yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Compare response times between Groq models
 */
export async function benchmarkModels(
  prompt: string
): Promise<Record<string, { time: number; response: string }>> {
  const results: Record<string, { time: number; response: string }> = {};

  const modelsToTest = [
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768'
  ] as const;

  for (const model of modelsToTest) {
    const startTime = Date.now();
    const result = await generateGroqResponse(prompt, { model });
    const endTime = Date.now();

    results[model] = {
      time: endTime - startTime,
      response: result.response || 'Error'
    };
  }

  return results;
}

/**
 * Get model info
 */
export function getModelInfo(model?: keyof typeof GROQ_MODELS) {
  const selectedModel = model || groqModel as keyof typeof GROQ_MODELS;
  return GROQ_MODELS[selectedModel] || GROQ_MODELS['llama-3.1-70b-versatile'];
}

// ============================================================================
// Usage Tracking
// ============================================================================

let totalTokensUsed = 0;
let totalRequests = 0;

export function trackUsage(tokens: number) {
  totalTokensUsed += tokens;
  totalRequests += 1;
}

export function getUsageStats() {
  return {
    totalTokensUsed,
    totalRequests,
    averageTokensPerRequest: totalRequests > 0 ? totalTokensUsed / totalRequests : 0,
    estimatedCost: (totalTokensUsed / 1_000_000) * 0.27 // $0.27 per 1M tokens
  };
}

export function resetUsageStats() {
  totalTokensUsed = 0;
  totalRequests = 0;
}

// ============================================================================
// Export info
// ============================================================================

export const groqInfo = {
  configured: !!groq,
  defaultModel: groqModel,
  availableModels: Object.keys(GROQ_MODELS),
  features: {
    streaming: true,
    functionCalling: false, // Groq doesn't support function calling yet
    vision: false,
    maxContextWindow: 131072
  }
};
