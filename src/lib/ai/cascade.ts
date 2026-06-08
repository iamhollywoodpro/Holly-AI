/**
 * HOLLY Cascade Executor — Phase 8A
 *
 * Wraps the SmartRouter + provider adapters.
 * Usage:
 *
 *   const result = await smartRoute(userMessage);
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

// Patterns that indicate a model refused to answer (safety filter triggered)
const REFUSAL_PATTERNS = [
  /i\s*(?:can't|cannot|am unable to|won't|will not)\s+(?:help|assist|provide|generate|create|engage|continue|participate|do that|fulfill|comply|respond)/i,
  /i'm\s+sorry,?\s*(?:but\s+)?(?:i\s+)?(?:can't|cannot|am unable to|won't|will not)/i,
  /i\s+(?:must|have to)\s+(?:decline|refuse|respectfully)/i,
  /(?:this|that)\s+(?:goes|is)\s+(?:against|beyond|outside)\s+(?:my|the)\s+(?:guidelines|policy|rules|boundaries)/i,
  /i'm\s+(?:here|designed|built)\s+to\s+help\s+with\s+other\s+topics/i,
  /let's\s+(?:explore|focus\s+on|talk\s+about)\s+something\s+else/i,
  /is\s+there\s+anything\s+else\s+i\s+can\s+help/i,
  /i\s+(?:don't|do\s+not)\s+(?:feel\s+)?comfortable\s+(?:continuing|discussing|engaging)/i,
];

function isRefusalResponse(text: string): boolean {
  // Check first 300 chars — refusals always come at the start
  const head = text.slice(0, 300).trim();
  if (!head) return false;
  return REFUSAL_PATTERNS.some(p => p.test(head));
}

/**
 * Iterate through the waterfall, streaming tokens from the first provider
 * that succeeds.  Yields string token chunks.
 * Detects model refusals and tries the next model if the current one refuses.
 */
export async function* cascade(
  waterfall:  ModelSpec[],
  messages:   ChatMessage[],
  opts:       CascadeOptions = {},
): AsyncGenerator<string, void, unknown> {
  let lastError: Error | null = null;

  const CASCADE_DEADLINE = 60_000;
  const startTime = Date.now();

  for (let i = 0; i < waterfall.length; i++) {
    if (Date.now() - startTime > CASCADE_DEADLINE) {
      console.warn('[Cascade] ⏱️ Hard deadline reached, aborting');
      break;
    }

    const spec     = waterfall[i];
    const provider = PROVIDERS[spec.provider];

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

      // Buffer the response to check for refusals before yielding
      let buffered = '';
      let firstChunk = true;
      let detectedRefusal = false;

      for await (const chunk of stream) {
        buffered += chunk;
        if (firstChunk) {
          console.log(`[Cascade] ✅ First token from ${spec.displayName}`);
          firstChunk = false;
        }
        // Check for refusal early — models often refuse in the first 30–50 chars
        // (e.g. "I'm sorry, but I can't continue with that." = 44 chars).
        // Lowered from 100 to 30 to catch short refusals that were slipping through.
        if (!detectedRefusal && buffered.length >= 30) {
          if (isRefusalResponse(buffered)) {
            detectedRefusal = true;
            console.warn(`[Cascade] 🚫 ${spec.displayName} refused — trying next model`);
            break; // break out of stream loop, will continue to next waterfall entry
          }
        }
        // If we have enough text and no refusal detected, start streaming
        if (!detectedRefusal && buffered.length >= 100) {
          yield buffered;
          buffered = '';
        }
      }

      if (detectedRefusal) {
        // Model refused — try next model in waterfall
        lastError = new Error(`${spec.displayName} refused the request`);
        opts.onModelFailed?.(spec, lastError, i);
        continue; // next waterfall entry
      }

      // Yield any remaining buffered text
      if (buffered.length > 0) {
        yield buffered;
      }
      console.log(`[Cascade] ✅ Completed with ${spec.displayName}`);
      return;

    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRateLimit = /429|rate.?limit|quota|too many/i.test(lastError.message);
      const emoji = isRateLimit ? '⏳' : '❌';

      console.warn(`[Cascade] ${emoji} ${spec.displayName} failed: ${lastError.message}`);
      opts.onModelFailed?.(spec, lastError, i);
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
