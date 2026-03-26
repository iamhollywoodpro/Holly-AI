/**
 * HOLLY Multi-Model Router — Phase 4B (Gemini-free)
 *
 * Legacy synchronous router kept for backwards-compatibility.
 * New code should use src/lib/ai/smart-router.ts + cascade.ts.
 *
 * Routing priority (highest → lowest):
 *  1. local-qwen-7b   — user explicitly requests unlimited/offline/Qwen
 *  2. web-llm         — user explicitly requests browser-only / private
 *  3. ollama          — Ollama is healthy AND message is local-suitable
 *  4. groq-llama-3.3  — default: fast general chat via Groq free tier
 *
 * NOTE: google-gemini has been removed. All routing now uses free-only providers.
 */

import { ollamaService } from './ollama-service';

export type AIModel =
  | 'groq-llama-3.3'
  | 'web-llm'
  | 'local-qwen-7b'
  | 'ollama';

export interface RoutingResult {
  model: AIModel;
  reason: string;
  ollamaModel?: string;
}

export class ModelRouter {
  /**
   * Determine the best model for the given user message.
   * Ollama check is synchronous using cached health state (no await).
   */
  static route(message: string): RoutingResult {
    const input = message.toLowerCase();

    // ── 1. User explicitly wants local unlimited / Qwen ──────────────────────
    if (
      input.includes('unlimited') ||
      input.includes('full ram') ||
      input.includes('qwen') ||
      input.includes('no limits')
    ) {
      return {
        model: 'local-qwen-7b',
        reason: 'User requested unlimited/full-RAM inference → local Qwen 2.5 Coder.',
      };
    }

    // ── 2. User explicitly wants browser-only / private / offline ────────────
    if (
      input.includes('private') ||
      input.includes('offline') ||
      input.includes('browser-only') ||
      input.includes('no-network') ||
      input.includes('in-browser')
    ) {
      return {
        model: 'web-llm',
        reason: 'User requested in-browser inference → WebLLM Qwen 2.5 7B.',
      };
    }

    // ── 3. Ollama local fallback (if enabled & healthy) ───────────────────────
    const ollamaEnabled =
      process.env.OLLAMA_ENABLED === 'true' || !process.env.GROQ_API_KEY;

    if (ollamaEnabled) {
      const health = ollamaService['_cachedHealth'];
      if (health?.available && health.preferredModel) {
        return {
          model: 'ollama',
          reason: `Ollama available (${health.preferredModel}) → local inference.`,
          ollamaModel: health.preferredModel,
        };
      }
    }

    // ── 4. Default: Groq (fast, free tier) ───────────────────────────────────
    return {
      model: 'groq-llama-3.3',
      reason: 'General chat → Groq Llama-3.3 free tier.',
    };
  }

  /**
   * Async version of route() — checks Ollama health live if not cached.
   */
  static async routeAsync(message: string): Promise<RoutingResult> {
    const input = message.toLowerCase();

    if (
      input.includes('unlimited') || input.includes('full ram') ||
      input.includes('qwen') || input.includes('no limits')
    ) {
      return { model: 'local-qwen-7b', reason: 'User requested unlimited/full-RAM inference.' };
    }
    if (
      input.includes('private') || input.includes('offline') ||
      input.includes('browser-only') || input.includes('no-network') ||
      input.includes('in-browser')
    ) {
      return { model: 'web-llm', reason: 'User requested in-browser inference.' };
    }

    const ollamaEnabled =
      process.env.OLLAMA_ENABLED === 'true' || !process.env.GROQ_API_KEY;

    if (ollamaEnabled) {
      const healthy = await ollamaService.isHealthy();
      if (healthy) {
        const health = await ollamaService.getHealth();
        return {
          model: 'ollama',
          reason: `Ollama available (${health.preferredModel}) → local inference.`,
          ollamaModel: health.preferredModel || undefined,
        };
      }
    }

    return { model: 'groq-llama-3.3', reason: 'Default → Groq Llama-3.3.' };
  }
}
