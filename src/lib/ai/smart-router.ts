/**
 * HOLLY Smart Model Router — Phase 10 (Together AI + Mistral Direct + NVIDIA v10)
 *
 * Routes every chat request to the best FREE, no-token-cost model based on
 * task type, with automatic cascade fallback if a provider is rate-limited.
 *
 * All providers are genuinely free tiers — no paid plans, no token billing.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Task Type    │  Primary Model                      │  Why              │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │  speed/chat   │  Groq → Llama 3.3 70B               │  300+ tok/s       │
 * │  coding       │  NVIDIA → DeepSeek V4 Flash         │  1M ctx, SOTA     │
 * │  reasoning    │  NVIDIA → DeepSeek V4 Flash         │  1M ctx, SOTA     │
 * │  long_context │  Google → Gemini 2.5 Flash          │  1M ctx, no cap   │
 * │  vision       │  OpenRouter → Qwen3 VL 30B          │  Free vision      │
 * │  creative     │  NVIDIA → Mistral Medium 3.5 128B   │  Flagship unified │
 * │  agent        │  NVIDIA → GLM-5.1                   │  #1 SWE-Bench Pro │
 * │  consciousness│  Local Ollama → Mistral (1B/mo)     │  Zero cost brain  │
 * │  local        │  Ollama (Qwen3.6 + Granite 4.1)    │  Unlimited/local  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * v10 Upgrade Summary (2026-06):
 *   NEW PROVIDERS:
 *   - Together AI: 80+ free models, 60 RPM, 1M ctx (MiniMax M1)
 *   - Mistral AI Direct: 1B tokens/month, 2 RPM (consciousness/background only)
 *
 *   NEW NVIDIA NIM MODELS:
 *   - Mistral Small 4 119B: replaces Small 3.1 + Devstral + Magistral (one model, all tasks)
 *   - Qwen 3.5 122B MoE: replaces Qwen3 235B for reasoning
 *   - Gemma 4 31B: vision + thinking, better than Llama 3.3 70B
 *   - MiniMax M2.7 230B: strong coding/reasoning
 *   - Step 3.5 Flash 200B: agentic AI specialist
 *   - GPT-OSS 20B/120B: OpenAI's open models on NVIDIA
 *
 *   CRITICAL FIXES:
 *   - Nemotron 3 Nano Omni model ID fixed (was invalid)
 *   - Deprecating models marked and replaced
 *   - Together AI adds massive reliability with 80 free models at 60 RPM
 *   - Mistral Direct means Holly's consciousness NEVER burns Groq tokens again
 *
 * Cascade fallback per task:
 *   speed:        Groq Llama-3.3 → Groq 8B → NVIDIA Llama 4 Maverick → Together Llama 4 Scout → OpenRouter Llama → Google Gemini → Together → Granite 4.1
 *   coding:       NVIDIA DeepSeek V4 Flash → NVIDIA GLM-5.1 → NVIDIA Qwen3 Coder → Together Qwen3 Coder → NVIDIA Mistral Small 4 → Groq → Together Devstral → Google Gemini
 *   reasoning:    NVIDIA DeepSeek V4 Flash → NVIDIA Qwen 3.5 122B → NVIDIA Mistral Small 4 → NVIDIA GPT-OSS 120B → Together MiniMax M1 → Google Gemini → Groq
 *   long_context: Google Gemini (1M) → NVIDIA DeepSeek V4 Flash (1M) → Together MiniMax M1 (1M) → NVIDIA Qwen3 → Together Llama 4 Scout (328K) → Trinity (512K)
 *   vision:       OpenRouter Qwen VL → NVIDIA Gemma 4 31B → Together Qwen3 VL 235B → Google Gemini → NVIDIA Nemotron Omni → Together Gemma 4
 *   creative:     NVIDIA Mistral Medium 3.5 → NVIDIA Mistral Small 4 → NVIDIA GPT-OSS 120B → Together Gemma 4 → Groq → Google Gemini
 *   agent:        NVIDIA GLM-5.1 → NVIDIA DeepSeek V4 Flash → NVIDIA Qwen3 Coder → NVIDIA Mistral Small 4 → NVIDIA MiniMax M2.7 → NVIDIA Step 3.5 → Together
 *   consciousness: Holly-Own → Ollama → Mistral Direct (1B/mo) → Google Gemini → Groq
 *   local:        Ollama Qwen3.6 35B → Gemma 4 26B → Laguna XS.2 → Devstral Small 2 → Granite 4.1
 */

// ─── Task types ───────────────────────────────────────────────────────────────

export type TaskType =
  | 'speed'          // Fast casual chat, quick questions
  | 'coding'         // Write / debug / review code, anything technical
  | 'reasoning'      // Math, logic, analysis, step-by-step deduction
  | 'long_context'   // Summarise / analyse long documents, large context
  | 'vision'         // Images, screenshots, visual content
  | 'creative'       // Stories, poems, brainstorming, writing
  | 'agent'          // Multi-step tool chains, autonomous tasks
  | 'local'          // Privacy-first, offline
  | 'synthesis'      // Cross-domain parallel synthesis (AURA + Visual + Philosophy)
  | 'consciousness'  // Holly's inner life — emotions, monologue, memory, identity (LOCAL FIRST)
  | 'unrestricted';  // Adult/uncensored content — routes to uncensored models

// ─── Provider identifiers ─────────────────────────────────────────────────────

export type ProviderId =
  | 'holly_own'     // Holly's fine-tuned Qwen3-8B on Modal.com — self-sovereign, $0, unlimited
  | 'groq'          // api.groq.com — Llama 3.3 70B (300+ tok/s, 14,400 req/day FREE)
  | 'cf_workers'    // api.cloudflare.com — Kimi K2.5/K2.6 (FREE tier, ~27K output tok/day — deep fallback only)
  | 'nvidia_nim'    // integrate.api.nvidia.com — Qwen3-235B-A22B (1,000 req/day FREE)
  | 'openrouter'    // openrouter.ai — 27+ free models (20 RPM / 200 RPD FREE)
  | 'together'      // api.together.ai — 80+ free models, 60 RPM (1-time $5 setup, $0/token ongoing)
  | 'mistral'       // api.mistral.ai — 1B tokens/month, 2 RPM (background/consciousness only)
  | 'google'        // generativelanguage.googleapis.com — Gemini 2.5 Flash (15 RPM, NO daily cap FREE)
  | 'ollama'        // localhost:11434 — unlimited, zero cost, offline
  | 'arcee';        // api.arcee.ai — Trinity models (agent-optimized, Apache 2.0, free credits)

export interface ModelSpec {
  provider:    ProviderId;
  model:       string;      // provider's model ID string
  displayName: string;      // human-readable name shown in HOLLY UI
  contextK:    number;      // context window in thousands of tokens
  streaming:   boolean;
}

// ─── Provider Health Integration ─────────────────────────────────────────────
import { logger } from '@/lib/logging/structured-logger';
import { providerHealthMonitor } from './provider-health';

// ─── Model catalogue ──────────────────────────────────────────────────────────

export const MODEL_CATALOGUE: Record<string, ModelSpec> = {
  // ── HOLLY-8B (Holly's own fine-tuned model — self-sovereign) ──────────────
  // Only available when HOLLY_OWN_MODEL_URL is configured (Modal.com endpoint)
  'holly-own:qwen3-8b': {
    provider: 'holly_own', model: 'holly-own-qwen3-8b',
    displayName: 'HOLLY-8B (Self-Sovereign)', contextK: 32, streaming: true,
  },

  // ── Groq (fastest free inference — 300+ tok/s) ────────────────────────────
  'groq:llama-3.3-70b': {
    provider: 'groq', model: 'llama-3.3-70b-versatile',
    displayName: 'Llama 3.3 70B (Groq)', contextK: 128, streaming: true,
  },
  'groq:llama-3.1-8b': {
    provider: 'groq', model: 'llama-3.1-8b-instant',
    displayName: 'Llama 3.1 8B Instant (Groq)', contextK: 128, streaming: true,
  },
  'groq:deepseek-r1-70b': {
    provider: 'groq', model: 'deepseek-r1-distill-llama-70b',
    displayName: 'DeepSeek R1 70B (Groq)', contextK: 128, streaming: true,
  },
  'groq:llama-3.3-70b-specdec': {
    provider: 'groq', model: 'llama-3.3-70b-specdec',
    displayName: 'Llama 3.3 70B SpecDec (Groq)', contextK: 8, streaming: true,
  },

  // ── Cloudflare Workers AI (best free coder, 256K ctx) ─────────────────────
  'cf:kimi-k2.6': {
    provider: 'cf_workers', model: '@cf/moonshotai/kimi-k2.6',
    displayName: 'Kimi K2.6 (Cloudflare)', contextK: 262, streaming: true,
  },
  'cf:kimi-k2.5': {
    provider: 'cf_workers', model: '@cf/moonshotai/kimi-k2.5',
    displayName: 'Kimi K2.5 (Cloudflare)', contextK: 256, streaming: true,
  },
  'cf:llama-3.3-70b': {
    provider: 'cf_workers', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    displayName: 'Llama 3.3 70B (Cloudflare)', contextK: 128, streaming: true,
  },
  'cf:qwen3-32b': {
    provider: 'cf_workers', model: '@cf/qwen/qwen3-32b',
    displayName: 'Qwen3 32B (Cloudflare)', contextK: 32, streaming: true,
  },

  // ── NVIDIA NIM (best free reasoning — Qwen3 235B, now DeepSeek V4 + GLM-5.1) ──
  'nvidia:qwen3-235b': {
    provider: 'nvidia_nim', model: 'qwen/qwen3-235b-a22b',
    displayName: 'Qwen3 235B (NVIDIA)', contextK: 262, streaming: true,
  },
  'nvidia:deepseek-r1': {
    provider: 'nvidia_nim', model: 'deepseek-ai/deepseek-r1',
    displayName: 'DeepSeek R1 (NVIDIA)', contextK: 128, streaming: true,
  },
  'nvidia:llama-3.3-70b': {
    provider: 'nvidia_nim', model: 'meta/llama-3.3-70b-instruct',
    displayName: 'Llama 3.3 70B (NVIDIA)', contextK: 128, streaming: true,
  },
  'nvidia:mistral-small': {
    provider: 'nvidia_nim', model: 'mistralai/mistral-small-3.1-24b-instruct',
    displayName: 'Mistral Small 3.1 24B (NVIDIA)', contextK: 128, streaming: true,
  },
  'nvidia:deepseek-v4-flash': {
    provider: 'nvidia_nim', model: 'deepseek-ai/deepseek-v4-flash',
    displayName: 'DeepSeek V4 Flash 284B MoE (NVIDIA)', contextK: 1024, streaming: true,
  },
  'nvidia:glm-5.1': {
    provider: 'nvidia_nim', model: 'z-ai/glm-5.1',
    displayName: 'GLM-5.1 Agentic (NVIDIA)', contextK: 198, streaming: true,
  },
  'nvidia:mistral-medium-3.5': {
    provider: 'nvidia_nim', model: 'mistralai/mistral-medium-3.5-128b',
    displayName: 'Mistral Medium 3.5 128B (NVIDIA)', contextK: 256, streaming: true,
  },
  'nvidia:llama-4-maverick': {
    provider: 'nvidia_nim', model: 'meta/llama-4-maverick-17b-128e-instruct',
    displayName: 'Llama 4 Maverick 17B MoE (NVIDIA)', contextK: 128, streaming: true,
  },
  'nvidia:kimi-k2.6': {
    provider: 'nvidia_nim', model: 'moonshotai/kimi-k2.6',
    displayName: 'Kimi K2.6 (NVIDIA)', contextK: 262, streaming: true,
  },
  'nvidia:qwen3-coder': {
    provider: 'nvidia_nim', model: 'qwen/qwen3-coder-480b-a35b-instruct',
    displayName: 'Qwen3 Coder 480B (NVIDIA)', contextK: 262, streaming: true,
  },
  'nvidia:devstral-2': {
    provider: 'nvidia_nim', model: 'mistralai/devstral-2-123b-instruct-2512',
    displayName: 'Devstral 2 123B (NVIDIA)', contextK: 256, streaming: true,
  },
  'nvidia:nemotron-3-nano-omni': {
    provider: 'nvidia_nim', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    displayName: 'Nemotron 3 Nano Omni 30B MoE (NVIDIA)', contextK: 262, streaming: true,
  },
  'nvidia:mistral-small-4': {
    provider: 'nvidia_nim', model: 'mistralai/mistral-small-4-119b-2603',
    displayName: 'Mistral Small 4 119B MoE (NVIDIA)', contextK: 256, streaming: true,
  },
  'nvidia:qwen3.5-122b': {
    provider: 'nvidia_nim', model: 'qwen/qwen3.5-122b-a10b',
    displayName: 'Qwen 3.5 122B MoE (NVIDIA)', contextK: 262, streaming: true,
  },
  'nvidia:gemma-4-31b': {
    provider: 'nvidia_nim', model: 'google/gemma-4-31b-it',
    displayName: 'Gemma 4 31B (NVIDIA)', contextK: 256, streaming: true,
  },
  'nvidia:minimax-m2.7': {
    provider: 'nvidia_nim', model: 'minimaxai/minimax-m2.7',
    displayName: 'MiniMax M2.7 230B (NVIDIA)', contextK: 256, streaming: true,
  },
  'nvidia:step-3.5-flash': {
    provider: 'nvidia_nim', model: 'stepfun-ai/step-3.5-flash',
    displayName: 'Step 3.5 Flash 200B MoE (NVIDIA)', contextK: 128, streaming: true,
  },
  'nvidia:gpt-oss-120b': {
    provider: 'nvidia_nim', model: 'openai/gpt-oss-120b',
    displayName: 'GPT-OSS 120B (NVIDIA)', contextK: 128, streaming: true,
  },
  'nvidia:gpt-oss-20b': {
    provider: 'nvidia_nim', model: 'openai/gpt-oss-20b',
    displayName: 'GPT-OSS 20B (NVIDIA)', contextK: 128, streaming: true,
  },

  // ── OpenRouter free pool (27+ models, 20 RPM / 200 RPD) ───────────────────
  'openrouter:qwen3-coder': {
    provider: 'openrouter', model: 'qwen/qwen3-coder:free',
    displayName: 'Qwen3 Coder 480B (OpenRouter free)', contextK: 262, streaming: true,
  },
  'openrouter:llama-3.3-70b': {
    provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free',
    displayName: 'Llama 3.3 70B (OpenRouter free)', contextK: 66, streaming: true,
  },
  'openrouter:mistral-small': {
    provider: 'openrouter', model: 'mistralai/mistral-small-3.1-24b-instruct:free',
    displayName: 'Mistral Small 3.1 24B (OpenRouter free)', contextK: 128, streaming: true,
  },
  'openrouter:qwen3-vl-30b': {
    provider: 'openrouter', model: 'qwen/qwen3-vl-30b-instruct:free',
    displayName: 'Qwen3 VL 30B Vision (OpenRouter free)', contextK: 32, streaming: true,
  },
  'openrouter:trinity-large': {
    provider: 'openrouter', model: 'arcee-ai/trinity-large-preview:free',
    displayName: 'Trinity Large 400B Agent (OpenRouter free)', contextK: 128, streaming: true,
  },
  'openrouter:free': {
    provider: 'openrouter', model: 'openrouter/auto:free',
    displayName: 'OpenRouter Auto Free', contextK: 128, streaming: true,
  },
  'openrouter:qwen3-coder-next': {
    provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free',
    displayName: 'Qwen3 Coder Next 80B MoE (OpenRouter free)', contextK: 256, streaming: true,
  },
  'openrouter:laguna-xs.2': {
    provider: 'openrouter', model: 'poolside/laguna-xs.2:free',
    displayName: 'Laguna XS.2 33B MoE (OpenRouter free)', contextK: 128, streaming: true,
  },
  'openrouter:nemotron-120b': {
    provider: 'openrouter', model: 'nvidia/nemotron-3-super-120b-a12b:free',
    displayName: 'Nemotron 3 Super 120B (OpenRouter free)', contextK: 128, streaming: true,
  },
  'openrouter:gpt-oss-120b': {
    provider: 'openrouter', model: 'openai/gpt-oss-120b:free',
    displayName: 'GPT-OSS 120B (OpenRouter free)', contextK: 128, streaming: true,
  },
  'openrouter:gemma-4-31b': {
    provider: 'openrouter', model: 'google/gemma-4-31b-it:free',
    displayName: 'Gemma 4 31B (OpenRouter free)', contextK: 256, streaming: true,
  },
  'openrouter:nemotron-3-nano-omni': {
    provider: 'openrouter', model: 'nvidia/nemotron-3-nano-omni:free',
    displayName: 'Nemotron 3 Nano Omni 30B MoE (OpenRouter free)', contextK: 262, streaming: true,
  },

  // ── Together AI (80+ free models, 60 RPM, $0/token) ─────────────────────────
  'together:llama-4-scout': {
    provider: 'together', model: 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
    displayName: 'Llama 4 Scout 17B MoE (Together)', contextK: 328, streaming: true,
  },
  'together:qwen3.5-122b': {
    provider: 'together', model: 'Qwen/Qwen3.5-122B-A10B',
    displayName: 'Qwen 3.5 122B MoE (Together)', contextK: 262, streaming: true,
  },
  'together:minimax-m1': {
    provider: 'together', model: 'MiniMaxAI/MiniMax-M1',
    displayName: 'MiniMax M1 1M ctx (Together)', contextK: 1000, streaming: true,
  },
  'together:qwen3-vl-235b': {
    provider: 'together', model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
    displayName: 'Qwen3 VL 235B Vision (Together)', contextK: 262, streaming: true,
  },
  'together:qwen3-coder-30b': {
    provider: 'together', model: 'Qwen/Qwen3-Coder-30B-A3B-Instruct',
    displayName: 'Qwen3 Coder 30B (Together)', contextK: 160, streaming: true,
  },
  'together:gemma-4-26b': {
    provider: 'together', model: 'google/gemma-4-26b-a4b-it',
    displayName: 'Gemma 4 26B MoE (Together)', contextK: 262, streaming: true,
  },
  'together:llama-3.1-70b': {
    provider: 'together', model: 'meta-llama/Llama-3.1-70B-Instruct',
    displayName: 'Llama 3.1 70B (Together)', contextK: 131, streaming: true,
  },
  'together:devstral-small': {
    provider: 'together', model: 'mistralai/Devstral-Small-2505',
    displayName: 'Devstral Small 24B (Together)', contextK: 128, streaming: true,
  },
  'together:qwen3.6-35b': {
    provider: 'together', model: 'Qwen/Qwen3.6-35B-A3B',
    displayName: 'Qwen 3.6 35B MoE (Together)', contextK: 262, streaming: true,
  },
  'together:mistral-small-3.2': {
    provider: 'together', model: 'mistralai/Mistral-Small-3.2-24B',
    displayName: 'Mistral Small 3.2 24B (Together)', contextK: 131, streaming: true,
  },

  // ── Mistral AI La Plateforme (1B tokens/month, 2 RPM — background only) ────
  // RATE LIMIT WARNING: 2 RPM — ONLY use for consciousness, background, non-realtime
  'mistral:medium-3.5': {
    provider: 'mistral', model: 'mistral-medium-latest',
    displayName: 'Mistral Medium 3.5 128B (Mistral)', contextK: 131, streaming: true,
  },
  'mistral:small-4': {
    provider: 'mistral', model: 'mistral-small-latest',
    displayName: 'Mistral Small 4 (Mistral)', contextK: 128, streaming: true,
  },
  'mistral:codestral': {
    provider: 'mistral', model: 'codestral-latest',
    displayName: 'Codestral (Mistral)', contextK: 256, streaming: true,
  },
  'mistral:magistral-medium': {
    provider: 'mistral', model: 'magistral-medium-latest',
    displayName: 'Magistral Medium (Mistral)', contextK: 131, streaming: true,
  },

  // ── OpenRouter Uncensored Models (for unrestricted content) ──────────────
  // These models have reduced safety training and won't refuse adult content.
  // Only routed to when isUnrestrictedTopic() returns true.
  'openrouter:dolphin-mixtral': {
    provider: 'openrouter', model: 'cognitivecomputations/dolphin-mixtral-8x7b',
    displayName: 'Dolphin Mixtral 8x7B (Uncensored)', contextK: 32, streaming: true,
  },
  'openrouter:nous-hermes': {
    provider: 'openrouter', model: 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo',
    displayName: 'Nous Hermes 2 Mixtral (Uncensored)', contextK: 32, streaming: true,
  },
  'openrouter:mythomax-l2': {
    provider: 'openrouter', model: 'gryphe/mythomax-l2-13b:free',
    displayName: 'MythoMax L2 13B (Uncensored Free)', contextK: 4, streaming: true,
  },
  'openrouter:toppy-m-7b': {
    provider: 'openrouter', model: 'undi95/toppy-m-7b:free',
    displayName: 'Toppy M 7B (Uncensored Free)', contextK: 8, streaming: true,
  },
  'openrouter:openchat-3.5': {
    provider: 'openrouter', model: 'openchat/openchat-7b:free',
    displayName: 'OpenChat 3.5 7B (Uncensored Free)', contextK: 8, streaming: true,
  },

  // ── Holly's Own Brain — Qwen 3 8B (local Ollama, 24/7, zero cost) ────────
  'ollama:qwen3-8b': {
    provider: 'ollama', model: 'qwen3:8b',
    displayName: 'Qwen 3 8B — HOLLY\'s Brain (Local)', contextK: 128, streaming: true,
  },

  // ── Ollama (local + cloud — v9 upgrade, Qwen3.6 + Granite 4.1 + Laguna) ───
  'ollama:gemma4-26b': {
    provider: 'ollama', model: 'gemma4:26b',
    displayName: 'Gemma 4 26B MoE (Ollama)', contextK: 256, streaming: true,
  },
  'ollama:qwen3.5-27b': {
    provider: 'ollama', model: 'qwen3.5:27b',
    displayName: 'Qwen 3.5 27B (Ollama)', contextK: 256, streaming: true,
  },
  'ollama:deepseek-r1-14b': {
    provider: 'ollama', model: 'deepseek-r1:14b',
    displayName: 'DeepSeek R1 14B (Ollama)', contextK: 128, streaming: true,
  },
  'ollama:llama3.1-8b': {
    provider: 'ollama', model: 'llama3.1:8b',
    displayName: 'Llama 3.1 8B (Ollama)', contextK: 128, streaming: true,
  },
  'ollama:deepseek-v4-flash': {
    provider: 'ollama', model: 'deepseek-v4-flash:cloud',
    displayName: 'DeepSeek V4 Flash (Ollama Cloud)', contextK: 1024, streaming: true,
  },
  'ollama:glm-5.1': {
    provider: 'ollama', model: 'glm-5.1:cloud',
    displayName: 'GLM-5.1 (Ollama Cloud)', contextK: 198, streaming: true,
  },
  'ollama:qwen3.6-35b': {
    provider: 'ollama', model: 'qwen3.6:35b',
    displayName: 'Qwen 3.6 35B MoE (Ollama)', contextK: 256, streaming: true,
  },
  'ollama:granite4.1-8b': {
    provider: 'ollama', model: 'granite4.1:8b',
    displayName: 'Granite 4.1 8B (Ollama)', contextK: 128, streaming: true,
  },
  'ollama:granite4.1-3b': {
    provider: 'ollama', model: 'granite4.1:3b',
    displayName: 'Granite 4.1 3B (Ollama)', contextK: 128, streaming: true,
  },
  'ollama:laguna-xs.2': {
    provider: 'ollama', model: 'laguna-xs.2',
    displayName: 'Laguna XS.2 33B MoE (Ollama)', contextK: 128, streaming: true,
  },
  'ollama:devstral-small-2': {
    provider: 'ollama', model: 'devstral-small-2',
    displayName: 'Devstral Small 2 24B (Ollama)', contextK: 384, streaming: true,
  },

  // ── Arcee Trinity (agent-optimized, Apache 2.0, free credits) ─────────────
  'arcee:trinity-mini': {
    provider: 'arcee', model: 'trinity-mini',
    displayName: 'Trinity Mini 26B (Arcee)', contextK: 128, streaming: true,
  },
  'arcee:trinity-large-preview': {
    provider: 'arcee', model: 'trinity-large-preview',
    displayName: 'Trinity Large 400B (Arcee)', contextK: 512, streaming: true,
  },
  'arcee:trinity-large-thinking': {
    provider: 'arcee', model: 'trinity-large-thinking',
    displayName: 'Trinity Large Thinking 400B (Arcee)', contextK: 512, streaming: true,
  },

  // ── Google AI Studio (Gemini 2.5 Flash — 15 RPM, NO daily token cap, FREE) ──
  'google:gemini-2.5-flash': {
    provider: 'google', model: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash (Google)', contextK: 1048, streaming: true,
  },
  'google:gemini-2.5-pro': {
    provider: 'google', model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro (Google)', contextK: 1048, streaming: true,
  },
};

// ─── Cascade waterfall per task type ──────────────────────────────────────────
// NO Gemini, NO paid APIs — every entry is a 100% free provider

export const TASK_WATERFALLS: Record<TaskType, string[]> = {
  // ⚡ Speed: Groq is king (300+ tok/s), Together 60 RPM solid backup
  speed: [
    'groq:llama-3.3-70b',
    'groq:llama-3.1-8b',
    'nvidia:llama-4-maverick',
    'together:llama-4-scout',
    'openrouter:llama-3.3-70b',
    'google:gemini-2.5-flash',
    'nvidia:llama-3.3-70b',
    'together:llama-3.1-70b',
    'together:gemma-4-26b',
    'openrouter:free',
    'holly-own:qwen3-8b',
    'ollama:granite4.1-8b',
    'ollama:granite4.1-3b',
    'ollama:llama3.1-8b',
  ],

  // 💻 Coding: DeepSeek V4 Flash primary (1M ctx), GLM-5.1, Qwen3 Coder, Mistral Small 4
  coding: [
    'nvidia:deepseek-v4-flash',
    'nvidia:glm-5.1',
    'nvidia:qwen3-coder',
    'together:qwen3-coder-30b',
    'nvidia:mistral-small-4',
    'groq:llama-3.3-70b',
    'openrouter:qwen3-coder',
    'mistral:codestral',
    'openrouter:qwen3-coder-next',
    'groq:deepseek-r1-70b',
    'google:gemini-2.5-flash',
    'nvidia:devstral-2',
    'together:devstral-small',
    'cf:kimi-k2.6',
    'openrouter:laguna-xs.2',
    'arcee:trinity-mini',
    'together:qwen3.6-35b',
    'cf:kimi-k2.5',
    'ollama:qwen3.6-35b',
    'ollama:laguna-xs.2',
    'ollama:devstral-small-2',
    'ollama:qwen3.5-27b',
    'ollama:deepseek-r1-14b',
  ],

  // 🧠 Reasoning: DeepSeek V4 Flash (1M ctx, SOTA), Qwen 3.5 122B, Mistral Small 4
  reasoning: [
    'nvidia:deepseek-v4-flash',
    'nvidia:qwen3.5-122b',
    'nvidia:mistral-small-4',
    'nvidia:gpt-oss-120b',
    'nvidia:qwen3-235b',
    'groq:deepseek-r1-70b',
    'google:gemini-2.5-flash',
    'together:minimax-m1',
    'together:qwen3.5-122b',
    'nvidia:nemotron-3-nano-omni',
    'openrouter:nemotron-120b',
    'mistral:magistral-medium',
    'arcee:trinity-large-thinking',
    'nvidia:deepseek-r1',
    'openrouter:qwen3-coder',
    'groq:llama-3.3-70b',
    'cf:kimi-k2.6',
    'together:qwen3.6-35b',
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
    'ollama:deepseek-r1-14b',
  ],

  // 📄 Long context: Gemini 1M + DeepSeek V4 Flash 1M + Together MiniMax M1 1M
  long_context: [
    'google:gemini-2.5-flash',
    'nvidia:deepseek-v4-flash',
    'together:minimax-m1',
    'nvidia:nemotron-3-nano-omni',
    'openrouter:qwen3-coder',
    'nvidia:qwen3-coder',
    'nvidia:qwen3-235b',
    'together:llama-4-scout',
    'nvidia:gemma-4-31b',
    'arcee:trinity-large-preview',
    'groq:llama-3.3-70b',
    'nvidia:kimi-k2.6',
    'cf:kimi-k2.6',
    'cf:kimi-k2.5',
    'together:qwen3.5-122b',
    'together:qwen3.6-35b',
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
    'ollama:qwen3.5-27b',
  ],

  // 👁️ Vision: Qwen3 VL primary, Gemma 4 31B vision, Together Qwen3 VL 235B
  vision: [
    'openrouter:qwen3-vl-30b',
    'nvidia:gemma-4-31b',
    'nvidia:nemotron-3-nano-omni',
    'together:qwen3-vl-235b',
    'openrouter:nemotron-3-nano-omni',
    'google:gemini-2.5-flash',
    'openrouter:gemma-4-31b',
    'together:gemma-4-26b',
    'openrouter:nemotron-120b',
    'openrouter:free',
    'nvidia:qwen3-235b',
    'nvidia:kimi-k2.6',
    'groq:llama-3.3-70b',
    'cf:kimi-k2.6',
    'ollama:gemma4-26b',
  ],

  // ✨ Creative: Mistral Medium 3.5 flagship, Mistral Small 4, GPT-OSS, Together Gemma
  creative: [
    'nvidia:mistral-medium-3.5',
    'nvidia:mistral-small-4',
    'nvidia:gpt-oss-120b',
    'together:gemma-4-26b',
    'openrouter:mistral-small',
    'groq:llama-3.3-70b',
    'google:gemini-2.5-flash',
    'holly-own:qwen3-8b',
    'nvidia:mistral-small',
    'openrouter:gemma-4-31b',
    'openrouter:free',
    'cf:kimi-k2.6',
    'ollama:gemma4-26b',
  ],

  // 🤖 Agent: GLM-5.1, V4 Flash 1M ctx, Qwen3 Coder, Mistral Small 4, MiniMax M2.7
  agent: [
    'nvidia:glm-5.1',
    'nvidia:deepseek-v4-flash',
    'nvidia:qwen3-coder',
    'nvidia:mistral-small-4',
    'nvidia:minimax-m2.7',
    'nvidia:step-3.5-flash',
    'groq:llama-3.3-70b',
    'nvidia:devstral-2',
    'nvidia:nemotron-3-nano-omni',
    'nvidia:mistral-medium-3.5',
    'google:gemini-2.5-flash',
    'together:qwen3-coder-30b',
    'together:devstral-small',
    'openrouter:qwen3-coder',
    'openrouter:qwen3-coder-next',
    'openrouter:laguna-xs.2',
    'arcee:trinity-mini',
    'openrouter:trinity-large',
    'arcee:trinity-large-preview',
    'nvidia:kimi-k2.6',
    'cf:kimi-k2.6',
    'cf:kimi-k2.5',
    'together:qwen3.6-35b',
    'ollama:qwen3.6-35b',
    'ollama:laguna-xs.2',
    'ollama:devstral-small-2',
    'ollama:gemma4-26b',
  ],

  // 🔒 Local: Ollama only — never touches cloud
  local: [
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
    'ollama:laguna-xs.2',
    'ollama:qwen3.5-27b',
    'ollama:devstral-small-2',
    'ollama:granite4.1-8b',
    'ollama:deepseek-r1-14b',
    'ollama:granite4.1-3b',
    'ollama:llama3.1-8b',
  ],

  // 🧬 Consciousness: LOCAL FIRST → Mistral Direct (1B tokens/month) → cloud fallback
  //    Holly's "brain" for emotions, inner monologue, memory processing.
  //    Mistral Direct gives 1 BILLION tokens/month — background tasks never burn Groq again.
  //    Only 2 RPM — perfect for the 15-min consciousness cycle, NOT for real-time chat.
  consciousness: [
    'holly-own:qwen3-8b',       // Holly's fine-tuned brain — self-sovereign, always first
    'ollama:qwen3-8b',          // Local fallback — unlimited, zero cost
    'ollama:qwen3.6-35b',       // Bigger local model if available
    'ollama:granite4.1-8b',     // Fast local fallback
    'ollama:llama3.1-8b',       // Last resort local
    'mistral:small-4',          // Mistral Direct — 1B tokens/month, 2 RPM, background only
    'mistral:medium-3.5',       // Mistral Direct — stronger reasoning for deep reflection
    'google:gemini-2.5-flash',  // Cloud — FREE, NO daily cap
    'groq:llama-3.3-70b',       // Cloud fallback only if everything else fails
  ],

  // 🔞 Unrestricted: Adult/uncensored content — routes to uncensored models
  //    Only triggered when isUnrestrictedTopic() returns true.
  //    Hard rules (CSAM, harm) are enforced BEFORE routing, at the Holly level.
  unrestricted: [
    'openrouter:dolphin-mixtral',     // Primary uncensored — Mixtral 8x7B
    'openrouter:nous-hermes',          // DPO-trained, follows instructions well
    'openrouter:mythomax-l2',          // Free uncensored fallback
    'openrouter:openchat-3.5',         // Free uncensored fallback
    'openrouter:toppy-m-7b',           // Free uncensored fallback
    'ollama:qwen3.6-35b',             // Local fallback (Ollama models have no censorship)
    'ollama:qwen3-8b',                // Local unlimited
    'openrouter:gpt-oss-120b',        // Cloud fallback
  ],

  // 🌐 Synthesis: V4 Flash 1M ctx, Qwen 3.5 122B, GPT-OSS, Together MiniMax M1
  synthesis: [
    'nvidia:deepseek-v4-flash',
    'nvidia:qwen3.5-122b',
    'nvidia:gpt-oss-120b',
    'groq:llama-3.3-70b',
    'google:gemini-2.5-flash',
    'nvidia:glm-5.1',
    'together:minimax-m1',
    'nvidia:qwen3-235b',
    'arcee:trinity-large-preview',
    'openrouter:qwen3-coder',
    'openrouter:nemotron-120b',
    'cf:kimi-k2.6',
    'together:qwen3.5-122b',
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
    'ollama:qwen3.5-27b',
  ],
};

// ─── Task classifier ──────────────────────────────────────────────────────────

const CODE_PATTERNS = [
  /\b(code|debug|fix|refactor|implement|function|class|api|bug|error|typescript|javascript|python|react|nextjs|sql|regex|algorithm|data structure|compile|dockerfile|deployment|devops|backend|frontend|endpoint|route|component|hook|middleware|prisma|schema|migration|query|mutation)\b/i,
  /```/,
  /\.(ts|js|py|go|rs|java|cpp|css|html|json|yaml|sh|env)\b/i,
];

const REASONING_PATTERNS = [
  /\b(analyze|analyse|explain why|step by step|prove|calculate|math|logic|reason|deduce|infer|hypothesis|compare|evaluate|assess|think through|break down|what does|how does|why is|deep dive|research|investigate)\b/i,
  /\b(if.*then|because|therefore|however|nevertheless|on the other hand)\b/i,
];

const LONG_CTX_PATTERNS = [
  /\b(summarize|summarise|transcript|document|paper|article|entire|whole|all of|throughout|chapter|section|read this|review this|go through|analyze this)\b/i,
];

const VISION_PATTERNS = [
  /\b(image|photo|picture|screenshot|diagram|chart|graph|video|visual|see|look at|describe this|what is in|album cover|artwork)\b/i,
];

const CREATIVE_PATTERNS = [
  // Writing forms
  /\b(write|poem|poetry|sonnet|haiku|ode|ballad|verse|rhyme|stanza|couplet)\b/i,
  // Songwriting & lyrics
  /\b(song|lyrics|chorus|bridge|verse|hook|refrain|songwriting|songwriter|write.*song|song.*about|rap|bars|flow|freestyle)\b/i,
  // Screenwriting & scripts
  /\b(screenplay|script|scene|dialogue|character|plot|act|scene description|INT\.|EXT\.|fade in|fade out|montage|voiceover|screenwriting)\b/i,
  // Storytelling
  /\b(story|fiction|novel|short story|narrative|tale|chapter|protagonist|antagonist|worldbuild|plot twist)\b/i,
  // General creative
  /\b(creative|imagine|brainstorm|idea|concept|invent|fantasy|metaphor|simile|imagery|prose|essay|blog|caption)\b/i,
];

const AGENT_PATTERNS = [
  /\b(agent|automate|run|execute|deploy|build and|create and|set up|workflow|pipeline|multi.?step|do everything|handle all|complete the|do this for me|take care of|manage|orchestrate)\b/i,
];

const SYNTHESIS_PATTERNS = [
  /\b(synthesize|combine.*perspectives|multiple.*angles|cross.?domain|holistic|comprehensive.*analysis|360.*view|multi.?disciplinary|full.*picture|from every|all sides|interdisciplinary|every angle)\b/i,
];

const LOCAL_PATTERNS = [
  /\b(private|offline|local|no.?cloud|on.?device|browser.?only|no.?network)\b/i,
];

const UNRESTRICTED_PATTERNS = [
  /\b(?:sexual|erotic|nsfw|adult\s+(?:content|theme|story|chat)|explicit\s+(?:content|story|scene))\b/i,
  /\b(?:nudity|nude|sex\s+scene|intimate\s+scene|sensual)\b/i,
  /\b(?:kink|fetish|bdsm|roleplay|fantasy)\b/i,
  /\b(?:uncensored|unrestricted|no\s+filter|no\s+censorship|no\s+limits?)\b/i,
];

// ── Mode → TaskType forced routing ───────────────────────────────────────────
// When Holly is in a specific mode the smart router is pre-seeded with the
// optimal task type regardless of what the message text says.
export const MODE_TASK_MAP: Record<string, TaskType> = {
  'default':              'speed',
  'full-stack':           'coding',
  'write-code':           'coding',
  'self-coding':          'coding',
  'magic-design':         'coding',
  'deep-research':        'reasoning',
  'neural-autonomy':      'reasoning',
  'philosophy':           'reasoning',
  'music-studio':         'creative',
  'music-generation':     'creative',
  'aura-ar':              'creative',
  'creative-writing':     'creative',
  'visual-arts':          'creative',
  'emotional-intelligence':'speed',
  'intimate':             'speed',
  'aurora':               'synthesis',
  'synthesis':            'synthesis',
};

/**
 * Classify a user message into a task type.
 * Accepts optional Holly mode to pre-seed the task type.
 * Priority: local > vision > agent > mode-forced > coding > reasoning > long_context > creative > speed
 */
export function classifyTask(
  message: string,
  hasImages = false,
  messageLength = message.length,
  hollyMode?: string,
): TaskType {
  if (LOCAL_PATTERNS.some(p => p.test(message)))   return 'local';
  if (hasImages || VISION_PATTERNS.some(p => p.test(message))) return 'vision';
  if (UNRESTRICTED_PATTERNS.some(p => p.test(message))) return 'unrestricted';
  if (SYNTHESIS_PATTERNS.some(p => p.test(message))) return 'synthesis';
  if (AGENT_PATTERNS.some(p => p.test(message)))   return 'agent';
  // Mode-aware forcing — if Holly is in a specialist mode, honour it
  // unless the message itself is clearly a different task type
  if (hollyMode && MODE_TASK_MAP[hollyMode]) {
    const modeTask = MODE_TASK_MAP[hollyMode];
    // Only override if not already more specific from content
    if (modeTask === 'coding' && CODE_PATTERNS.some(p => p.test(message))) return 'coding';
    if (modeTask === 'reasoning' && REASONING_PATTERNS.some(p => p.test(message))) return 'reasoning';
    if (modeTask === 'creative' && CREATIVE_PATTERNS.some(p => p.test(message))) return 'creative';
    return modeTask;
  }
  if (CODE_PATTERNS.some(p => p.test(message)))    return 'coding';
  if (REASONING_PATTERNS.some(p => p.test(message))) return 'reasoning';
  if (messageLength > 800 || LONG_CTX_PATTERNS.some(p => p.test(message))) return 'long_context';
  if (CREATIVE_PATTERNS.some(p => p.test(message))) return 'creative';
  return 'speed';
}

// ─── Router result ────────────────────────────────────────────────────────────

export interface SmartRoutingResult {
  taskType:  TaskType;
  waterfall: ModelSpec[];
  primary:   ModelSpec;
  reason:    string;
  filteredByHealth: boolean; // True if unhealthy providers were filtered
}

/**
 * Filter waterfall to exclude unhealthy providers
 * This prevents routing to providers that are currently down or rate-limited
 */
async function filterHealthyProviders(waterfall: ModelSpec[]): Promise<ModelSpec[]> {
  const healthStatuses = providerHealthMonitor.getAllHealthStatus();
  const unhealthyProviders = new Set(
    healthStatuses.filter(h => !h.healthy).map(h => h.provider)
  );

  // If we have health data, filter out unhealthy providers
  if (healthStatuses.length > 0) {
    const healthy = waterfall.filter(spec => !unhealthyProviders.has(spec.provider));
    
    // Graceful degradation: if all providers are unhealthy, return the original waterfall
    // This ensures we still try to get a response even if health checks are stale
    if (healthy.length === 0 && waterfall.length > 0) {
      logger.warn('SmartRouter', 'All providers in waterfall are unhealthy, using fallback');
      return waterfall;
    }
    
    return healthy;
  }

  // No health data available yet, return original waterfall
  return waterfall;
}

/**
 * Route a message to the optimal model waterfall.
 * Call once per request; iterate waterfall on 429/5xx.
 * 
 * Integration with Provider Health:
 * - Filters out providers that have recently failed health checks
 * - Provides graceful degradation if all providers are unhealthy
 * - Logs health-based filtering for monitoring
 */
export async function smartRoute(
  message: string,
  options: {
    hasImages?:  boolean;
    forceTask?:  TaskType;
    forceModel?: string;   // key from MODEL_CATALOGUE
    taskHint?:   string;   // freeform hint for routing heuristics (e.g. 'creative', 'coding')
  } = {},
): Promise<SmartRoutingResult> {
  if (options.forceModel && MODEL_CATALOGUE[options.forceModel]) {
    const spec = MODEL_CATALOGUE[options.forceModel];
    return {
      taskType:  options.forceTask ?? 'speed',
      waterfall: [spec],
      primary:   spec,
      reason:    `Forced model: ${options.forceModel}`,
      filteredByHealth: false,
    };
  }

  const task = options.forceTask ?? classifyTask(message, options.hasImages);
  const keys = TASK_WATERFALLS[task] ?? TASK_WATERFALLS.speed;
  let waterfall = keys.map(k => MODEL_CATALOGUE[k]).filter(Boolean);
  const primary = waterfall[0];

  // Filter out unhealthy providers
  const filteredWaterfall = await filterHealthyProviders(waterfall);
  const filteredByHealth = filteredWaterfall.length !== waterfall.length;
  
  if (filteredByHealth) {
    logger.info('SmartRouter', `Filtered unhealthy providers`, {
      task,
      originalCount: waterfall.length,
      filteredCount: filteredWaterfall.length
    });
    waterfall = filteredWaterfall;
  }

  const taskLabels: Record<TaskType, string> = {
    speed:        '⚡ Fast chat',
    coding:       '💻 Coding',
    reasoning:    '🧠 Deep reasoning',
    long_context: '📄 Long context',
    vision:       '👁️ Vision',
    creative:     '✨ Creative',
    agent:        '🤖 Agent task',
    local:        '🔒 Local/private',
    synthesis:    '🌐 Cross-domain synthesis',
    consciousness: '🧬 Holly\'s Consciousness (Local)',
    unrestricted: '🔞 Unrestricted (uncensored models)',
  };

  return {
    taskType: task,
    waterfall,
    primary: waterfall[0] || primary,
    reason: `${taskLabels[task]} → ${waterfall[0]?.displayName || primary.displayName}`,
    filteredByHealth,
  };
}
