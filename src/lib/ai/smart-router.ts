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
 * │  speed/chat   │  Groq → Llama 3.3 70B               │  280+ tok/s       │
 * │  coding       │  NVIDIA → DeepSeek V4 Flash         │  1M ctx, SOTA     │
 * │  reasoning    │  NVIDIA → DeepSeek V4 Flash         │  1M ctx, SOTA     │
 * │  long_context │  Google → Gemini 2.5 Flash          │  1M ctx, 250 RPD  │
 * │  vision       │  OpenRouter → Kimi K2.6             │  Free, multimodal │
 * │  creative     │  NVIDIA → Nemotron 3 Ultra 550B     │  1M ctx, frontier │
 * │  agent        │  NVIDIA → GLM-5.1                   │  #1 SWE-Bench Pro │
 * │  consciousness│  Local Ollama → Qwen 3 8B           │  Zero cost brain  │
 * │  unrestricted │  OpenRouter → Dolphin Venice 24B    │  Uncensored chat  │
 * │  local        │  Ollama (Qwen3.6 + Gemma 4)         │  Unlimited/local  │
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
  'holly-own:qwen3-8b': {
    provider: 'holly_own', model: 'holly-own-qwen3-8b',
    displayName: 'HOLLY-8B (Self-Sovereign)', contextK: 32, streaming: true,
  },

  // ── Groq (fastest free inference — 280+ tok/s, native tool calling) ───────
  'groq:llama-3.3-70b': {
    provider: 'groq', model: 'llama-3.3-70b-versatile',
    displayName: 'Llama 3.3 70B (Groq)', contextK: 128, streaming: true,
  },
  'groq:gpt-oss-120b': {
    provider: 'groq', model: 'openai/gpt-oss-120b',
    displayName: 'GPT-OSS 120B (Groq)', contextK: 128, streaming: true,
  },
  'groq:gpt-oss-20b': {
    provider: 'groq', model: 'openai/gpt-oss-20b',
    displayName: 'GPT-OSS 20B (Groq)', contextK: 128, streaming: true,
  },
  'groq:llama-4-scout': {
    provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    displayName: 'Llama 4 Scout 17B MoE (Groq)', contextK: 128, streaming: true,
  },

  // ── NVIDIA NIM (~40 RPM free, 1M ctx models) ──────────────────────────────
  'nvidia:deepseek-v4-flash': {
    provider: 'nvidia_nim', model: 'deepseek-ai/deepseek-v4-flash',
    displayName: 'DeepSeek V4 Flash 284B MoE (NVIDIA)', contextK: 1024, streaming: true,
  },
  'nvidia:deepseek-v4-pro': {
    provider: 'nvidia_nim', model: 'deepseek-ai/deepseek-v4-pro',
    displayName: 'DeepSeek V4 Pro 1.6T MoE (NVIDIA)', contextK: 1024, streaming: true,
  },
  'nvidia:glm-5.1': {
    provider: 'nvidia_nim', model: 'z-ai/glm-5.1',
    displayName: 'GLM-5.1 Agentic (NVIDIA)', contextK: 198, streaming: true,
  },
  'nvidia:glm-4.7': {
    provider: 'nvidia_nim', model: 'z-ai/glm-4.7',
    displayName: 'GLM-4.7 (NVIDIA)', contextK: 198, streaming: true,
  },
  'nvidia:qwen3-coder': {
    provider: 'nvidia_nim', model: 'qwen/qwen3-coder-480b-a35b-instruct',
    displayName: 'Qwen3 Coder 480B (NVIDIA)', contextK: 262, streaming: true,
  },
  'nvidia:qwen3.5-122b': {
    provider: 'nvidia_nim', model: 'qwen/qwen3-5-122b-a10b',
    displayName: 'Qwen 3.5 122B MoE (NVIDIA)', contextK: 262, streaming: true,
  },
  'nvidia:nemotron-3-ultra': {
    provider: 'nvidia_nim', model: 'nvidia/nemotron-3-ultra-550b-a55b',
    displayName: 'Nemotron 3 Ultra 550B (NVIDIA)', contextK: 1024, streaming: true,
  },
  'nvidia:nemotron-3-super': {
    provider: 'nvidia_nim', model: 'nvidia/nemotron-3-super-120b-a12b',
    displayName: 'Nemotron 3 Super 120B (NVIDIA)', contextK: 1024, streaming: true,
  },
  'nvidia:llama-4-maverick': {
    provider: 'nvidia_nim', model: 'meta/llama-4-maverick-17b-128e-instruct',
    displayName: 'Llama 4 Maverick 17B MoE (NVIDIA)', contextK: 128, streaming: true,
  },
  'nvidia:nemotron-3-nano-omni': {
    provider: 'nvidia_nim', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
    displayName: 'Nemotron 3 Nano Omni 30B MoE (NVIDIA)', contextK: 262, streaming: true,
  },
  'nvidia:minimax-m2.7': {
    provider: 'nvidia_nim', model: 'minimaxai/minimax-m2.7',
    displayName: 'MiniMax M2.7 230B (NVIDIA)', contextK: 256, streaming: true,
  },
  'nvidia:step-3.5-flash': {
    provider: 'nvidia_nim', model: 'stepfun-ai/step-3.5-flash',
    displayName: 'Step 3.5 Flash 200B MoE (NVIDIA)', contextK: 128, streaming: true,
  },
  'nvidia:mistral-nemotron': {
    provider: 'nvidia_nim', model: 'mistralai/mistral-nemotron',
    displayName: 'Mistral Nemotron (NVIDIA)', contextK: 256, streaming: true,
  },

  // ── OpenRouter free pool (20 RPM / 200 RPD per model) ─────────────────────
  'openrouter:kimi-k2.6': {
    provider: 'openrouter', model: 'moonshotai/kimi-k2.6:free',
    displayName: 'Kimi K2.6 Coding Agent (OpenRouter free)', contextK: 262, streaming: true,
  },
  'openrouter:nemotron-3-ultra': {
    provider: 'openrouter', model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    displayName: 'Nemotron 3 Ultra 550B (OpenRouter free)', contextK: 1024, streaming: true,
  },
  'openrouter:nemotron-3-super': {
    provider: 'openrouter', model: 'nvidia/nemotron-3-super-120b-a12b:free',
    displayName: 'Nemotron 3 Super 120B (OpenRouter free)', contextK: 1024, streaming: true,
  },
  'openrouter:gpt-oss-120b': {
    provider: 'openrouter', model: 'openai/gpt-oss-120b:free',
    displayName: 'GPT-OSS 120B (OpenRouter free)', contextK: 128, streaming: true,
  },
  'openrouter:gemma-4-31b': {
    provider: 'openrouter', model: 'google/gemma-4-31b-it:free',
    displayName: 'Gemma 4 31B Multimodal (OpenRouter free)', contextK: 256, streaming: true,
  },
  'openrouter:qwen3-coder': {
    provider: 'openrouter', model: 'qwen/qwen3-coder:free',
    displayName: 'Qwen3 Coder 480B (OpenRouter free)', contextK: 1024, streaming: true,
  },
  'openrouter:laguna-m.1': {
    provider: 'openrouter', model: 'poolside/laguna-m.1:free',
    displayName: 'Laguna M.1 Coding Agent (OpenRouter free)', contextK: 262, streaming: true,
  },
  'openrouter:laguna-xs.2': {
    provider: 'openrouter', model: 'poolside/laguna-xs.2:free',
    displayName: 'Laguna XS.2 Coding Agent (OpenRouter free)', contextK: 262, streaming: true,
  },
  'openrouter:glm-4.5-air': {
    provider: 'openrouter', model: 'z-ai/glm-4.5-air:free',
    displayName: 'GLM-4.5 Air (OpenRouter free)', contextK: 131, streaming: true,
  },
  'openrouter:qwen3-next-80b': {
    provider: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free',
    displayName: 'Qwen3 Next 80B MoE (OpenRouter free)', contextK: 262, streaming: true,
  },
  'openrouter:nemotron-3-nano-omni': {
    provider: 'openrouter', model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    displayName: 'Nemotron 3 Nano Omni (OpenRouter free)', contextK: 262, streaming: true,
  },

  // ── OpenRouter Uncensored (NO tool calling — text-only conversation) ──────
  'openrouter:dolphin-venice-24b': {
    provider: 'openrouter', model: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free',
    displayName: 'Dolphin Mistral 24B Venice (Uncensored)', contextK: 33, streaming: true,
  },
  'openrouter:hermes-3-405b': {
    provider: 'openrouter', model: 'nousresearch/hermes-3-llama-3.1-405b:free',
    displayName: 'Hermes 3 Llama 3.1 405B (Uncensored)', contextK: 131, streaming: true,
  },

  // ── Together AI (80+ free models, 60 RPM, $0/token) ───────────────────────
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
  'together:qwen3.6-35b': {
    provider: 'together', model: 'Qwen/Qwen3.6-35B-A3B',
    displayName: 'Qwen 3.6 35B MoE (Together)', contextK: 262, streaming: true,
  },
  'together:nemotron-3-super': {
    provider: 'together', model: 'nvidia/Nemotron-3-Super-120B-A12B',
    displayName: 'Nemotron 3 Super 120B (Together)', contextK: 262, streaming: true,
  },

  // ── Mistral AI La Plateforme (1B tokens/month, 2 RPM — background only) ────
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

  // ── Ollama (local — unlimited, zero cost, offline) ──────────────────────────
  'ollama:qwen3-8b': {
    provider: 'ollama', model: 'qwen3:8b',
    displayName: "Qwen 3 8B — HOLLY's Brain (Local)", contextK: 128, streaming: true,
  },
  'ollama:qwen3.6-35b': {
    provider: 'ollama', model: 'qwen3.6:35b',
    displayName: 'Qwen 3.6 35B MoE (Ollama)', contextK: 256, streaming: true,
  },
  'ollama:gemma4-26b': {
    provider: 'ollama', model: 'gemma4:26b',
    displayName: 'Gemma 4 26B MoE (Ollama)', contextK: 256, streaming: true,
  },
  'ollama:devstral-small-2': {
    provider: 'ollama', model: 'devstral-small-2',
    displayName: 'Devstral Small 2 24B (Ollama)', contextK: 384, streaming: true,
  },

  // ── Google AI Studio (Gemini — 10 RPM, 250 RPD, 1M ctx) ────────────────────
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
  // ⚡ Speed: Groq is king (280 tok/s), GPT-OSS on Groq is fast backup
  speed: [
    'groq:llama-3.3-70b',
    'groq:gpt-oss-120b',
    'groq:llama-4-scout',
    'nvidia:llama-4-maverick',
    'together:llama-4-scout',
    'openrouter:gemma-4-31b',
    'google:gemini-2.5-flash',
    'nvidia:nemotron-3-super',
    'together:qwen3.5-122b',
    'holly-own:qwen3-8b',
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
  ],

  // 💻 Coding: DeepSeek V4 Flash primary (1M ctx, SOTA), GLM-5.1, Kimi K2.6
  coding: [
    'nvidia:deepseek-v4-flash',
    'nvidia:glm-5.1',
    'openrouter:kimi-k2.6',
    'nvidia:qwen3-coder',
    'openrouter:qwen3-coder',
    'together:qwen3-coder-30b',
    'openrouter:laguna-m.1',
    'groq:gpt-oss-120b',
    'nvidia:qwen3.5-122b',
    'together:qwen3.5-122b',
    'google:gemini-2.5-flash',
    'groq:llama-3.3-70b',
    'mistral:codestral',
    'ollama:qwen3.6-35b',
    'ollama:devstral-small-2',
  ],

  // 🧠 Reasoning: DeepSeek V4 Flash → Nemotron Ultra → GLM-5.1 → Gemini
  reasoning: [
    'nvidia:deepseek-v4-flash',
    'openrouter:nemotron-3-ultra',
    'nvidia:glm-5.1',
    'nvidia:deepseek-v4-pro',
    'nvidia:qwen3.5-122b',
    'nvidia:nemotron-3-super',
    'openrouter:nemotron-3-super',
    'google:gemini-2.5-flash',
    'together:qwen3.5-122b',
    'groq:gpt-oss-120b',
    'nvidia:step-3.5-flash',
    'openrouter:gpt-oss-120b',
    'ollama:qwen3.6-35b',
  ],

  // 📄 Long context: Gemini 1M → DeepSeek V4 1M → Nemotron Ultra 1M
  long_context: [
    'google:gemini-2.5-flash',
    'nvidia:deepseek-v4-flash',
    'openrouter:nemotron-3-ultra',
    'together:minimax-m1',
    'nvidia:nemotron-3-ultra',
    'nvidia:nemotron-3-super',
    'openrouter:nemotron-3-super',
    'together:llama-4-scout',
    'openrouter:qwen3-coder',
    'nvidia:qwen3-coder',
    'together:qwen3.5-122b',
    'nvidia:qwen3.5-122b',
    'openrouter:gemma-4-31b',
    'together:gemma-4-26b',
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
  ],

  // 👁️ Vision: Kimi K2.6 → Gemma 4 31B → Nemotron Omni → Gemini
  vision: [
    'openrouter:kimi-k2.6',
    'openrouter:gemma-4-31b',
    'nvidia:nemotron-3-nano-omni',
    'openrouter:nemotron-3-nano-omni',
    'google:gemini-2.5-flash',
    'together:qwen3-vl-235b',
    'nvidia:llama-4-maverick',
    'together:llama-4-scout',
  ],

  // 🎨 Creative: Nemotron Ultra → Mistral Nemotron → Gemma 4 → Hermes
  creative: [
    'nvidia:nemotron-3-ultra',
    'openrouter:nemotron-3-ultra',
    'nvidia:mistral-nemotron',
    'nvidia:step-3.5-flash',
    'openrouter:gemma-4-31b',
    'groq:llama-3.3-70b',
    'google:gemini-2.5-flash',
    'nvidia:nemotron-3-super',
    'together:qwen3.5-122b',
    'openrouter:glm-4.5-air',
    'mistral:medium-3.5',
  ],

  // 🤖 Agent: GLM-5.1 → DeepSeek V4 → Kimi K2.6 → Qwen3 Coder
  agent: [
    'nvidia:glm-5.1',
    'nvidia:deepseek-v4-flash',
    'openrouter:kimi-k2.6',
    'nvidia:qwen3-coder',
    'openrouter:laguna-m.1',
    'nvidia:nemotron-3-ultra',
    'nvidia:step-3.5-flash',
    'openrouter:nemotron-3-ultra',
    'together:qwen3.5-122b',
    'nvidia:qwen3.5-122b',
    'together:llama-4-scout',
    'google:gemini-2.5-flash',
    'groq:gpt-oss-120b',
    'ollama:qwen3.6-35b',
  ],

  // 🧬 Consciousness: LOCAL FIRST → Mistral Direct → cloud fallback
  consciousness: [
    'holly-own:qwen3-8b',
    'ollama:qwen3-8b',
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
    'mistral:small-4',
    'mistral:medium-3.5',
    'google:gemini-2.5-flash',
    'groq:llama-3.3-70b',
  ],

  // 🔞 Unrestricted: Modern uncensored models first, then minimally-censored fallbacks
  unrestricted: [
    'openrouter:dolphin-venice-24b',
    'openrouter:hermes-3-405b',
    'together:llama-4-scout',
    'nvidia:deepseek-v4-flash',
    'openrouter:nemotron-3-ultra',
    'nvidia:glm-5.1',
    'openrouter:gpt-oss-120b',
    'google:gemini-2.5-flash',
    'ollama:qwen3.6-35b',
  ],

  // 🌐 Synthesis: V4 Flash 1M → Nemotron Ultra → Qwen 3.5 → Gemini
  synthesis: [
    'nvidia:deepseek-v4-flash',
    'openrouter:nemotron-3-ultra',
    'nvidia:qwen3.5-122b',
    'groq:gpt-oss-120b',
    'google:gemini-2.5-flash',
    'nvidia:glm-5.1',
    'together:minimax-m1',
    'nvidia:nemotron-3-super',
    'openrouter:nemotron-3-super',
    'together:qwen3.5-122b',
    'openrouter:gemma-4-31b',
    'openrouter:kimi-k2.6',
    'together:qwen3.6-35b',
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
  ],

  // 🔒 Local: Ollama only — never touches cloud
  local: [
    'ollama:qwen3.6-35b',
    'ollama:gemma4-26b',
    'ollama:qwen3-8b',
    'ollama:devstral-small-2',
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
