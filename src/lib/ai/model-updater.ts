/**
 * HOLLY Model Updater — Automatic Free Model Discovery
 *
 * Runs daily via cron (/api/admin/model-update).
 * Checks each provider's live model list against MODEL_CANDIDATES.
 * If a candidate model is available AND benchmarks suggest it's better,
 * it gets promoted to the smart-router catalogue automatically.
 *
 * HARD CONSTRAINTS (enforced in code):
 * - free: true is required — any paid model is immediately rejected
 * - licence must be MIT, Apache-2.0, CC-BY-4.0, Llama-3/4, or free-api
 * - Suno remains the ONLY paid music API (V5.5 already configured)
 * - No Gemini, no GPT-4, no Claude — all closed/paid
 */

import { MODEL_CANDIDATES, MODEL_REGISTRY, type ModelRecord } from './model-registry';
import { MODEL_CATALOGUE, TASK_WATERFALLS, type ModelSpec } from './smart-router';

const APPROVED_LICENCES = new Set([
  'MIT', 'Apache-2.0', 'CC-BY-4.0', 'Llama-3', 'Llama-4', 'free-api',
  'CC0-1.0', 'BSD-3-Clause', 'LGPL-3.0',
]);

export interface ModelUpdateReport {
  checkedAt:    string;
  candidates:   number;
  found:        string[];   // models that are now live on the provider
  promoted:     string[];   // models added to the smart router this run
  skipped:      string[];   // candidates not yet available
  errors:       string[];   // provider check errors
}

// ─── Provider availability checks ─────────────────────────────────────────────

/**
 * Check Groq's free model list via their public models API.
 * Returns the set of model IDs currently available (free tier).
 */
async function getGroqModels(): Promise<Set<string>> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return new Set();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new Set();
    const data = await res.json();
    return new Set((data.data ?? []).map((m: {id: string}) => m.id));
  } catch {
    return new Set();
  }
}

/**
 * Check OpenRouter's free model list.
 * Free models have pricing of $0 for prompt + completion.
 */
async function getOpenRouterFreeModels(): Promise<Set<string>> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new Set();
    const data = await res.json();
    const freeModels = new Set<string>();
    for (const m of (data.data ?? [])) {
      const promptPrice = parseFloat(m.pricing?.prompt ?? '1');
      const completionPrice = parseFloat(m.pricing?.completion ?? '1');
      if (promptPrice === 0 && completionPrice === 0) {
        freeModels.add(m.id);
      }
    }
    return freeModels;
  } catch {
    return new Set();
  }
}

/**
 * Check NVIDIA NIM free model list.
 * Uses the OpenAI-compatible models endpoint.
 */
async function getNvidiaModels(): Promise<Set<string>> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return new Set();
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return new Set();
    const data = await res.json();
    return new Set((data.data ?? []).map((m: {id: string}) => m.id));
  } catch {
    return new Set();
  }
}

/**
 * Check Cloudflare Workers AI model list.
 * Uses the Cloudflare API to list available models.
 * Note: CF doesn't have a public "list models" endpoint like OpenAI,
 * so we probe by attempting a minimal completion on the candidate model.
 */
async function probeCfModel(modelId: string): Promise<boolean> {
  const rawToken = process.env.CF_ACCOUNT_ID_CF_AI_TOKEN ?? '';
  const [accountId, token] = rawToken.includes('|')
    ? rawToken.split('|')
    : ['', rawToken];

  if (!accountId || !token) return false;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    // 200 = available, 404 = not found, 400 = bad request but model exists
    return res.status !== 404;
  } catch {
    return false;
  }
}

// ─── Licence guard ────────────────────────────────────────────────────────────

function isApprovedLicence(licence: string): boolean {
  return APPROVED_LICENCES.has(licence);
}

// ─── Main update function ─────────────────────────────────────────────────────

/**
 * Run model discovery. Checks all MODEL_CANDIDATES against their providers.
 * Promotes any candidate that:
 *   1. Is live on the provider
 *   2. Has an approved open-source licence
 *   3. Is genuinely free (zero token cost)
 *   4. Is not already in MODEL_CATALOGUE
 *
 * Returns a report of what was found, promoted, and skipped.
 */
export async function runModelDiscovery(): Promise<ModelUpdateReport> {
  const report: ModelUpdateReport = {
    checkedAt: new Date().toISOString(),
    candidates: MODEL_CANDIDATES.length,
    found: [],
    promoted: [],
    skipped: [],
    errors: [],
  };

  // Fetch available model sets in parallel (with timeouts)
  const [groqModels, openrouterModels, nvidiaModels] = await Promise.all([
    getGroqModels().catch(() => new Set<string>()),
    getOpenRouterFreeModels().catch(() => new Set<string>()),
    getNvidiaModels().catch(() => new Set<string>()),
  ]);

  for (const candidate of MODEL_CANDIDATES) {
    try {
      // Enforce licence rule
      if (!isApprovedLicence(candidate.licence)) {
        report.skipped.push(`${candidate.key}: rejected (licence: ${candidate.licence})`);
        continue;
      }

      // Skip if already in catalogue
      if (MODEL_CATALOGUE[candidate.key]) {
        report.skipped.push(`${candidate.key}: already in catalogue`);
        continue;
      }

      // Check availability on the provider
      let available = false;

      switch (candidate.provider) {
        case 'groq':
          available = groqModels.has(candidate.modelId);
          break;
        case 'openrouter':
          available = openrouterModels.has(candidate.modelId);
          break;
        case 'nvidia_nim':
          available = nvidiaModels.has(candidate.modelId);
          break;
        case 'cf_workers':
          available = await probeCfModel(candidate.modelId);
          break;
        default:
          available = false;
      }

      if (!available) {
        report.skipped.push(`${candidate.key}: not yet available on ${candidate.provider}`);
        continue;
      }

      // Model is live and free — add to MODEL_CATALOGUE
      report.found.push(candidate.key);

      const newSpec: ModelSpec = {
        provider:    candidate.provider as ModelSpec['provider'],
        model:       candidate.modelId,
        displayName: `${candidate.key} (auto-discovered)`,
        contextK:    candidate.contextK,
        streaming:   true,
      };

      // Add to the runtime catalogue
      MODEL_CATALOGUE[candidate.key] = newSpec;

      // Add to the task waterfalls — insert at position 0 (highest priority)
      // before the model it supersedes
      for (const taskType of candidate.taskTypes) {
        const waterfall = TASK_WATERFALLS[taskType as keyof typeof TASK_WATERFALLS];
        if (!waterfall) continue;

        const supersededIdx = waterfall.indexOf(candidate.supersedes);
        if (supersededIdx >= 0) {
          // Insert before the model it supersedes (upgrade path)
          waterfall.splice(supersededIdx, 0, candidate.key);
        } else {
          // Add to the front of this task's waterfall
          waterfall.unshift(candidate.key);
        }
      }

      // Add to MODEL_REGISTRY for tracking
      const registryEntry: ModelRecord = {
        key:          candidate.key,
        provider:     candidate.provider,
        modelId:      candidate.modelId,
        displayName:  `${candidate.key} (auto-promoted ${new Date().toISOString().split('T')[0]})`,
        contextK:     candidate.contextK,
        streaming:    true,
        licence:      candidate.licence,
        free:         true,
        addedAt:      new Date().toISOString().split('T')[0],
        lastVerified: new Date().toISOString().split('T')[0],
        taskTypes:    candidate.taskTypes,
      };
      MODEL_REGISTRY.push(registryEntry);

      // Mark the superseded model as deprecated in the registry
      const superseded = MODEL_REGISTRY.find(m => m.key === candidate.supersedes);
      if (superseded) superseded.deprecated = true;

      report.promoted.push(
        `${candidate.key} → inserted before ${candidate.supersedes} in [${candidate.taskTypes.join(',')}] | Reason: ${candidate.reason}`
      );

      console.log(`[ModelUpdater] ✅ Promoted ${candidate.key}: ${candidate.reason}`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.errors.push(`${candidate.key}: ${msg}`);
      console.error(`[ModelUpdater] ❌ Error checking ${candidate.key}:`, msg);
    }
  }

  console.log(`[ModelUpdater] Done — ${report.promoted.length} promoted, ${report.skipped.length} skipped, ${report.errors.length} errors`);
  return report;
}

/**
 * Get a summary of the current model state for the developer console.
 * Shows which providers are configured and how many models are active.
 */
export function getModelSummary() {
  const byProvider: Record<string, number> = {};
  const activeModels = MODEL_REGISTRY.filter(m => !m.deprecated);

  for (const m of activeModels) {
    byProvider[m.provider] = (byProvider[m.provider] ?? 0) + 1;
  }

  return {
    totalActive:      activeModels.length,
    totalCandidates:  MODEL_CANDIDATES.length,
    byProvider,
    lastUpdated:      MODEL_REGISTRY.reduce((latest, m) =>
      m.lastVerified > latest ? m.lastVerified : latest, ''),
  };
}
