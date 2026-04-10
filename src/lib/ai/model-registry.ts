/**
 * HOLLY Model Registry — Self-Updating Free Model Catalogue
 *
 * Holly monitors each provider's free model list and automatically
 * promotes newer/better models when they become available.
 *
 * STRICT RULES (never break these):
 * 1. FREE ONLY — no token billing, no paid tiers
 * 2. OPEN SOURCE / MIT / Apache 2.0 / CC-BY only — no proprietary closed weights
 * 3. SUNO is the ONLY exception (paid API) — music generation is approved
 * 4. Models are discovered via provider APIs (Groq, OpenRouter, Cloudflare, NVIDIA NIM)
 * 5. Holly can ADD or PROMOTE models; she cannot remove a working model
 *    without confirming a better replacement is live on the same provider
 *
 * Provider free-tier status (as of 2025-04):
 *   Groq          — free tier, 14,400 req/day, top-tier speed (300+ tok/s)
 *   Cloudflare AI — free tier, 10,000 neurons/day, best for coding (Kimi K2.5)
 *   NVIDIA NIM    — free tier, 1,000 req/day, best for reasoning (Qwen3 235B)
 *   OpenRouter    — free tier, 200 req/day across 27+ free models
 *   Ollama        — unlimited, fully local, no network cost
 */

export interface ModelRecord {
  key:           string;        // catalogue key  e.g. 'groq:llama-3.3-70b'
  provider:      string;        // 'groq' | 'cf_workers' | 'nvidia_nim' | 'openrouter' | 'ollama'
  modelId:       string;        // provider's model ID string
  displayName:   string;        // internal name (NEVER shown to user)
  contextK:      number;        // context window in thousands of tokens
  streaming:     boolean;
  licence:       string;        // MUST be 'MIT' | 'Apache-2.0' | 'CC-BY-4.0' | 'Llama-3' | 'free-api'
  free:          boolean;       // MUST be true
  addedAt:       string;        // ISO date when added to Holly
  lastVerified:  string;        // ISO date of last successful ping
  taskTypes:     string[];      // task types this model handles
  benchmarks?: {
    mmlu?:       number;        // MMLU score 0–100
    humaneval?:  number;        // HumanEval score 0–100
    math?:       number;        // MATH score 0–100
    contextK?:   number;        // verified context window
  };
  supersedes?:   string;        // key of the model this replaces
  deprecated?:   boolean;       // true when a better replacement exists
}

/**
 * The canonical free-model registry.
 * This is the SOURCE OF TRUTH for Holly's routing decisions.
 * The smart-router reads MODEL_CATALOGUE which is seeded from this registry.
 */
export const MODEL_REGISTRY: ModelRecord[] = [
  // ─── Groq ────────────────────────────────────────────────────────────────
  {
    key:          'groq:llama-3.3-70b',
    provider:     'groq',
    modelId:      'llama-3.3-70b-versatile',
    displayName:  'Llama 3.3 70B (Groq)',
    contextK:     128,
    streaming:    true,
    licence:      'Llama-3',
    free:         true,
    addedAt:      '2024-12-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['speed', 'creative', 'agent'],
    benchmarks:   { mmlu: 86, humaneval: 72 },
  },
  {
    key:          'groq:llama-3.1-8b',
    provider:     'groq',
    modelId:      'llama-3.1-8b-instant',
    displayName:  'Llama 3.1 8B Instant (Groq)',
    contextK:     128,
    streaming:    true,
    licence:      'Llama-3',
    free:         true,
    addedAt:      '2024-07-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['speed'],
    benchmarks:   { mmlu: 73 },
  },
  {
    key:          'groq:deepseek-r1-70b',
    provider:     'groq',
    modelId:      'deepseek-r1-distill-llama-70b',
    displayName:  'DeepSeek R1 70B (Groq)',
    contextK:     128,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2025-01-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['reasoning', 'coding'],
    benchmarks:   { mmlu: 88, math: 86 },
  },
  {
    key:          'groq:llama-3.3-70b-specdec',
    provider:     'groq',
    modelId:      'llama-3.3-70b-specdec',
    displayName:  'Llama 3.3 70B SpecDec (Groq)',
    contextK:     8,
    streaming:    true,
    licence:      'Llama-3',
    free:         true,
    addedAt:      '2025-01-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['speed'],
  },
  // ─── Cloudflare Workers AI ────────────────────────────────────────────────
  {
    key:          'cf:kimi-k2.5',
    provider:     'cf_workers',
    modelId:      '@cf/moonshotai/kimi-k2.5',
    displayName:  'Kimi K2.5 (Cloudflare)',
    contextK:     256,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2025-02-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['coding', 'long_context', 'agent'],
    benchmarks:   { mmlu: 87, humaneval: 85, contextK: 256 },
  },
  {
    key:          'cf:llama-3.3-70b',
    provider:     'cf_workers',
    modelId:      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    displayName:  'Llama 3.3 70B (Cloudflare)',
    contextK:     128,
    streaming:    true,
    licence:      'Llama-3',
    free:         true,
    addedAt:      '2024-12-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['speed', 'creative'],
  },
  {
    key:          'cf:qwen3-32b',
    provider:     'cf_workers',
    modelId:      '@cf/qwen/qwen3-32b',
    displayName:  'Qwen3 32B (Cloudflare)',
    contextK:     32,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2025-04-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['reasoning', 'coding'],
    benchmarks:   { mmlu: 85 },
  },
  // ─── NVIDIA NIM ───────────────────────────────────────────────────────────
  {
    key:          'nvidia:qwen3-235b',
    provider:     'nvidia_nim',
    modelId:      'qwen/qwen3-235b-a22b',
    displayName:  'Qwen3 235B (NVIDIA)',
    contextK:     262,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2025-04-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['reasoning', 'long_context', 'coding'],
    benchmarks:   { mmlu: 91, humaneval: 90, math: 88 },
  },
  {
    key:          'nvidia:deepseek-r1',
    provider:     'nvidia_nim',
    modelId:      'deepseek-ai/deepseek-r1',
    displayName:  'DeepSeek R1 (NVIDIA)',
    contextK:     128,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2025-01-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['reasoning'],
    benchmarks:   { mmlu: 90, math: 90 },
  },
  {
    key:          'nvidia:llama-3.3-70b',
    provider:     'nvidia_nim',
    modelId:      'meta/llama-3.3-70b-instruct',
    displayName:  'Llama 3.3 70B (NVIDIA)',
    contextK:     128,
    streaming:    true,
    licence:      'Llama-3',
    free:         true,
    addedAt:      '2024-12-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['speed', 'creative'],
  },
  {
    key:          'nvidia:mistral-small',
    provider:     'nvidia_nim',
    modelId:      'mistralai/mistral-small-3.1-24b-instruct',
    displayName:  'Mistral Small 3.1 24B (NVIDIA)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2025-03-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['creative', 'speed'],
    benchmarks:   { mmlu: 82 },
  },
  // ─── OpenRouter free pool ─────────────────────────────────────────────────
  {
    key:          'openrouter:qwen3-coder',
    provider:     'openrouter',
    modelId:      'qwen/qwen3-coder:free',
    displayName:  'Qwen3 Coder 480B (OpenRouter)',
    contextK:     262,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2025-04-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['coding', 'long_context'],
    benchmarks:   { humaneval: 92 },
  },
  {
    key:          'openrouter:llama-3.3-70b',
    provider:     'openrouter',
    modelId:      'meta-llama/llama-3.3-70b-instruct:free',
    displayName:  'Llama 3.3 70B (OpenRouter)',
    contextK:     66,
    streaming:    true,
    licence:      'Llama-3',
    free:         true,
    addedAt:      '2024-12-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['speed', 'creative'],
  },
  {
    key:          'openrouter:mistral-small',
    provider:     'openrouter',
    modelId:      'mistralai/mistral-small-3.1-24b-instruct:free',
    displayName:  'Mistral Small 3.1 24B (OpenRouter)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2025-03-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['creative', 'speed'],
  },
  {
    key:          'openrouter:qwen3-vl-30b',
    provider:     'openrouter',
    modelId:      'qwen/qwen3-vl-30b-instruct:free',
    displayName:  'Qwen3 VL 30B Vision (OpenRouter)',
    contextK:     32,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2025-04-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['vision'],
    benchmarks:   { mmlu: 79 },
  },
  {
    key:          'openrouter:free',
    provider:     'openrouter',
    modelId:      'openrouter/auto',
    displayName:  'OpenRouter Auto (free pool)',
    contextK:     128,
    streaming:    true,
    licence:      'free-api',
    free:         true,
    addedAt:      '2024-01-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['vision', 'creative'],
  },
  // ─── Ollama (local) ───────────────────────────────────────────────────────
  {
    key:          'ollama:auto',
    provider:     'ollama',
    modelId:      'auto',
    displayName:  'Ollama (local)',
    contextK:     32,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2024-01-01',
    lastVerified: '2025-04-10',
    taskTypes:    ['local'],
  },
];

/**
 * Known upcoming / candidate models to check for on providers.
 * Holly will probe these during model discovery and add them if available.
 * All must be free, open-source, and genuinely better than current options.
 */
export const MODEL_CANDIDATES: Array<{
  key:        string;
  provider:   string;
  modelId:    string;
  licence:    string;
  taskTypes:  string[];
  supersedes: string;   // which current model this would replace
  contextK:   number;
  reason:     string;   // why this is better
}> = [
  // Groq candidates
  {
    key:        'groq:qwen3-72b',
    provider:   'groq',
    modelId:    'qwen3-72b',
    licence:    'Apache-2.0',
    taskTypes:  ['speed', 'coding', 'reasoning'],
    supersedes: 'groq:llama-3.3-70b',
    contextK:   128,
    reason:     'Qwen3 72B: stronger multilingual + coding than Llama 3.3 70B at same size',
  },
  {
    key:        'groq:llama-4-scout',
    provider:   'groq',
    modelId:    'meta-llama/llama-4-scout-17b-16e-instruct',
    licence:    'Llama-4',
    taskTypes:  ['speed', 'coding'],
    supersedes: 'groq:llama-3.1-8b',
    contextK:   128,
    reason:     'Llama 4 Scout: MoE architecture, faster and smarter than Llama 3.1 8B',
  },
  {
    key:        'groq:deepseek-r2-70b',
    provider:   'groq',
    modelId:    'deepseek-r2-distill-llama-70b',
    licence:    'MIT',
    taskTypes:  ['reasoning', 'coding'],
    supersedes: 'groq:deepseek-r1-70b',
    contextK:   128,
    reason:     'DeepSeek R2 distill: next-gen reasoning if/when available on Groq free tier',
  },
  // Cloudflare candidates
  {
    key:        'cf:qwen3-coder-32b',
    provider:   'cf_workers',
    modelId:    '@cf/qwen/qwen3-coder-32b',
    licence:    'Apache-2.0',
    taskTypes:  ['coding'],
    supersedes: 'cf:qwen3-32b',
    contextK:   32,
    reason:     'Qwen3 Coder 32B: specialized code model, better HumanEval than base Qwen3 32B',
  },
  {
    key:        'cf:kimi-k3',
    provider:   'cf_workers',
    modelId:    '@cf/moonshotai/kimi-k3',
    licence:    'Apache-2.0',
    taskTypes:  ['coding', 'long_context', 'agent'],
    supersedes: 'cf:kimi-k2.5',
    contextK:   512,
    reason:     'Kimi K3: next gen Kimi with 512K context if/when available on Cloudflare',
  },
  // NVIDIA candidates
  {
    key:        'nvidia:qwen3-6-235b',
    provider:   'nvidia_nim',
    modelId:    'qwen/qwen3.6-235b-a22b',
    licence:    'Apache-2.0',
    taskTypes:  ['reasoning', 'coding', 'long_context'],
    supersedes: 'nvidia:qwen3-235b',
    contextK:   262,
    reason:     'Qwen 3.6 235B: improved math, coding, and reasoning over Qwen3 235B — same free tier',
  },
  {
    key:        'nvidia:deepseek-r2',
    provider:   'nvidia_nim',
    modelId:    'deepseek-ai/deepseek-r2',
    licence:    'MIT',
    taskTypes:  ['reasoning'],
    supersedes: 'nvidia:deepseek-r1',
    contextK:   128,
    reason:     'DeepSeek R2: next generation reasoning model over R1',
  },
  // OpenRouter candidates
  {
    key:        'openrouter:qwen3-vl-72b',
    provider:   'openrouter',
    modelId:    'qwen/qwen3-vl-72b-instruct:free',
    licence:    'Apache-2.0',
    taskTypes:  ['vision'],
    supersedes: 'openrouter:qwen3-vl-30b',
    contextK:   32,
    reason:     'Qwen3 VL 72B: larger vision model, better image understanding than 30B',
  },
  {
    key:        'openrouter:qwen3-coder-480b',
    provider:   'openrouter',
    modelId:    'qwen/qwen3.6-coder:free',
    licence:    'Apache-2.0',
    taskTypes:  ['coding', 'long_context'],
    supersedes: 'openrouter:qwen3-coder',
    contextK:   262,
    reason:     'Qwen 3.6 Coder: updated coder model with stronger benchmarks',
  },
];

/**
 * Get active (non-deprecated) models from the registry
 */
export function getActiveModels(): ModelRecord[] {
  return MODEL_REGISTRY.filter(m => !m.deprecated);
}

/**
 * Get a model by its key
 */
export function getModel(key: string): ModelRecord | undefined {
  return MODEL_REGISTRY.find(m => m.key === key);
}

/**
 * Mark a model as deprecated when a better replacement has been confirmed live.
 * This is called by the model updater after verifying a candidate is available.
 */
export function markDeprecated(key: string): void {
  const model = MODEL_REGISTRY.find(m => m.key === key);
  if (model) model.deprecated = true;
}
