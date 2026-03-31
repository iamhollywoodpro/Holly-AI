/**
 * Multi-Model LLM Router for HOLLY
 *
 * Provider chain (free-first, paid fallback):
 *
 *  LOCAL (FREE, MIT/Apache 2.0 — via Ollama):
 *   - deepseek-v3        MIT  — best open-source general LLM (GPT-4 class)
 *   - qwen3:14b          Apache 2.0 — excellent multilingual + reasoning
 *   - qwen3:8b           Apache 2.0 — fast, lightweight Qwen3 variant
 *   - llama4:scout       Llama 4 Community — huge context window
 *   - llama3.3:70b       Llama 3 Community — Groq fallback model (local variant)
 *
 *  HOSTED FREE (rate-limited):
 *   - Groq → llama-3.3-70b-versatile  (free tier, fast inference)
 *   - Bytez → GLM models              (free tier, coding tasks)
 *
 * Routing priority:
 *   1. Ollama local (if OLLAMA_BASE_URL is set and model is available) — $0
 *   2. Groq (conversation) or Bytez (coding) — free with rate limits
 *
 * Setup Ollama:
 *   1. Install: https://ollama.com
 *   2. Pull: ollama pull deepseek-v3
 *   3. Add to .env.local: OLLAMA_BASE_URL=http://localhost:11434
 */

import Groq from 'groq-sdk';
import Bytez from 'bytez.js';

// ─── Providers ────────────────────────────────────────────────────────────────

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const bytez = new Bytez(process.env.BYTEZ_API_KEY || '');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModelType = 'conversation' | 'coding' | 'quick' | 'reasoning' | 'creative';
export type ModelProvider = 'groq' | 'bytez' | 'ollama';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  description: string;
  license?: string;
  cost?: string;
}

// ─── Local Ollama model catalogue (all free) ──────────────────────────────────
//
// These are the preferred models — zero cost, MIT or Apache 2.0.
// HOLLY will auto-detect which ones are installed and use the best available.

export const OLLAMA_MODELS = {
  // 🥇 Best overall — GPT-4 class, MIT license
  deepseek_v3: {
    id:          'deepseek-v3',
    pullCmd:     'ollama pull deepseek-v3',
    license:     'MIT',
    description: 'DeepSeek V3 — best open-source LLM 2026 (GPT-4 class)',
    bestFor:     ['conversation', 'reasoning', 'creative', 'coding'],
    ramNeeded:   '32GB+ (Q4 quantised)',
  },
  // 🥈 Excellent multilingual + reasoning — Apache 2.0
  qwen3_14b: {
    id:          'qwen3:14b',
    pullCmd:     'ollama pull qwen3:14b',
    license:     'Apache 2.0',
    description: 'Qwen3 14B — strong reasoning, multilingual, thinking mode',
    bestFor:     ['conversation', 'reasoning', 'coding'],
    ramNeeded:   '16GB+',
  },
  // ⚡ Fast everyday model — Apache 2.0
  qwen3_8b: {
    id:          'qwen3:8b',
    pullCmd:     'ollama pull qwen3:8b',
    license:     'Apache 2.0',
    description: 'Qwen3 8B — fast, lightweight, great for quick responses',
    bestFor:     ['quick', 'conversation'],
    ramNeeded:   '8GB+',
  },
  // 📚 Massive context window — Llama 4 Community License
  llama4_scout: {
    id:          'llama4:scout',
    pullCmd:     'ollama pull llama4:scout',
    license:     'Llama 4 Community',
    description: 'Llama 4 Scout — 10M token context, multimodal',
    bestFor:     ['long_context', 'conversation'],
    ramNeeded:   '16GB+',
  },
  // 🔄 Local equivalent of Groq fallback
  llama3_3_70b: {
    id:          'llama3.3:70b',
    pullCmd:     'ollama pull llama3.3:70b',
    license:     'Llama 3 Community',
    description: 'Llama 3.3 70B — same model as Groq fallback, local',
    bestFor:     ['conversation', 'reasoning'],
    ramNeeded:   '48GB+ (Q4)',
  },
} as const;

// ─── Hosted fallback models ───────────────────────────────────────────────────

export const MODELS: Record<ModelType, ModelConfig> = {
  conversation: {
    provider:    'groq',
    model:       'llama-3.3-70b-versatile',
    license:     'Llama 3 Community',
    cost:        'Free tier (rate limited)',
    description: 'Best for conversation, reasoning, and general tasks',
  },
  coding: {
    provider:    'bytez',
    model:       'zai-org/glm-4-9b-chat-hf',
    license:     'Apache 2.0',
    cost:        'Free tier',
    description: 'Best for code generation, debugging, and technical tasks',
  },
  quick: {
    provider:    'bytez',
    model:       'zai-org/glm-edge-4b-chat',
    license:     'Apache 2.0',
    cost:        'Free tier',
    description: 'Best for quick responses and simple tasks',
  },
  reasoning: {
    provider:    'groq',
    model:       'llama-3.3-70b-versatile',
    license:     'Llama 3 Community',
    cost:        'Free tier',
    description: 'Deep reasoning tasks — use Qwen3 local for better results',
  },
  creative: {
    provider:    'groq',
    model:       'llama-3.3-70b-versatile',
    license:     'Llama 3 Community',
    cost:        'Free tier',
    description: 'Creative writing, music ideas, brainstorming',
  },
};

// ─── Ollama availability check ────────────────────────────────────────────────

let _ollamaAvailable: boolean | null = null;
let _ollamaModels: string[] = [];
let _lastOllamaCheck = 0;

async function checkOllama(): Promise<{ available: boolean; models: string[] }> {
  // Cache for 60 seconds to avoid hammering localhost
  const now = Date.now();
  if (_ollamaAvailable !== null && now - _lastOllamaCheck < 60_000) {
    return { available: _ollamaAvailable, models: _ollamaModels };
  }

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      _ollamaModels = (data.models || []).map((m: any) => m.name as string);
      _ollamaAvailable = true;
      _lastOllamaCheck = now;
      return { available: true, models: _ollamaModels };
    }
  } catch {
    // Ollama not running — fall through to hosted providers
  }

  _ollamaAvailable = false;
  _ollamaModels = [];
  _lastOllamaCheck = now;
  return { available: false, models: [] };
}

// ─── Pick best available Ollama model for a task ──────────────────────────────

function pickOllamaModel(taskType: ModelType, installedModels: string[]): string | null {
  // Priority order per task type
  const preferences: Record<ModelType, string[]> = {
    conversation: [
      OLLAMA_MODELS.deepseek_v3.id,
      OLLAMA_MODELS.qwen3_14b.id,
      OLLAMA_MODELS.llama3_3_70b.id,
      OLLAMA_MODELS.qwen3_8b.id,
    ],
    coding: [
      OLLAMA_MODELS.deepseek_v3.id,
      OLLAMA_MODELS.qwen3_14b.id,
      OLLAMA_MODELS.qwen3_8b.id,
    ],
    quick: [
      OLLAMA_MODELS.qwen3_8b.id,
      OLLAMA_MODELS.deepseek_v3.id,
      OLLAMA_MODELS.qwen3_14b.id,
    ],
    reasoning: [
      OLLAMA_MODELS.qwen3_14b.id,
      OLLAMA_MODELS.deepseek_v3.id,
      OLLAMA_MODELS.llama3_3_70b.id,
    ],
    creative: [
      OLLAMA_MODELS.deepseek_v3.id,
      OLLAMA_MODELS.qwen3_14b.id,
      OLLAMA_MODELS.llama3_3_70b.id,
    ],
  };

  for (const preferred of (preferences[taskType] ?? [])) {
    // Match on model name prefix (handles tags like qwen3:14b, deepseek-v3:latest)
    const match = installedModels.find(m =>
      m === preferred || m.startsWith(preferred.split(':')[0])
    );
    if (match) return match;
  }
  return null;
}

// ─── Generate via Ollama ──────────────────────────────────────────────────────

async function generateWithOllama(
  messages: Array<{ role: string; content: string }>,
  model: string,
  stream: boolean = true
): Promise<any> {
  const endpoint = `${OLLAMA_BASE_URL}/api/chat`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream,
      options: {
        temperature: 0.7,
        num_predict: 4096,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text().catch(() => '')}`);
  }

  if (stream) {
    // Return the raw Response so the caller can stream it
    return res;
  }

  const data = await res.json();
  return data.message?.content ?? '';
}

// ─── Generate via Groq ────────────────────────────────────────────────────────

async function generateWithGroq(
  messages: Array<{ role: string; content: string }>,
  stream: boolean = true
) {
  return await groq.chat.completions.create({
    messages: messages as any,
    model:       MODELS.conversation.model,
    temperature: 0.7,
    max_tokens:  4096,
    stream,
  });
}

// ─── Generate via Bytez ───────────────────────────────────────────────────────

async function generateWithBytez(
  messages: Array<{ role: string; content: string }>,
  modelType: 'coding' | 'quick'
) {
  const modelConfig = MODELS[modelType];
  const model = bytez.model(modelConfig.model);

  const prompt = messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  const { error, output } = await model.run(prompt);
  if (error) throw new Error(`Bytez error: ${error}`);
  return output;
}

// ─── Task type detection ──────────────────────────────────────────────────────

export function detectTaskType(message: string): ModelType {
  const m = message.toLowerCase();

  const codingKw = [
    'code', 'function', 'class', 'debug', 'error', 'bug',
    'implement', 'write a', 'create a', 'build a',
    'python', 'javascript', 'typescript', 'react', 'node',
    'api', 'database', 'sql', 'query', 'algorithm',
    'fix', 'refactor', 'optimize', 'test', 'component',
    'hook', 'endpoint', 'route', 'syntax', 'compile', 'runtime', 'exception',
  ];

  const reasoningKw = [
    'why', 'explain', 'analyze', 'compare', 'pros and cons',
    'think through', 'reason', 'logic', 'step by step', 'deep dive',
  ];

  const creativeKw = [
    'write a song', 'write lyrics', 'write a story', 'poem', 'creative',
    'brainstorm', 'ideas for', 'name ideas', 'slogan', 'tagline', 'ad copy',
  ];

  const quickKw = [
    'quick', 'simple', 'short', 'brief', 'yes or no',
    'what is', 'define', 'explain briefly',
  ];

  if (codingKw.some(k => m.includes(k)))                    return 'coding';
  if (reasoningKw.some(k => m.includes(k)))                 return 'reasoning';
  if (creativeKw.some(k => m.includes(k)))                  return 'creative';
  if (quickKw.some(k => m.includes(k)) && message.length < 100) return 'quick';
  return 'conversation';
}

// ─── Main router ──────────────────────────────────────────────────────────────

export async function routeToModel(
  messages: Array<{ role: string; content: string }>,
  taskType?: ModelType,
  stream: boolean = true
): Promise<any> {
  const detectedType = taskType || detectTaskType(messages[messages.length - 1]?.content ?? '');

  // ── Try Ollama local first (free, private, no rate limits) ──────────────────
  const { available: ollamaUp, models: installedModels } = await checkOllama();
  if (ollamaUp && OLLAMA_BASE_URL) {
    const ollamaModel = pickOllamaModel(detectedType, installedModels);
    if (ollamaModel) {
      console.log(`[Model Router] Ollama ✅ — ${ollamaModel} (${detectedType})`);
      try {
        return await generateWithOllama(messages, ollamaModel, stream);
      } catch (err: any) {
        console.warn(`[Model Router] Ollama failed, falling back to hosted: ${err.message}`);
      }
    } else {
      console.log(`[Model Router] Ollama running but no suitable model installed for "${detectedType}"`);
      console.log(`[Model Router] Suggested: ollama pull ${OLLAMA_MODELS.deepseek_v3.id}`);
    }
  }

  // ── Fall back to hosted providers (Groq / Bytez) ───────────────────────────
  const modelConfig = MODELS[detectedType];
  console.log(`[Model Router] Hosted — ${modelConfig.model} (${modelConfig.provider})`);

  if (modelConfig.provider === 'groq') {
    return await generateWithGroq(messages, stream);
  } else {
    return await generateWithBytez(messages, detectedType as 'coding' | 'quick');
  }
}

// ─── Utility exports ──────────────────────────────────────────────────────────

export function getModelInfo(taskType: ModelType): ModelConfig {
  return MODELS[taskType];
}

export async function getOllamaStatus() {
  const { available, models } = await checkOllama();
  return {
    available,
    baseUrl:        OLLAMA_BASE_URL,
    installedModels: models,
    recommendedModels: Object.values(OLLAMA_MODELS).map(m => ({
      id:          m.id,
      pullCmd:     m.pullCmd,
      license:     m.license,
      description: m.description,
      installed:   models.some(im => im === m.id || im.startsWith(m.id.split(':')[0])),
    })),
  };
}
