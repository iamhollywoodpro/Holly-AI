/**
 * HOLLY AI — AI Providers Index (Phase 8A, Gemini-free)
 *
 * Unified interface for all AI providers (all FREE tiers, no paid APIs):
 *  • Groq       — Llama 3.3 70B, DeepSeek R1 (14,400 req/day FREE)
 *  • Cloudflare — Kimi K2.5 256K ctx (free tier)
 *  • NVIDIA NIM — Qwen3 235B, DeepSeek R1 (free tier)
 *  • OpenRouter — 27 free models pool (20 RPM / 200 RPD FREE)
 *  • Ollama     — unlimited, zero cost, offline
 *
 * NOTE: Gemini / OpenAI are NOT in the chat routing path.
 * Use src/lib/ai/smart-router.ts + cascade.ts for task-aware routing.
 */

import { ollama, OllamaProvider } from './ollama';

// Provider types (Gemini removed — not free-tier-only for our purposes)
export type AIProvider = 'ollama' | 'groq' | 'cf_workers' | 'nvidia_nim' | 'openrouter';

export interface ProviderConfig {
  name:      string;
  available: boolean;
  free:      boolean;
  priority:  number;
}

// Check which providers are available
async function checkProviderAvailability(): Promise<Record<AIProvider, boolean>> {
  const availability: Record<AIProvider, boolean> = {
    ollama:     false,
    groq:       false,
    cf_workers: false,
    nvidia_nim: false,
    openrouter: false,
  };

  // Check Ollama
  try {
    availability.ollama = await ollama.isRunning();
  } catch {
    availability.ollama = false;
  }

  availability.groq       = !!process.env.GROQ_API_KEY;
  availability.cf_workers = !!(process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN);
  availability.nvidia_nim = !!process.env.NVIDIA_API_KEY;
  availability.openrouter = !!process.env.OPENROUTER_API_KEY;

  return availability;
}

// Get recommended provider based on availability and task
export async function getRecommendedProvider(
  task: 'chat' | 'code' | 'vision' | 'embedding' = 'chat'
): Promise<{ provider: AIProvider; reason: string }> {
  const availability = await checkProviderAvailability();

  if (task === 'code') {
    if (availability.cf_workers) return { provider: 'cf_workers', reason: 'Kimi K2.5 — best free coder (256K ctx)' };
    if (availability.nvidia_nim) return { provider: 'nvidia_nim', reason: 'Qwen3 235B — great free coder' };
  }

  if (task === 'vision') {
    if (availability.openrouter) return { provider: 'openrouter', reason: 'Qwen3 VL 30B — free vision model' };
  }

  if (task === 'embedding') {
    if (availability.ollama) return { provider: 'ollama', reason: 'Ollama with nomic-embed-text — free, local' };
  }

  // Default chat priority
  if (availability.ollama)     return { provider: 'ollama',     reason: 'Ollama — FREE, unlimited, offline' };
  if (availability.groq)       return { provider: 'groq',       reason: 'Groq Llama 3.3 70B — FREE, 300+ tok/s' };
  if (availability.cf_workers) return { provider: 'cf_workers', reason: 'Kimi K2.5 — FREE, 256K ctx' };
  if (availability.nvidia_nim) return { provider: 'nvidia_nim', reason: 'Qwen3 235B — FREE, great reasoner' };
  if (availability.openrouter) return { provider: 'openrouter', reason: 'OpenRouter free pool — 27 models' };

  return { provider: 'ollama', reason: 'No cloud providers configured — run Ollama locally' };
}

// Export providers
export { ollama, OllamaProvider };

// Provider configurations
export const providerConfigs: Record<AIProvider, ProviderConfig> = {
  ollama: {
    name: 'Ollama', available: true, free: true, priority: 1,
  },
  groq: {
    name: 'Groq', available: true, free: true, priority: 2,
  },
  cf_workers: {
    name: 'Cloudflare Workers AI', available: true, free: true, priority: 3,
  },
  nvidia_nim: {
    name: 'NVIDIA NIM', available: true, free: true, priority: 4,
  },
  openrouter: {
    name: 'OpenRouter (free pool)', available: true, free: true, priority: 5,
  },
};
