/**
 * GET /api/v1/status — Phase 8A: Provider health & routing status
 *
 * Public endpoint (no API key required) showing which free AI providers
 * are currently configured and their routing information.
 *
 * All providers listed are 100% free tiers — no paid plans, no token billing.
 */

import { NextResponse } from 'next/server';
import { PROVIDERS } from '@/lib/ai/providers/free-providers';
import { TASK_WATERFALLS, MODEL_CATALOGUE } from '@/lib/ai/smart-router';

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
    models:    ['Llama 3.3 70B (300+ tok/s)', 'Llama 3.1 8B Instant', 'DeepSeek R1 70B'],
    tasks:     ['speed', 'creative', 'fallback'],
    freeQuota: '14,400 req/day · 6,000 TPM · no credit card',
    signupUrl: 'https://console.groq.com/keys',
  },
  cf_workers: {
    id:        'cf_workers',
    name:      'Cloudflare Workers AI',
    models:    ['Kimi K2.5 (256K ctx, best free coder)', 'Llama 3.3 70B FP8', 'Qwen3 32B'],
    tasks:     ['coding', 'agent', 'long_context'],
    freeQuota: '~10,000 neurons/month free · prefix caching',
    signupUrl: 'https://dash.cloudflare.com/',
  },
  nvidia_nim: {
    id:        'nvidia_nim',
    name:      'NVIDIA NIM',
    models:    ['Qwen3 235B-A22B (best free reasoner)', 'DeepSeek R1', 'Llama 3.3 70B', 'Mistral Small 24B'],
    tasks:     ['reasoning', 'agent'],
    freeQuota: '~40 RPM · generous monthly quota · no credit card for free models',
    signupUrl: 'https://build.nvidia.com/',
  },
  openrouter: {
    id:        'openrouter',
    name:      'OpenRouter (free pool)',
    models:    ['Qwen3 Coder 480B', 'Mistral Small 3.1 24B', 'Qwen3 VL 30B (vision)', 'Llama 3.3 70B', '+23 more'],
    tasks:     ['creative', 'vision', 'fallback'],
    freeQuota: '20 RPM · 200 RPD · 27 free models · no credit card',
    signupUrl: 'https://openrouter.ai/keys',
  },
  ollama: {
    id:        'ollama',
    name:      'Ollama (local)',
    models:    ['Any model you pull (llama3.2, mistral, qwen2.5, deepseek-r1, etc.)'],
    tasks:     ['local', 'privacy-first'],
    freeQuota: 'Unlimited · zero cost · fully offline',
    signupUrl: 'https://ollama.ai/download',
  },
};

export async function GET() {
  const providers: ProviderInfo[] = Object.entries(PROVIDER_META).map(([id, meta]) => ({
    ...meta,
    configured: PROVIDERS[id as keyof typeof PROVIDERS]?.isConfigured() ?? false,
  }));

  const configuredCount = providers.filter(p => p.configured).length;

  // Build routing matrix
  const routingMatrix: Record<string, string[]> = {};
  for (const [task, keys] of Object.entries(TASK_WATERFALLS)) {
    routingMatrix[task] = (keys as string[])
      .map((k: string) => MODEL_CATALOGUE[k as keyof typeof MODEL_CATALOGUE]?.displayName)
      .filter(Boolean) as string[];
  }

  return NextResponse.json({
    phase:             '8A',
    status:            configuredCount === 0 ? 'degraded' : configuredCount >= 2 ? 'healthy' : 'partial',
    providers_total:   providers.length,
    providers_active:  configuredCount,
    providers,
    routing_matrix:    routingMatrix,
    cascade_strategy:  'Task-aware routing with automatic fallback on 429/5xx. All providers are 100% free.',
    note: configuredCount === 0
      ? 'No providers configured. Add any free API key to .env — no paid tier needed.'
      : `${configuredCount} provider(s) active. HOLLY cascades through them automatically when rate limits hit.`,
  });
}
