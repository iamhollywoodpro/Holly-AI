/**
 * HOLLY Model Health Monitor
 *
 * Tracks the health of INDIVIDUAL MODELS (not just providers).
 * When a model returns 404/deprecated, it's marked unhealthy and
 * Holly automatically falls back to a working alternative.
 *
 * This prevents the qwen/qwen3-32b situation where Groq deprecated
 * the model and every tool call broke silently.
 *
 * Usage:
 *   import { modelHealth } from '@/lib/ai/model-health-monitor';
 *
 *   // Before using a model:
 *   if (!modelHealth.isHealthy('groq', 'llama-3.3-70b-versatile')) {
 *     const alt = modelHealth.getAlternative('groq', 'tool_calling');
 *     // use alt instead
 *   }
 *
 *   // After a failed API call:
 *   modelHealth.markUnhealthy('groq', 'qwen/qwen3-32b', '404 model not found');
 *
 *   // When a call succeeds:
 *   modelHealth.markHealthy('groq', 'llama-3.3-70b-versatile');
 */

import { logger } from '../logging/structured-logger';

interface ModelHealthEntry {
  healthy: boolean;
  lastCheck: Date;
  lastSuccess?: Date;
  error?: string;
  consecutiveFailures: number;
}

// Alternative models for each provider+use_case
// When a model fails, Holly automatically uses the next one in the list
const MODEL_FALLBACKS: Record<string, Record<string, string[]>> = {
  groq: {
    // For tool calling (native function calling support)
    tool_calling: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
    // For chat/speed
    speed: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
    // For coding
    coding: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
  },
  arcee: {
    tool_calling: [
      'Trinity-1',
    ],
  },
  // Holly's own brain doesn't need fallbacks — it's self-hosted
  holly_own: {
    chat: ['holly-brain-v40', 'holly-brain-v35'],
  },
};

export class ModelHealthMonitor {
  private health = new Map<string, ModelHealthEntry>();
  private maxConsecutiveFailures = 3;

  /**
   * Get a healthy model for a given provider and use case.
   * Automatically falls back to alternatives if the primary is unhealthy.
   *
   * @returns The first healthy model, or the primary if all are unhealthy
   *          (better to try and fail than to not try at all)
   */
  getHealthyModel(provider: string, useCase: string): string {
    const fallbacks = MODEL_FALLBACKS[provider]?.[useCase];
    if (!fallbacks || fallbacks.length === 0) {
      // No fallbacks defined — return a reasonable default
      if (provider === 'groq') return 'llama-3.3-70b-versatile';
      return '';
    }

    for (const model of fallbacks) {
      const key = `${provider}:${model}`;
      const entry = this.health.get(key);

      if (!entry || entry.healthy) {
        // Not tracked yet or healthy — use it
        return model;
      }

      // If it failed but not enough times, still try it
      // (might be a transient error)
      if (entry.consecutiveFailures < this.maxConsecutiveFailures) {
        return model;
      }

      // This model is confirmed broken — try next
      logger.warn('ModelHealth', `Model ${model} on ${provider} is unhealthy (${entry.error}), trying fallback`, {
        provider, model, useCase, consecutiveFailures: entry.consecutiveFailures,
      });
    }

    // All fallbacks are unhealthy — return the first one anyway
    // Better to attempt and get a real error than to refuse to respond
    logger.error('ModelHealth', `All fallback models for ${provider}/${useCase} are unhealthy!`, {
      provider, useCase, fallbacks,
    });
    return fallbacks[0];
  }

  /**
   * Mark a model as unhealthy after a failure.
   * Call this when an API returns 404, model_not_found, or similar.
   */
  markUnhealthy(provider: string, model: string, error: string): void {
    const key = `${provider}:${model}`;
    const existing = this.health.get(key);

    const consecutiveFailures = (existing?.consecutiveFailures || 0) + 1;
    const isConfirmedBroken = consecutiveFailures >= this.maxConsecutiveFailures;

    this.health.set(key, {
      healthy: false,
      lastCheck: new Date(),
      lastSuccess: existing?.lastSuccess,
      error,
      consecutiveFailures,
    });

    if (isConfirmedBroken) {
      logger.error('ModelHealth', `Model ${model} on ${provider} marked UNHEALTHY after ${consecutiveFailures} failures`, {
        provider, model, error,
      });
      // Log the fallback Holly will use
      const useCase = this.inferUseCase(provider, model);
      const alt = this.getHealthyModel(provider, useCase);
      logger.info('ModelHealth', `Falling back to ${alt} for ${useCase}`, {
        provider, brokenModel: model, fallback: alt,
      });
    } else {
      logger.warn('ModelHealth', `Model ${model} on ${provider} failure ${consecutiveFailures}/${this.maxConsecutiveFailures}`, {
        provider, model, error,
      });
    }
  }

  /**
   * Mark a model as healthy after a successful call.
   */
  markHealthy(provider: string, model: string): void {
    const key = `${provider}:${model}`;
    this.health.set(key, {
      healthy: true,
      lastCheck: new Date(),
      lastSuccess: new Date(),
      consecutiveFailures: 0,
    });
  }

  /**
   * Check if a specific model is healthy.
   */
  isHealthy(provider: string, model: string): boolean {
    const key = `${provider}:${model}`;
    const entry = this.health.get(key);
    if (!entry) return true; // Unknown = assume healthy until proven otherwise
    return entry.healthy;
  }

  /**
   * Get all unhealthy models (for monitoring/dashboard).
   */
  getUnhealthyModels(): Array<{ provider: string; model: string; error: string; lastCheck: Date }> {
    const unhealthy: Array<{ provider: string; model: string; error: string; lastCheck: Date }> = [];
    for (const [key, entry] of this.health.entries()) {
      if (!entry.healthy && entry.consecutiveFailures >= this.maxConsecutiveFailures) {
        const [provider, model] = key.split(':');
        unhealthy.push({ provider, model, error: entry.error || 'unknown', lastCheck: entry.lastCheck });
      }
    }
    return unhealthy;
  }

  /**
   * Infer the use case from model/provider (for fallback lookup).
   */
  private inferUseCase(provider: string, model: string): string {
    // Check if this model appears in any use case list
    for (const [useCase, models] of Object.entries(MODEL_FALLBACKS[provider] || {})) {
      if (models.includes(model)) return useCase;
    }
    return 'tool_calling'; // default
  }
}

// Singleton — shared across all requests
export const modelHealth = new ModelHealthMonitor();
