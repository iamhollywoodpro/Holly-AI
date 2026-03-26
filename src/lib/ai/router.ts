/**
 * HOLLY Multi-Model Router — Phase 4B
 *
 * Routing priority (highest → lowest):
 *  1. local-qwen-7b   — user explicitly requests unlimited/offline/Qwen
 *  2. web-llm         — user explicitly requests browser-only / private
 *  3. ollama          — Ollama is healthy AND message is local-suitable
 *                       (short general chat, privacy-first, rate-limit fallback)
 *  4. google-gemini   — complex / long / vision / architecture tasks
 *  5. groq-llama-3.3  — default: fast general chat via Groq free tier
 *
 * Ollama routing criteria:
 *   • OLLAMA_ENABLED=true is set  OR  no Groq key present
 *   • message is NOT a long/complex/vision task (those stay on Gemini)
 *   • Ollama health is cached as available (non-blocking; falls back to Groq if not)
 */

import { ollamaService } from './ollama-service';

export type AIModel =
  | 'groq-llama-3.3'
  | 'google-gemini-2.0'
  | 'web-llm'
  | 'local-qwen-7b'
  | 'ollama';

export interface RoutingResult {
  model: AIModel;
  reason: string;
  ollamaModel?: string; // populated when model === 'ollama'
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

    // ── 3. Complex / long / vision / architecture → Gemini ───────────────────
    const isComplex =
      input.includes('refactor') ||
      input.includes('architecture') ||
      input.includes('complex logic') ||
      input.includes('fix these bugs') ||
      input.includes('optimize') ||
      input.includes('analyze') ||
      input.includes('summarize') ||
      input.includes('image') ||
      message.length > 500;

    if (isComplex) {
      return {
        model: 'google-gemini-2.0',
        reason: 'Complex/large context task → Gemini free tier.',
      };
    }

    // ── 4. Ollama local fallback (if enabled & healthy) ───────────────────────
    const ollamaEnabled =
      process.env.OLLAMA_ENABLED === 'true' || !process.env.GROQ_API_KEY;

    if (ollamaEnabled) {
      // Use cached health — never blocks the hot path
      const health = ollamaService['_cachedHealth'];
      if (health?.available && health.preferredModel) {
        return {
          model: 'ollama',
          reason: `Ollama available (${health.preferredModel}) → local inference.`,
          ollamaModel: health.preferredModel,
        };
      }
    }

    // ── 5. Default: Groq (fast, free tier) ───────────────────────────────────
    return {
      model: 'groq-llama-3.3',
      reason: 'General chat → Groq Llama-3.3 free tier.',
    };
  }

  /**
   * Async version of route() — checks Ollama health live if not cached.
   * Use this in the chat route to get an accurate first-request Ollama result.
   */
  static async routeAsync(message: string): Promise<RoutingResult> {
    const input = message.toLowerCase();

    // Same explicit overrides as synchronous route
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

    const isComplex =
      input.includes('refactor') || input.includes('architecture') ||
      input.includes('complex logic') || input.includes('optimize') ||
      input.includes('analyze') || input.includes('summarize') ||
      input.includes('image') || message.length > 500;

    if (isComplex) {
      return { model: 'google-gemini-2.0', reason: 'Complex/large context → Gemini.' };
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
