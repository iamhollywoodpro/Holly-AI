/**
 * GET /api/v1/status — Phase 8A: Provider health & routing status
 *
 * Public endpoint (no API key required) showing which free AI providers
 * are currently configured and their routing information.
 *
 * Response:
 *   {
 *     phase: "8A",
 *     providers: [
 *       { id, name, configured, models, tasks, freeQuota, signupUrl }
 *     ],
 *     routing_matrix: { task: primary_provider_name[] }
 *   }
 */

import { NextResponse } from 'next/server';
import { PROVIDERS } from '@/src/lib/ai/providers/free-providers';
import { TASK_WATERFALLS, MODEL_CATALOGUE } from '@/src/lib/ai/smart-router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProviderInfo {
  id:          string;
  name:        string;
  configured:  boolean;
  models:      string[];
  tasks:       string[];
  freeQuota:   string;
  signupUrl:   string;
}

const PROVIDER_META: Record<string, Omit<ProviderInfo, 'configured'>> = {
  groq: {
    id:        'groq',
    name:      'Groq',
    models:    ['Llama 3.3 70B', 'Llama 3.1 8B Instant', 'DeepSeek R1 70B'],
    tasks:     ['speed', 'creative', 'fallback'],
    freeQuota: '14,400 req/day · 6,000 TPM · no credit card',
    signupUrl: 'https://console.groq.com/keys',
  },
  gemini: {
    id:        'gemini',
    name:      'Google Gemini',
    models:    ['Gemini 2.5 Flash (1M ctx)', 'Gemini 2.5 Flash-Lite'],
    tasks:     ['long_context', 'vision'],
    freeQuota: '15 RPM · 1,000 RPD · 1M token context',
    signupUrl: 'https://aistudio.google.com/app/apikey',
  },
  cf_workers: {
    id:        'cf_workers',
    name:      'Cloudflare Workers AI',
    models:    ['Kimi K2.5 (256K ctx)', 'Llama 4 Scout', 'Qwen3 32B'],
    tasks:     ['coding', 'agent'],
    freeQuota: '10,000 neurons/month free · prefix caching',
    signupUrl: 'https://dash.cloudflare.com/',
  },
  nvidia_nim: {
    id:        'nvidia_nim',
    name:      'NVIDIA NIM',
    models:    ['Qwen3 235B-A22B', 'DeepSeek R1', 'Llama 3.3 70B'],
    tasks:     ['reasoning', 'agent'],
    freeQuota: '~40 RPM · generous monthly quota',
    signupUrl: 'https://build.nvidia.com/',
  },
  openrouter: {
    id:        'openrouter',
    name:      'OpenRouter (free pool)',
    models:    ['Qwen3 Coder 480B', 'Mistral Small 3.1 24B', 'Llama 3.3 70B', '+24 more'],
    tasks:     ['creative', 'fallback'],
    freeQuota: '20 RPM · 200 RPD · 27 free models',
    signupUrl: 'https://openrouter.ai/keys',
  },
  ollama: {
    id:        'ollama',
    name:      'Ollama (local)',
    models:    ['Any model you pull (llama3.2, mistral, qwen2.5, etc.)'],
    tasks:     ['local', 'privacy-first'],
    freeQuota: 'Unlimited · zero cost · fully offline',
    signupUrl: 'https://ollama.ai/download',
  },
};

export async function GET() {
  // Check which providers are configured
  const providers: ProviderInfo[] = Object.entries(PROVIDER_META).map(([id, meta]) => ({
    ...meta,
    configured: PROVIDERS[id as keyof typeof PROVIDERS]?.isConfigured() ?? false,
  }));

  const configuredCount = providers.filter(p => p.configured).length;

  // Build routing matrix — map each task to its waterfall of display names
  const routingMatrix: Record<string, string[]> = {};
  for (const [task, keys] of Object.entries(TASK_WATERFALLS)) {
    routingMatrix[task] = keys
      .map(k => MODEL_CATALOGUE[k]?.displayName)
      .filter(Boolean) as string[];
  }

  return NextResponse.json({
    phase:             '8A',
    status:            configuredCount === 0 ? 'degraded' : configuredCount >= 2 ? 'healthy' : 'partial',
    providers_total:   providers.length,
    providers_active:  configuredCount,
    providers,
    routing_matrix:    routingMatrix,
    cascade_strategy:  'Task-aware routing with automatic fallback on 429/5xx',
    note: configuredCount === 0
      ? 'No providers configured. Add API keys to .env — all are free tiers.'
      : `${configuredCount} provider(s) active. HOLLY will cascade through them automatically.`,
  });
}
