/**
 * HOLLY Cascade Executor — Phase 8A
 *
 * Wraps the SmartRouter + provider adapters.
 * Usage:
 *
 *   const result = smartRoute(userMessage);
 *   for await (const chunk of cascade(result.waterfall, messages, controller, opts)) {
 *     controller.enqueue(encode(chunk));
 *   }
 *
 * The cascade tries each ModelSpec in waterfall order.
 * If a provider throws (429 rate limit, 5xx, network error, not configured),
 * it logs the failure and advances to the next model.
 * If all models fail, it throws the last error.
 */

import { type ModelSpec } from './smart-router';
import { PROVIDERS, type ChatMessage, type StreamOptions } from './providers/free-providers';

export interface CascadeOptions extends StreamOptions {
  onModelSelected?: (spec: ModelSpec, attempt: number) => void;
  onModelFailed?:   (spec: ModelSpec, error: Error, attempt: number) => void;
  sessionId?:       string;
}

/**
 * Iterate through the waterfall, streaming tokens from the first provider
 * that succeeds.  Yields string token chunks.
 */
export async function* cascade(
  waterfall:  ModelSpec[],
  messages:   ChatMessage[],
  opts:       CascadeOptions = {},
): AsyncGenerator<string, void, unknown> {
  let lastError: Error | null = null;

  for (let i = 0; i < waterfall.length; i++) {
    const spec     = waterfall[i];
    const provider = PROVIDERS[spec.provider];

    // Skip if provider is not configured (missing API key)
    if (!provider.isConfigured()) {
      console.log(`[Cascade] Skipping ${spec.displayName} — not configured`);
      continue;
    }

    opts.onModelSelected?.(spec, i);

    try {
      console.log(`[Cascade] 🎯 Attempt ${i + 1}/${waterfall.length}: ${spec.displayName}`);

      const stream = provider.streamChat(messages, spec.model, {
        temperature: opts.temperature,
        maxTokens:   opts.maxTokens,
        tools:       opts.tools,
        sessionId:   opts.sessionId,
      });

      // Yield all tokens — if this throws mid-stream, we fall through to next
      yield* stream;
      console.log(`[Cascade] ✅ Completed with ${spec.displayName}`);
      return; // success — stop cascade

    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRateLimit = /429|rate.?limit|quota|too many/i.test(lastError.message);
      const emoji = isRateLimit ? '⏳' : '❌';

      console.warn(`[Cascade] ${emoji} ${spec.displayName} failed: ${lastError.message}`);
      opts.onModelFailed?.(spec, lastError, i);

      // Continue to next in waterfall
    }
  }

  throw lastError ?? new Error('All models in waterfall failed or are not configured');
}

/**
 * Collect the full response from a cascade into a single string (non-streaming).
 */
export async function cascadeCollect(
  waterfall: ModelSpec[],
  messages:  ChatMessage[],
  opts:      CascadeOptions = {},
): Promise<{ text: string; model: ModelSpec }> {
  let lastError: Error | null = null;

  for (let i = 0; i < waterfall.length; i++) {
    const spec     = waterfall[i];
    const provider = PROVIDERS[spec.provider];

    if (!provider.isConfigured()) continue;

    try {
      let fullText = '';
      const stream = provider.streamChat(messages, spec.model, opts);
      for await (const chunk of stream) {
        fullText += chunk;
      }
      return { text: fullText, model: spec };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Cascade] ${spec.displayName} failed (collect): ${lastError.message}`);
    }
  }

  throw lastError ?? new Error('All models failed');
}

/**
 * Convenience: check which providers are currently configured.
 * Useful for the status page / admin dashboard.
 */
export function getConfiguredProviders(): string[] {
  return Object.entries(PROVIDERS)
    .filter(([, p]) => p.isConfigured())
    .map(([id]) => id);
}
