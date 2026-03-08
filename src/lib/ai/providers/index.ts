/**
 * HOLLY AI - AI Providers Index
 * 
 * Unified interface for all AI providers:
 * - Ollama (FREE, unlimited, local)
 * - Google Gemini (FREE tier)
 * - Groq (FREE tier)
 * - OpenAI (fallback, paid)
 */

import { ollama, OllamaProvider } from './ollama';

// Provider types
export type AIProvider = 'ollama' | 'gemini' | 'groq' | 'openai';

export interface ProviderConfig {
  name: string;
  available: boolean;
  free: boolean;
  priority: number;
}

// Check which providers are available
async function checkProviderAvailability(): Promise<Record<AIProvider, boolean>> {
  const availability: Record<AIProvider, boolean> = {
    ollama: false,
    gemini: false,
    groq: false,
    openai: false,
  };

  // Check Ollama
  try {
    availability.ollama = await ollama.isRunning();
  } catch {
    availability.ollama = false;
  }

  // Check Gemini
  availability.gemini = !!process.env.GOOGLE_AI_API_KEY;

  // Check Groq
  availability.groq = !!process.env.GROQ_API_KEY;

  // Check OpenAI
  availability.openai = !!process.env.OPENAI_API_KEY;

  return availability;
}

// Get recommended provider based on availability and task
export async function getRecommendedProvider(
  task: 'chat' | 'code' | 'vision' | 'embedding' = 'chat'
): Promise<{ provider: AIProvider; reason: string }> {
  const availability = await checkProviderAvailability();

  // Priority order for free providers
  if (task === 'code' && availability.ollama) {
    return { provider: 'ollama', reason: 'Ollama with CodeLlama - best for code tasks' };
  }

  if (task === 'vision' && availability.ollama) {
    return { provider: 'ollama', reason: 'Ollama with LLaVA - vision capable' };
  }

  if (task === 'embedding' && availability.ollama) {
    return { provider: 'ollama', reason: 'Ollama with nomic-embed-text' };
  }

  // Default chat priority
  if (availability.ollama) {
    return { provider: 'ollama', reason: 'Ollama - FREE and unlimited' };
  }

  if (availability.gemini) {
    return { provider: 'gemini', reason: 'Gemini - FREE tier available' };
  }

  if (availability.groq) {
    return { provider: 'groq', reason: 'Groq - FREE tier available' };
  }

  if (availability.openai) {
    return { provider: 'openai', reason: 'OpenAI - fallback (paid)' };
  }

  return { provider: 'ollama', reason: 'No providers available - check configuration' };
}

// Export providers
export { ollama, OllamaProvider };

// Provider configurations
export const providerConfigs: Record<AIProvider, ProviderConfig> = {
  ollama: {
    name: 'Ollama',
    available: true, // Will be checked at runtime
    free: true,
    priority: 1,
  },
  gemini: {
    name: 'Google Gemini',
    available: true, // Will be checked at runtime
    free: true, // Has free tier
    priority: 2,
  },
  groq: {
    name: 'Groq',
    available: true, // Will be checked at runtime
    free: true, // Has free tier
    priority: 3,
  },
  openai: {
    name: 'OpenAI',
    available: true, // Will be checked at runtime
    free: false,
    priority: 4,
  },
};
