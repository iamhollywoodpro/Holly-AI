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
 * Provider free-tier status (as of 2026-04):
 *   Groq          — free tier, 14,400 req/day, top-tier speed (300+ tok/s)
 *   Cloudflare AI — free tier, 10,000 neurons/day, best for coding (Kimi K2.5)
 *   NVIDIA NIM    — free tier, 1,000 req/day, best for reasoning (Qwen3 235B)
 *   OpenRouter    — free tier, 200 req/day across 27+ free models
 *   Ollama        — unlimited, fully local, no network cost
 *
 * HuggingFace API URL change (late 2025):
 *   OLD (deprecated): https://api-inference.huggingface.co/models/{model}
 *   NEW (active):     https://router.huggingface.co/hf-inference/models/{model}
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
    lastVerified: '2026-04-10',
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
    lastVerified: '2026-04-10',
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
    lastVerified: '2026-04-10',
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
    lastVerified: '2026-04-10',
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
    lastVerified: '2026-04-10',
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
    lastVerified: '2026-04-10',
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
    lastVerified: '2026-04-10',
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
    lastVerified: '2026-05-04',
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
    lastVerified: '2026-05-04',
    taskTypes:    ['reasoning'],
    benchmarks:   { mmlu: 90, math: 90 },
    deprecated:   true,
    supersedes:   'nvidia:deepseek-v4-flash',
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
    lastVerified: '2026-05-04',
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
    lastVerified: '2026-05-04',
    taskTypes:    ['creative', 'speed'],
    benchmarks:   { mmlu: 82 },
    deprecated:   true,
    supersedes:   'nvidia:mistral-medium-3.5',
  },
  {
    key:          'nvidia:deepseek-v4-flash',
    provider:     'nvidia_nim',
    modelId:      'deepseek-ai/deepseek-v4-flash',
    displayName:  'DeepSeek V4 Flash 284B MoE (NVIDIA)',
    contextK:     1024,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['reasoning', 'coding', 'long_context', 'agent'],
    benchmarks:   { mmlu: 86.4, humaneval: 91.6, math: 88.4, contextK: 1024 },
  },
  {
    key:          'nvidia:glm-5.1',
    provider:     'nvidia_nim',
    modelId:      'z-ai/glm-5.1',
    displayName:  'GLM-5.1 Agentic (NVIDIA)',
    contextK:     198,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['coding', 'agent', 'reasoning'],
    benchmarks:   { humaneval: 58.4 },
  },
  {
    key:          'nvidia:mistral-medium-3.5',
    provider:     'nvidia_nim',
    modelId:      'mistralai/mistral-medium-3.5-128b',
    displayName:  'Mistral Medium 3.5 128B (NVIDIA)',
    contextK:     256,
    streaming:    true,
    licence:      'Modified-MIT',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['creative', 'agent', 'coding'],
    benchmarks:   { mmlu: 89, humaneval: 77.6 },
  },
  {
    key:          'nvidia:llama-4-maverick',
    provider:     'nvidia_nim',
    modelId:      'meta/llama-4-maverick-17b-128e-instruct',
    displayName:  'Llama 4 Maverick 17B MoE (NVIDIA)',
    contextK:     128,
    streaming:    true,
    licence:      'Llama-4',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'coding'],
  },
  {
    key:          'nvidia:kimi-k2.6',
    provider:     'nvidia_nim',
    modelId:      'moonshotai/kimi-k2.6',
    displayName:  'Kimi K2.6 (NVIDIA)',
    contextK:     262,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['coding', 'agent', 'long_context'],
  },
  {
    key:          'nvidia:qwen3-coder',
    provider:     'nvidia_nim',
    modelId:      'qwen/qwen3-coder-480b-a35b-instruct',
    displayName:  'Qwen3 Coder 480B (NVIDIA)',
    contextK:     262,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['coding', 'long_context', 'agent'],
  },
  {
    key:          'nvidia:devstral-2',
    provider:     'nvidia_nim',
    modelId:      'mistralai/devstral-2-123b-instruct-2512',
    displayName:  'Devstral 2 123B (NVIDIA)',
    contextK:     256,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-06-03',
    taskTypes:    ['coding', 'agent'],
    deprecated:   true,
    supersedes:   'nvidia:mistral-small-4',
  },
  // ─── v10 NEW NVIDIA NIM models ──────────────────────────────────────────
  {
    key:          'nvidia:mistral-small-4',
    provider:     'nvidia_nim',
    modelId:      'mistralai/mistral-small-4-119b-2603',
    displayName:  'Mistral Small 4 119B MoE (NVIDIA)',
    contextK:     256,
    streaming:    true,
    licence:      'Modified-MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['coding', 'creative', 'agent', 'reasoning'],
    benchmarks:   { mmlu: 89, humaneval: 82 },
    supersedes:   'nvidia:devstral-2',
  },
  {
    key:          'nvidia:qwen3.5-122b',
    provider:     'nvidia_nim',
    modelId:      'qwen/qwen3.5-122b-a10b',
    displayName:  'Qwen 3.5 122B MoE (NVIDIA)',
    contextK:     262,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['reasoning', 'coding', 'long_context', 'agent'],
    benchmarks:   { mmlu: 90, humaneval: 88 },
    supersedes:   'nvidia:qwen3-235b',
  },
  {
    key:          'nvidia:gemma-4-31b',
    provider:     'nvidia_nim',
    modelId:      'google/gemma-4-31b-it',
    displayName:  'Gemma 4 31B (NVIDIA)',
    contextK:     256,
    streaming:    true,
    licence:      'Gemma',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['reasoning', 'creative', 'vision', 'long_context'],
    benchmarks:   { mmlu: 85.2, humaneval: 80.0 },
  },
  {
    key:          'nvidia:minimax-m2.7',
    provider:     'nvidia_nim',
    modelId:      'minimaxai/minimax-m2.7',
    displayName:  'MiniMax M2.7 230B (NVIDIA)',
    contextK:     256,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['coding', 'reasoning', 'agent'],
  },
  {
    key:          'nvidia:step-3.5-flash',
    provider:     'nvidia_nim',
    modelId:      'stepfun-ai/step-3.5-flash',
    displayName:  'Step 3.5 Flash 200B MoE (NVIDIA)',
    contextK:     128,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['agent', 'reasoning'],
  },
  {
    key:          'nvidia:gpt-oss-120b',
    provider:     'nvidia_nim',
    modelId:      'openai/gpt-oss-120b',
    displayName:  'GPT-OSS 120B (NVIDIA)',
    contextK:     128,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['creative', 'reasoning', 'agent'],
  },
  {
    key:          'nvidia:gpt-oss-20b',
    provider:     'nvidia_nim',
    modelId:      'openai/gpt-oss-20b',
    displayName:  'GPT-OSS 20B (NVIDIA)',
    contextK:     128,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['speed', 'reasoning'],
  },
  // ─── Together AI (80+ free models, 60 RPM) ──────────────────────────────
  {
    key:          'together:llama-4-scout',
    provider:     'together',
    modelId:      'meta-llama/Llama-4-Scout-17B-16E-Instruct',
    displayName:  'Llama 4 Scout 17B MoE (Together)',
    contextK:     328,
    streaming:    true,
    licence:      'Llama-4',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['speed', 'coding', 'long_context'],
  },
  {
    key:          'together:qwen3.5-122b',
    provider:     'together',
    modelId:      'Qwen/Qwen3.5-122B-A10B',
    displayName:  'Qwen 3.5 122B MoE (Together)',
    contextK:     262,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['reasoning', 'coding', 'long_context'],
  },
  {
    key:          'together:minimax-m1',
    provider:     'together',
    modelId:      'MiniMaxAI/MiniMax-M1',
    displayName:  'MiniMax M1 1M ctx (Together)',
    contextK:     1000,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['long_context', 'reasoning'],
  },
  {
    key:          'together:qwen3-vl-235b',
    provider:     'together',
    modelId:      'Qwen/Qwen3-VL-235B-A22B-Instruct',
    displayName:  'Qwen3 VL 235B Vision (Together)',
    contextK:     262,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['vision'],
  },
  {
    key:          'together:qwen3-coder-30b',
    provider:     'together',
    modelId:      'Qwen/Qwen3-Coder-30B-A3B-Instruct',
    displayName:  'Qwen3 Coder 30B (Together)',
    contextK:     160,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['coding', 'agent'],
  },
  {
    key:          'together:gemma-4-26b',
    provider:     'together',
    modelId:      'google/gemma-4-26b-a4b-it',
    displayName:  'Gemma 4 26B MoE (Together)',
    contextK:     262,
    streaming:    true,
    licence:      'Gemma',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['creative', 'speed', 'vision'],
  },
  {
    key:          'together:llama-3.1-70b',
    provider:     'together',
    modelId:      'meta-llama/Llama-3.1-70B-Instruct',
    displayName:  'Llama 3.1 70B (Together)',
    contextK:     131,
    streaming:    true,
    licence:      'Llama-3',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['speed', 'creative'],
  },
  {
    key:          'together:devstral-small',
    provider:     'together',
    modelId:      'mistralai/Devstral-Small-2505',
    displayName:  'Devstral Small 24B (Together)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['coding', 'agent'],
  },
  {
    key:          'together:qwen3.6-35b',
    provider:     'together',
    modelId:      'Qwen/Qwen3.6-35B-A3B',
    displayName:  'Qwen 3.6 35B MoE (Together)',
    contextK:     262,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['speed', 'coding', 'reasoning', 'agent'],
  },
  {
    key:          'together:mistral-small-3.2',
    provider:     'together',
    modelId:      'mistralai/Mistral-Small-3.2-24B',
    displayName:  'Mistral Small 3.2 24B (Together)',
    contextK:     131,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['creative', 'speed'],
  },
  // ─── Mistral AI Direct (1B tokens/month, 2 RPM — background only) ──────
  {
    key:          'mistral:medium-3.5',
    provider:     'mistral',
    modelId:      'mistral-medium-latest',
    displayName:  'Mistral Medium 3.5 128B (Mistral Direct)',
    contextK:     131,
    streaming:    true,
    licence:      'Modified-MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['consciousness', 'creative', 'reasoning'],
  },
  {
    key:          'mistral:small-4',
    provider:     'mistral',
    modelId:      'mistral-small-latest',
    displayName:  'Mistral Small 4 (Mistral Direct)',
    contextK:     128,
    streaming:    true,
    licence:      'Modified-MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['consciousness', 'coding', 'reasoning'],
  },
  {
    key:          'mistral:codestral',
    provider:     'mistral',
    modelId:      'codestral-latest',
    displayName:  'Codestral (Mistral Direct)',
    contextK:     256,
    streaming:    true,
    licence:      'Modified-MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['coding'],
  },
  {
    key:          'mistral:magistral-medium',
    provider:     'mistral',
    modelId:      'magistral-medium-latest',
    displayName:  'Magistral Medium (Mistral Direct)',
    contextK:     131,
    streaming:    true,
    licence:      'Modified-MIT',
    free:         true,
    addedAt:      '2026-06-03',
    lastVerified: '2026-06-03',
    taskTypes:    ['reasoning', 'consciousness'],
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
    lastVerified: '2026-05-04',
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
    lastVerified: '2026-05-04',
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
    lastVerified: '2026-05-04',
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
    lastVerified: '2026-05-04',
    taskTypes:    ['vision'],
    benchmarks:   { mmlu: 79 },
  },
  {
    key:          'openrouter:free',
    provider:     'openrouter',
    modelId:      'openrouter/auto:free',
    displayName:  'OpenRouter Auto Free',
    contextK:     128,
    streaming:    true,
    licence:      'free-api',
    free:         true,
    addedAt:      '2024-01-01',
    lastVerified: '2026-05-04',
    taskTypes:    ['vision', 'creative'],
  },
  {
    key:          'openrouter:qwen3-coder-next',
    provider:     'openrouter',
    modelId:      'qwen/qwen3-next-80b-a3b-instruct:free',
    displayName:  'Qwen3 Coder Next 80B MoE (OpenRouter)',
    contextK:     256,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['coding', 'agent'],
  },
  {
    key:          'openrouter:laguna-xs.2',
    provider:     'openrouter',
    modelId:      'poolside/laguna-xs.2:free',
    displayName:  'Laguna XS.2 33B MoE (OpenRouter)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['coding', 'agent'],
  },
  {
    key:          'openrouter:nemotron-120b',
    provider:     'openrouter',
    modelId:      'nvidia/nemotron-3-super-120b-a12b:free',
    displayName:  'Nemotron 3 Super 120B (OpenRouter)',
    contextK:     128,
    streaming:    true,
    licence:      'NVIDIA-Open-Model',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['reasoning', 'vision'],
  },
  {
    key:          'openrouter:gpt-oss-120b',
    provider:     'openrouter',
    modelId:      'openai/gpt-oss-120b:free',
    displayName:  'GPT-OSS 120B (OpenRouter)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['creative', 'reasoning'],
  },
  {
    key:          'openrouter:gemma-4-31b',
    provider:     'openrouter',
    modelId:      'google/gemma-4-31b-it:free',
    displayName:  'Gemma 4 31B (OpenRouter)',
    contextK:     256,
    streaming:    true,
    licence:      'Gemma',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['vision', 'creative', 'reasoning'],
  },
  // ─── Ollama (local / self-hosted / cloud) ──────────────────────────────────
  // v9: Qwen3.6 replaces Qwen3.5, Granite 4.1 replaces Llama 3.1 8B,
  //     Laguna XS.2 and Devstral Small 2 add local agentic coding.
  //     DeepSeek V4 Flash + GLM-5.1 available via Ollama Cloud.
  {
    key:          'ollama:gemma4-31b',
    provider:     'ollama',
    modelId:      'gemma4:31b',
    displayName:  'Gemma 4 31B IT Thinking (Ollama)',
    contextK:     256,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-04-16',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'creative', 'reasoning', 'coding', 'vision', 'agent', 'local'],
    benchmarks:   { mmlu: 85.2, humaneval: 80.0, math: 89.2 },
  },
  {
    key:          'ollama:gemma4-26b-moe',
    provider:     'ollama',
    modelId:      'gemma4:26b',
    displayName:  'Gemma 4 26B MoE (Ollama local)',
    contextK:     256,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-04-12',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'creative', 'reasoning', 'coding', 'vision', 'agent'],
    benchmarks:   { mmlu: 82.6, humaneval: 77.1, math: 88.3 },
  },
  {
    key:          'ollama:gemma4-e4b',
    provider:     'ollama',
    modelId:      'gemma4:e4b',
    displayName:  'Gemma 4 E4B (Ollama local)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-04-12',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'vision', 'audio'],
    benchmarks:   { mmlu: 69.4 },
  },
  {
    key:          'ollama:qwen3.5-32b',
    provider:     'ollama',
    modelId:      'qwen3.5:32b',
    displayName:  'Qwen 3.5 32B (Ollama)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-04-16',
    lastVerified: '2026-05-04',
    taskTypes:    ['reasoning', 'coding', 'vision', 'agent', 'local'],
    benchmarks:   { mmlu: 84, humaneval: 78 },
  },
  {
    key:          'ollama:qwen3.5-14b',
    provider:     'ollama',
    modelId:      'qwen3.5:14b',
    displayName:  'Qwen 3.5 14B (Ollama)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-04-16',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'coding', 'local'],
  },
  {
    key:          'ollama:deepseek-r1-14b',
    provider:     'ollama',
    modelId:      'deepseek-r1:14b',
    displayName:  'DeepSeek R1 14B (Ollama)',
    contextK:     128,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2026-04-16',
    lastVerified: '2026-05-04',
    taskTypes:    ['reasoning', 'coding', 'local'],
    benchmarks:   { mmlu: 76, humaneval: 72, math: 82 },
  },
  {
    key:          'ollama:llama3.1-8b',
    provider:     'ollama',
    modelId:      'llama3.1:8b',
    displayName:  'Llama 3.1 8B (Ollama local)',
    contextK:     128,
    streaming:    true,
    licence:      'Llama-3',
    free:         true,
    addedAt:      '2026-04-12',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'local'],
    benchmarks:   { mmlu: 68 },
    deprecated:   true,
    supersedes:   'ollama:granite4.1-8b',
  },
  // ── v9 NEW Ollama models ────────────────────────────────────────────────
  {
    key:          'ollama:deepseek-v4-flash',
    provider:     'ollama',
    modelId:      'deepseek-v4-flash:cloud',
    displayName:  'DeepSeek V4 Flash (Ollama Cloud)',
    contextK:     1024,
    streaming:    true,
    licence:      'MIT',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['reasoning', 'coding', 'long_context', 'agent'],
    benchmarks:   { mmlu: 86.4, humaneval: 91.6, contextK: 1024 },
  },
  {
    key:          'ollama:glm-5.1',
    provider:     'ollama',
    modelId:      'glm-5.1:cloud',
    displayName:  'GLM-5.1 (Ollama Cloud)',
    contextK:     198,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['coding', 'agent', 'reasoning'],
  },
  {
    key:          'ollama:qwen3.6-35b',
    provider:     'ollama',
    modelId:      'qwen3.6:35b',
    displayName:  'Qwen 3.6 35B MoE (Ollama)',
    contextK:     256,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'creative', 'reasoning', 'coding', 'vision', 'agent', 'local'],
    benchmarks:   { humaneval: 73.4 },
    supersedes:   'ollama:qwen3.5-27b',
  },
  {
    key:          'ollama:granite4.1-8b',
    provider:     'ollama',
    modelId:      'granite4.1:8b',
    displayName:  'Granite 4.1 8B (Ollama)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'coding', 'local'],
    benchmarks:   { mmlu: 78 },
    supersedes:   'ollama:llama3.1-8b',
  },
  {
    key:          'ollama:granite4.1-3b',
    provider:     'ollama',
    modelId:      'granite4.1:3b',
    displayName:  'Granite 4.1 3B (Ollama)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['speed', 'local'],
  },
  {
    key:          'ollama:laguna-xs.2',
    provider:     'ollama',
    modelId:      'laguna-xs.2',
    displayName:  'Laguna XS.2 33B MoE (Ollama)',
    contextK:     128,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['coding', 'agent', 'local'],
    benchmarks:   { humaneval: 68.2 },
  },
  {
    key:          'ollama:devstral-small-2',
    provider:     'ollama',
    modelId:      'devstral-small-2',
    displayName:  'Devstral Small 2 24B (Ollama)',
    contextK:     384,
    streaming:    true,
    licence:      'Apache-2.0',
    free:         true,
    addedAt:      '2026-05-04',
    lastVerified: '2026-05-04',
    taskTypes:    ['coding', 'agent', 'local'],
    benchmarks:   { humaneval: 65.8 },
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
  // Groq candidates (14,400 req/day free)
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
    key:        'groq:deepseek-v4-flash',
    provider:   'groq',
    modelId:    'deepseek-v4-flash',
    licence:    'MIT',
    taskTypes:  ['reasoning', 'coding', 'long_context'],
    supersedes: 'groq:deepseek-r1-70b',
    contextK:   1024,
    reason:     'DeepSeek V4 Flash on Groq: 1M ctx, massively better than R1 distill',
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
  // NVIDIA candidates (1,000 req/day free)
  {
    key:        'nvidia:nemotron-3-ultra',
    provider:   'nvidia_nim',
    modelId:    'nvidia/nemotron-3-ultra-550b-a55b',
    licence:    'NVIDIA-Open-Model',
    taskTypes:  ['reasoning', 'coding', 'agent', 'long_context'],
    supersedes: 'nvidia:deepseek-v4-flash',
    contextK:   1024,
    reason:     'Nemotron 3 Ultra 550B/55B: announced June 1 at Computex, 1M ctx, 300+ tok/s. Biggest free model ever. Weights drop June 4.',
  },
  {
    key:        'nvidia:qwen3.6-235b',
    provider:   'nvidia_nim',
    modelId:    'qwen/qwen3.6-235b-a22b',
    licence:    'Apache-2.0',
    taskTypes:  ['reasoning', 'coding', 'long_context'],
    supersedes: 'nvidia:qwen3-235b',
    contextK:   262,
    reason:     'Qwen 3.6 235B: improved agentic coding and thinking preservation over Qwen3 235B',
  },
  {
    key:        'nvidia:gemma-4-31b',
    provider:   'nvidia_nim',
    modelId:    'google/gemma-4-31b-it',
    licence:    'Gemma',
    taskTypes:  ['reasoning', 'creative', 'vision'],
    supersedes: 'nvidia:llama-3.3-70b',
    contextK:   256,
    reason:     'Gemma 4 31B on NVIDIA: vision+thinking, better than Llama 3.3 70B for multimodal',
  },
  {
    key:        'nvidia:mistral-small-4',
    provider:   'nvidia_nim',
    modelId:    'mistralai/mistral-small-4-119b-2603',
    licence:    'Modified-MIT',
    taskTypes:  ['creative', 'agent', 'coding'],
    supersedes: 'nvidia:mistral-small',
    contextK:   128,
    reason:     'Mistral Small 4 119B: newer than Small 3.1, much stronger',
  },
  // OpenRouter candidates (20 RPM / 200 RPD free)
  {
    key:        'openrouter:qwen3.6-coder',
    provider:   'openrouter',
    modelId:    'qwen/qwen3.6-coder:free',
    licence:    'Apache-2.0',
    taskTypes:  ['coding', 'long_context'],
    supersedes: 'openrouter:qwen3-coder',
    contextK:   262,
    reason:     'Qwen 3.6 Coder: updated coder model with stronger agentic coding benchmarks',
  },
  {
    key:        'openrouter:ling-2.6',
    provider:   'openrouter',
    modelId:    'inclusionai/ling-2.6-1t:free',
    licence:    'Apache-2.0',
    taskTypes:  ['reasoning', 'long_context'],
    supersedes: 'openrouter:nemotron-120b',
    contextK:   128,
    reason:     'Ling 2.6 1T params: massive reasoning model available free on OpenRouter',
  },
  {
    key:        'openrouter:nemotron-nano-vl',
    provider:   'openrouter',
    modelId:    'nvidia/nemotron-nano-12b-v2-vl:free',
    licence:    'NVIDIA-Open-Model',
    taskTypes:  ['vision'],
    supersedes: 'openrouter:qwen3-vl-30b',
    contextK:   128,
    reason:     'Nemotron Nano VL 12B: vision+reasoning in a small package, good vision fallback',
  },
  // ─── Image generation candidates ─────────────────────────────────────────
  // Research verified 2026-04-10. Licence accuracy is critical — only truly
  // free (Apache-2.0 / Stability AI Community Licence) models allowed.
  //
  // LICENCE NOTES (important corrections):
  //   FLUX.1-schnell   → Apache-2.0 ✅ fully commercial-safe
  //   FLUX.1-dev       → FLUX.1-dev Non-Commercial License ❌ NOT Apache-2.0
  //   FLUX.1-Kontext   → FLUX.1-dev Non-Commercial License ❌ NOT Apache-2.0
  //   SD 3.5 Large     → Stability AI Community License (free, permissive) ✅
  //   SD 3.5 Turbo     → Stability AI Community License ✅
  //   Pollinations     → serves FLUX under their own free API terms ✅
  //
  // STATUS: Our current primary (FLUX.1-schnell via HF, Apache-2.0) is
  // CORRECT and still the best fully-free commercial-safe image model in 2026.
  {
    key:        'hf:stable-diffusion-3.5-large',
    provider:   'huggingface',
    modelId:    'stabilityai/stable-diffusion-3.5-large',
    licence:    'Stability AI Community License',  // free commercial use ✅
    taskTypes:  ['image'],
    supersedes: 'hf:sdxl',
    contextK:   0,
    reason:     'SD 3.5 Large (8B MMDiT): better typography, prompt adherence and realism than SDXL. Free commercial use via Stability Community Licence.',
  },
  {
    key:        'hf:stable-diffusion-3.5-turbo',
    provider:   'huggingface',
    modelId:    'stabilityai/stable-diffusion-3.5-large-turbo',
    licence:    'Stability AI Community License',  // free commercial use ✅
    taskTypes:  ['image'],
    supersedes: 'hf:sdxl',
    contextK:   0,
    reason:     'SD 3.5 Large Turbo: same quality as 3.5 Large in 4 steps (ADD distillation). Faster than SDXL on HF free tier.',
  },
  // ─── Video generation candidates ─────────────────────────────────────────
  // Research verified 2026-04-10. Current stack (ZeroScope, AnimateDiff) is
  // significantly outdated. Major upgrades available:
  //
  // LICENCE NOTES:
  //   Wan 2.2 (Alibaba)       → Apache-2.0 ✅ world's first OSS MoE video model
  //   LTX-Video 2.3 (Lightricks) → Apache-2.0 ✅ real-time, synchronized audio
  //   HunyuanVideo (Tencent)  → Tencent HunyuanVideo Community License ✅ (free commercial)
  //   CogVideoX-5B (THUDM)    → Apache-2.0 ✅
  //   Mochi-1 (Genmo)         → Apache-2.0 ✅
  //
  // EXCLUDED (paid API only, no open weights):
  //   Seedance 2.0 (ByteDance) → closed weights, API via Fal.ai/PiAPI only — BLOCKED
  //   Kling, Runway, Sora, Pika → paid — BLOCKED
  {
    key:        'hf:ltx-video-2.3',
    provider:   'huggingface',
    modelId:    'Lightricks/LTX-2.3',
    licence:    'Apache-2.0',
    taskTypes:  ['video'],
    supersedes: 'hf:animatediff',
    contextK:   0,
    reason:     'LTX-Video 2.3 (Lightricks, Mar 2026): DiT-based, real-time generation, native audio sync, 4K/20s support, Apache-2.0. Massively better than AnimateDiff.',
  },
  {
    key:        'hf:cogvideox-5b',
    provider:   'huggingface',
    modelId:    'THUDM/CogVideoX-5b',
    licence:    'Apache-2.0',
    taskTypes:  ['video'],
    supersedes: 'hf:zeroscope-v2',
    contextK:   0,
    reason:     'CogVideoX-5B (THUDM, Apache-2.0): much better motion coherence and prompt following than ZeroScope v2. Available on HF free inference.',
  },
  {
    key:        'hf:wan-2.2-t2v',
    provider:   'huggingface',
    modelId:    'Wan-AI/Wan2.2-T2V-A14B',
    licence:    'Apache-2.0',
    taskTypes:  ['video'],
    supersedes: 'hf:zeroscope-v2',
    contextK:   0,
    reason:     'Wan 2.2 (Alibaba, Aug 2025): first open-source MoE video model. 720P, cinematic controls, Apache-2.0. Top-rated OSS video model in 2026.',
  },
  {
    key:        'hf:hunyuanvideo',
    provider:   'huggingface',
    modelId:    'tencent/HunyuanVideo',
    licence:    'Tencent HunyuanVideo Community License',  // free commercial ✅
    taskTypes:  ['video'],
    supersedes: 'hf:zeroscope-v2',
    contextK:   0,
    reason:     'HunyuanVideo (Tencent, 13B params): best visual quality OSS video model, comparable to Kling/Sora. Free commercial use licence.',
  },
];

/**
 * Media model registry (image / video) — separate from LLM catalogue.
 * Holly monitors HuggingFace model hubs for updates and promotes
 * newer models when they become available on the free inference tier.
 */
export interface MediaModelRecord {
  key:          string;
  type:         'image' | 'video' | 'audio';
  provider:     'pollinations' | 'huggingface' | 'local';
  modelId:      string;         // HF repo ID or provider model name
  displayName:  string;
  licence:      string;
  free:         boolean;
  keyNeeded:    boolean;
  keyEnv?:      string;
  quality:      'excellent' | 'good' | 'decent';
  note:         string;
  addedAt:      string;
  active:       boolean;        // false = superseded by better model
}

export const MEDIA_MODEL_REGISTRY: MediaModelRecord[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE GENERATION — v2.6 Stack
  // Primary: Z-Image-Turbo (8 steps, sub-second, Apache-2.0)
  // Fallback: FLUX.1-schnell (4 steps, proven, Apache-2.0)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key:         'hf:z-image-turbo',
    type:        'image',
    provider:    'huggingface',
    modelId:     'Tongyi-MAI/Z-Image-Turbo',
    displayName: 'Z-Image-Turbo (Alibaba) — PRIMARY v2.6',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'v2.6 PRIMARY IMAGE. 6B params, 8-step inference, sub-second on T4. #1 open-source on AI Arena. Better text rendering and photorealism than FLUX. Apache-2.0.',
    addedAt:     '2026-04-12',
    active:      true,
  },
  {
    key:         'hf:flux-schnell',
    type:        'image',
    provider:    'huggingface',
    modelId:     'black-forest-labs/FLUX.1-schnell',
    displayName: 'FLUX.1-schnell — FALLBACK v2.6',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'v2.6 IMAGE FALLBACK. 4-step, proven, battle-tested. Replaced as primary by Z-Image-Turbo.',
    addedAt:     '2025-01-01',
    active:      true,
  },
  {
    key:         'pollinations:flux',
    type:        'image',
    provider:    'pollinations',
    modelId:     'flux',
    displayName: 'FLUX via Pollinations — EMERGENCY',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   false,
    quality:     'good',
    note:        'No API key needed. Emergency fallback when HF/Modal are down.',
    addedAt:     '2025-01-01',
    active:      true,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // VIDEO GENERATION — v2.6 Stack
  // Primary: Wan2.2-TI2V-5B (720P 24fps, I2V, Apache-2.0)
  // Fallback: CogVideoX-5B (480P 8fps, proven, Apache-2.0)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key:         'hf:wan-2.2-5b',
    type:        'video',
    provider:    'huggingface',
    modelId:     'Wan-AI/Wan2.2-TI2V-5B',
    displayName: 'Wan2.2-TI2V-5B — PRIMARY v2.6',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'v2.6 PRIMARY VIDEO. 5B MoE, 720P 24fps, T2V+I2V, cinematic quality. Same A10G GPU as CogVideoX. Apache-2.0.',
    addedAt:     '2026-04-12',
    active:      true,
  },
  {
    key:         'hf:cogvideox-5b',
    type:        'video',
    provider:    'huggingface',
    modelId:     'THUDM/CogVideoX-5b',
    displayName: 'CogVideoX-5B — FALLBACK v2.6',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'v2.6 VIDEO FALLBACK. 480P 8fps, proven, battle-tested. Replaced as primary by Wan2.2.',
    addedAt:     '2026-04-10',
    active:      true,
  },
  // ─── Video: HIGH-VRAM CANDIDATES (need self-hosted GPU or HF Pro dedicated) ─
  {
    key:         'hf:ltx-video-2.3',
    type:        'video',
    provider:    'huggingface',
    modelId:     'Lightricks/LTX-2.3',
    displayName: 'LTX-Video 2.3 (Lightricks) — CANDIDATE',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'UPGRADE CANDIDATE. Mar 2026. DiT-based, real-time generation, native audio sync, 4K/20s, Apache-2.0. Best OSS video model for production.',
    addedAt:     '2026-04-10',
    active:      false,
  },
  {
    key:         'hf:wan-2.2-14b',
    type:        'video',
    provider:    'huggingface',
    modelId:     'Wan-AI/Wan2.2-T2V-A14B',
    displayName: 'Wan 2.2 A14B (Alibaba) — CANDIDATE (needs 24GB+ VRAM)',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'CANDIDATE (14B needs 24GB+ VRAM). Aug 2025. First open-source MoE video model, 720P, cinematic controls, Apache-2.0. 5B variant (Wan2.2-TI2V-5B) is active instead.',
    addedAt:     '2026-04-10',
    active:      false,
  },
  {
    key:         'hf:hunyuanvideo',
    type:        'video',
    provider:    'huggingface',
    modelId:     'tencent/HunyuanVideo',
    displayName: 'HunyuanVideo (Tencent) — CANDIDATE',
    licence:     'Tencent HunyuanVideo Community License',  // free commercial ✅
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'UPGRADE CANDIDATE. 13B params. Comparable to Kling/Sora quality. Free commercial licence. Requires 24GB+ VRAM — needs self-hosted GPU.',
    addedAt:     '2026-04-10',
    active:      false,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // TTS (Text-to-Speech) — v2.6 Stack
  // Primary: VoxCPM2 (48kHz, 30 languages, voice design, Apache-2.0)
  // Fallback: Kokoro-82M (CPU-only, emergency, Apache-2.0)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key:         'hf:voxcpm2',
    type:        'audio',
    provider:    'huggingface',
    modelId:     'openbmb/VoxCPM2',
    displayName: 'VoxCPM2 — PRIMARY TTS v2.6',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   false,
    quality:     'excellent',
    note:        'v2.6 PRIMARY TTS. 2B params, 48kHz studio, 30 languages, voice design from text, emotion style tags, 3-mode cloning, streaming RTF 0.13. Apache-2.0.',
    addedAt:     '2026-04-12',
    active:      true,
  },
  {
    key:         'hf:kokoro-82m',
    type:        'audio',
    provider:    'huggingface',
    modelId:     'hexgrad/Kokoro-82M',
    displayName: 'Kokoro-82M — FALLBACK TTS v2.6',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   false,
    quality:     'good',
    note:        'v2.6 TTS FALLBACK. 82M params, CPU-only emergency, 54 voices, 8 languages. Runs when GPU is unavailable.',
    addedAt:     '2026-04-12',
    active:      true,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // MUSIC GENERATION — v2.6 Stack
  // Primary: SUNO V5_5 API (best vocals, 12 languages)
  // Fallback: Sonauto Melodia v3 (FREE, instrumental + lyrics + stems)
  // Last resort: ACE-Step XL Turbo (self-hosted, MIT, sovereignty path)
  // Hybrid Studio: Sonauto (instrumental) + SUNO (vocals) → multi-engine pipeline
  // ═══════════════════════════════════════════════════════════════════════════
  {
    key:         'api:suno-v5.5',
    type:        'audio',
    provider:    'local',
    modelId:     'suno-v5.5',
    displayName: 'SUNO V5_5 API — PRIMARY MUSIC v2.6',
    licence:     'free-api',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'SUNO_API_KEY',
    quality:     'excellent',
    note:        'v2.6 PRIMARY MUSIC (vocals). Best vocal quality, full song generation, 12 languages. Used in Hybrid Studio Phase 3 for vocal topline generation.',
    addedAt:     '2026-04-12',
    active:      true,
  },
  {
    key:         'api:sonauto-melodia-v3',
    type:        'audio',
    provider:    'local',
    modelId:     'sonauto-melodia-v3',
    displayName: 'Sonauto Melodia v3 — FREE MUSIC + HYBRID STUDIO',
    licence:     'MIT',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'SONAUTO_API_KEY',
    quality:     'excellent',
    note:        'v2.6 FREE MUSIC + HYBRID STUDIO ENGINE. Generates lyrics, instrumentals, stems. Used in Hybrid Studio Phase 1 (lyrics) + Phase 2 (instrumental bed). Also standalone fallback behind SUNO.',
    addedAt:     '2026-04-16',
    active:      true,
  },
  {
    key:         'selfhosted:acestep-xl-turbo',
    type:        'audio',
    provider:    'local',
    modelId:     'acestep-xl-turbo',
    displayName: 'ACE-Step XL Turbo — LAST RESORT MUSIC v2.6',
    licence:     'MIT',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'ACESTEP_MUSIC_URL',
    quality:     'excellent',
    note:        'v2.6 LAST RESORT MUSIC. 5B params, MIT license, self-hosted. Only used if both SUNO and Sonauto fail.',
    addedAt:     '2026-04-12',
    active:      true,
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
