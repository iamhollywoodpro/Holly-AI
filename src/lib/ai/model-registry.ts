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
  // ─── Image: Pollinations (no key) ────────────────────────────────────────
  // NOTE: Pollinations serves FLUX.1-schnell (Apache-2.0) under their free API.
  // The previous label "FLUX.1-dev" was incorrect — Pollinations routes to
  // schnell/turbo variants which ARE Apache-2.0 commercial-safe.
  {
    key:         'pollinations:flux',
    type:        'image',
    provider:    'pollinations',
    modelId:     'flux',
    displayName: 'FLUX.1-schnell via Pollinations',
    licence:     'Apache-2.0',  // schnell is Apache-2.0 ✅
    free:        true,
    keyNeeded:   false,
    quality:     'excellent',
    note:        'Primary image provider. No API key ever needed. Apache-2.0 schnell variant. Active Jan 2026+.',
    addedAt:     '2025-01-01',
    active:      true,
  },
  {
    key:         'pollinations:turbo',
    type:        'image',
    provider:    'pollinations',
    modelId:     'turbo',
    displayName: 'FLUX Turbo via Pollinations',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   false,
    quality:     'excellent',
    note:        'Fastest Pollinations image variant. No key.',
    addedAt:     '2025-01-01',
    active:      true,
  },
  // ─── Image: HuggingFace free inference ───────────────────────────────────
  // NOTE: HF API URL changed in late 2025.
  //   OLD: https://api-inference.huggingface.co/models/{model}  ← DEPRECATED
  //   NEW: https://router.huggingface.co/hf-inference/models/{model} ← ACTIVE
  {
    key:         'hf:flux2-klein',
    type:        'image',
    provider:    'huggingface',
    modelId:     'black-forest-labs/FLUX.2-klein-4B',
    displayName: 'FLUX.2-klein 4B (Black Forest Labs)',
    licence:     'Apache-2.0',  // ✅ fully commercial-safe (Jan 2026)
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'ACTIVE 2026-04-10. Released Jan 2026. Distilled 4B model. Sub-second generation. Best free image model 2026. Apache-2.0 commercial-safe.',
    addedAt:     '2026-04-10',
    active:      true,
  },
  {
    key:         'hf:flux-schnell',
    type:        'image',
    provider:    'huggingface',
    modelId:     'black-forest-labs/FLUX.1-schnell',
    displayName: 'FLUX.1-schnell (HuggingFace)',
    licence:     'Apache-2.0',  // ✅ only FLUX variant that is truly Apache-2.0
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'HF free inference tier. 4-step distillation. Only FLUX model with Apache-2.0 (commercial-safe).',
    addedAt:     '2025-01-01',
    active:      true,
  },
  {
    key:         'hf:sdxl',
    type:        'image',
    provider:    'huggingface',
    modelId:     'stabilityai/stable-diffusion-xl-base-1.0',
    displayName: 'SDXL 1.0 (HuggingFace)',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'good',
    note:        'HF free tier. Solid artistic quality. Candidate for upgrade to SD 3.5.',
    addedAt:     '2025-01-01',
    active:      true,
  },
  // ─── Image: UPGRADE CANDIDATE — SD 3.5 Large ─────────────────────────────
  // SD 3.5 Large (8B MMDiT) is significantly better than SDXL on:
  // - Typography / text in images
  // - Prompt adherence  
  // - Photorealism
  // Licence: Stability AI Community License — free for commercial use ✅
  // Status: Available on HF but large (8B) — may time out on HF free tier.
  //         Promote when confirmed working on free inference.
  {
    key:         'hf:sd-3.5-large',
    type:        'image',
    provider:    'huggingface',
    modelId:     'stabilityai/stable-diffusion-3.5-large',
    displayName: 'Stable Diffusion 3.5 Large (HuggingFace) — CANDIDATE',
    licence:     'Stability AI Community License',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'UPGRADE CANDIDATE. 8B MMDiT. Better than SDXL on every benchmark. Free commercial use. Promote when HF free inference confirms no timeout.',
    addedAt:     '2026-04-10',
    active:      false,  // candidate — not yet in waterfall
  },
  // ─── Video: Pollinations (no key, experimental) ───────────────────────────
  // NOTE: Pollinations video uses LTX-Video internally (confirmed via their
  // GitHub issues). The endpoint is experimental and can return 500 errors.
  // It is the guaranteed no-key fallback — not primary.
  {
    key:         'pollinations:video',
    type:        'video',
    provider:    'pollinations',
    modelId:     'video',
    displayName: 'Pollinations Video (LTX-based)',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   false,
    quality:     'decent',
    note:        'No API key. Experimental — can 500. Uses LTX-Video internally. Guaranteed last-resort fallback.',
    addedAt:     '2025-01-01',
    active:      true,
  },
  // ─── Video: HuggingFace — current models (OUTDATED, kept for compatibility)
  {
    key:         'hf:zeroscope-v2',
    type:        'video',
    provider:    'huggingface',
    modelId:     'cerspense/zeroscope_v2_XL',
    displayName: 'ZeroScope v2 XL (HuggingFace) — OUTDATED',
    licence:     'CC-BY-NC-4.0',     // ⚠️ non-commercial only
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'good',
    note:        'OUTDATED (2023 model). Non-commercial only (CC-BY-NC-4.0). Being superseded by CogVideoX-5B and LTX-2.3.',
    addedAt:     '2025-01-01',
    active:      false,  // REMOVED — CC-BY-NC-4.0 non-commercial only + outdated. Replaced by CogVideoX-5B
  },
  {
    key:         'hf:animatediff',
    type:        'video',
    provider:    'huggingface',
    modelId:     'guoyww/animatediff-motion-adapter-v1-5-2',
    displayName: 'AnimateDiff v1.5 (HuggingFace) — OUTDATED',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'decent',
    note:        'OUTDATED (2023 model). GIF output only. Being superseded by LTX-2.3.',
    addedAt:     '2025-01-01',
    active:      true,  // still in waterfall as last HF fallback
  },
  // ─── Video: ACTIVE 2026 models (promoted from candidates) ─────────────────
  // CogVideoX-5B and Wan2.2-TI2V-5B are now PRIMARY video providers.
  // ZeroScope (CC-BY-NC-4.0, 2023) has been REMOVED from the active waterfall.
  {
    key:         'hf:cogvideox-5b',
    type:        'video',
    provider:    'huggingface',
    modelId:     'THUDM/CogVideoX-5b',
    displayName: 'CogVideoX-5B (THUDM) — ACTIVE',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'PROMOTED 2026-04-10. Primary video model. 5B params, Apache-2.0, superior motion coherence vs ZeroScope. T2V + I2V supported.',
    addedAt:     '2026-04-10',
    active:      true,
  },
  {
    key:         'hf:wan-2.2-5b',
    type:        'video',
    provider:    'huggingface',
    modelId:     'Wan-AI/Wan2.2-TI2V-5B',
    displayName: 'Wan2.2-TI2V-5B (Alibaba) — ACTIVE',
    licence:     'Apache-2.0',
    free:        true,
    keyNeeded:   true,
    keyEnv:      'HUGGINGFACE_API_KEY',
    quality:     'excellent',
    note:        'PROMOTED 2026-04-10. Secondary video. 5B MoE, 720P 24fps, T2V+I2V, cinematic quality. Consumer-GPU friendly (24GB VRAM). Apache-2.0.',
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
