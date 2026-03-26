/**
 * HOLLY Smart Model Router — Phase 8A
 *
 * Routes every chat request to the best FREE model based on task type,
 * with automatic cascade fallback if a provider is rate-limited.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Task Type    │  Primary Model                │  Why               │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  speed/chat   │  Groq → Llama-3.3-70B         │  300+ tok/s        │
 * │  coding       │  CF Workers AI → Kimi K2.5    │  Best free coder   │
 * │  reasoning    │  NVIDIA NIM → Qwen3-235B-A22B │  Deep reasoning    │
 * │  long_context │  Gemini 2.5 Flash             │  1M token window   │
 * │  vision       │  Gemini 2.5 Flash             │  Native multimodal │
 * │  creative     │  OpenRouter free pool         │  Model variety     │
 * │  agent        │  Kimi K2.5 (CF) → Qwen3-235B  │  Tool calling      │
 * │  local        │  Ollama                       │  Unlimited/offline │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Cascade fallback order per task type:
 *   coding:   CF Kimi → NVIDIA Qwen3 → Groq Llama → OpenRouter
 *   reasoning:NVIDIA Qwen3 → CF Kimi → Gemini Flash → Groq Llama
 *   long_ctx: Gemini Flash → CF Kimi → NVIDIA Qwen3 → Groq Llama
 *   speed:    Groq Llama → OpenRouter → CF Kimi → Gemini Flash
 *   creative: OpenRouter → Groq Llama → Gemini Flash → CF Kimi
 *   agent:    CF Kimi → NVIDIA Qwen3 → Groq Llama → OpenRouter
 *   vision:   Gemini Flash → OpenRouter (vision models) → CF Kimi
 *   local:    Ollama → (never falls through to cloud)
 */

// ─── Task types ───────────────────────────────────────────────────────────────

export type TaskType =
  | 'speed'       // Fast casual chat, quick questions
  | 'coding'      // Write / debug / review code, anything technical
  | 'reasoning'   // Math, logic, analysis, step-by-step deduction
  | 'long_context'// Summarise / analyse long documents, large context
  | 'vision'      // Images, screenshots, visual content
  | 'creative'    // Stories, poems, brainstorming, writing
  | 'agent'       // Multi-step tool chains, autonomous tasks
  | 'local';      // Privacy-first, offline

// ─── Provider / model identifiers ─────────────────────────────────────────────

export type ProviderId =
  | 'groq'          // api.groq.com — Llama 3.3 70B (super fast free)
  | 'gemini'        // generativelanguage.googleapis.com — Flash 2.5
  | 'cf_workers'    // api.cloudflare.com — Kimi K2.5 (just launched Mar 2026)
  | 'nvidia_nim'    // integrate.api.nvidia.com — Qwen3-235B-A22B
  | 'openrouter'    // openrouter.ai — free model pool (27 models)
  | 'ollama';       // localhost:11434 — any locally pulled model

export interface ModelSpec {
  provider:    ProviderId;
  model:       string;      // provider's model ID string
  displayName: string;      // human-readable name shown in HOLLY UI
  contextK:    number;      // context window in thousands of tokens
  streaming:   boolean;
}

// ─── Model catalogue ──────────────────────────────────────────────────────────

export const MODEL_CATALOGUE: Record<string, ModelSpec> = {
  // Groq
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

  // Gemini
  'gemini:flash-2.5': {
    provider: 'gemini', model: 'gemini-2.5-flash-preview-05-20',
    displayName: 'Gemini 2.5 Flash', contextK: 1000, streaming: true,
  },
  'gemini:flash-lite': {
    provider: 'gemini', model: 'gemini-2.5-flash-lite-preview',
    displayName: 'Gemini 2.5 Flash-Lite', contextK: 1000, streaming: true,
  },

  // Cloudflare Workers AI
  'cf:kimi-k2.5': {
    provider: 'cf_workers', model: '@cf/moonshotai/kimi-k2.5',
    displayName: 'Kimi K2.5 (Cloudflare)', contextK: 256, streaming: true,
  },

  // NVIDIA NIM
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

  // OpenRouter free pool
  'openrouter:free': {
    provider: 'openrouter', model: 'openrouter/free',
    displayName: 'OpenRouter Free Pool', contextK: 200, streaming: true,
  },
  'openrouter:qwen3-coder': {
    provider: 'openrouter', model: 'qwen/qwen3-coder:free',
    displayName: 'Qwen3 Coder (OpenRouter free)', contextK: 262, streaming: true,
  },
  'openrouter:llama-3.3-70b': {
    provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free',
    displayName: 'Llama 3.3 70B (OpenRouter free)', contextK: 66, streaming: true,
  },
  'openrouter:mistral-small': {
    provider: 'openrouter', model: 'mistralai/mistral-small-3.1-24b-instruct:free',
    displayName: 'Mistral Small 3.1 24B (OpenRouter free)', contextK: 128, streaming: true,
  },

  // Ollama (local)
  'ollama:auto': {
    provider: 'ollama', model: 'auto',
    displayName: 'Ollama (local)', contextK: 32, streaming: true,
  },
};

// ─── Cascade waterfall per task type ──────────────────────────────────────────

export const TASK_WATERFALLS: Record<TaskType, string[]> = {
  speed: [
    'groq:llama-3.3-70b',
    'groq:llama-3.1-8b',
    'openrouter:llama-3.3-70b',
    'cf:kimi-k2.5',
    'gemini:flash-lite',
  ],
  coding: [
    'cf:kimi-k2.5',
    'nvidia:qwen3-235b',
    'openrouter:qwen3-coder',
    'groq:deepseek-r1-70b',
    'groq:llama-3.3-70b',
  ],
  reasoning: [
    'nvidia:qwen3-235b',
    'groq:deepseek-r1-70b',
    'nvidia:deepseek-r1',
    'cf:kimi-k2.5',
    'gemini:flash-2.5',
  ],
  long_context: [
    'gemini:flash-2.5',
    'cf:kimi-k2.5',
    'nvidia:qwen3-235b',
    'groq:llama-3.3-70b',
  ],
  vision: [
    'gemini:flash-2.5',
    'openrouter:free',
    'cf:kimi-k2.5',
  ],
  creative: [
    'openrouter:mistral-small',
    'groq:llama-3.3-70b',
    'gemini:flash-2.5',
    'openrouter:free',
    'cf:kimi-k2.5',
  ],
  agent: [
    'cf:kimi-k2.5',
    'nvidia:qwen3-235b',
    'groq:llama-3.3-70b',
    'openrouter:qwen3-coder',
  ],
  local: [
    'ollama:auto',
  ],
};

// ─── Task classifier ──────────────────────────────────────────────────────────

const CODE_PATTERNS = [
  /\b(code|debug|fix|refactor|implement|function|class|api|bug|error|typescript|javascript|python|react|nextjs|sql|regex|algorithm|data structure|compile)\b/i,
  /```/,
  /\.(ts|js|py|go|rs|java|cpp|css|html|json|yaml)\b/i,
];

const REASONING_PATTERNS = [
  /\b(analyze|analyse|explain why|step by step|prove|calculate|math|logic|reason|deduce|infer|hypothesis|compare|evaluate|assess|think through)\b/i,
  /\b(if.*then|because|therefore|however|nevertheless|on the other hand)\b/i,
];

const LONG_CTX_PATTERNS = [
  /\b(summarize|summarise|transcript|document|paper|article|entire|whole|all of|throughout|chapter|section)\b/i,
];

const VISION_PATTERNS = [
  /\b(image|photo|picture|screenshot|diagram|chart|graph|video|visual|see|look at|describe this|what is in)\b/i,
];

const CREATIVE_PATTERNS = [
  /\b(write|story|poem|song|lyrics|creative|imagine|fiction|character|narrative|brainstorm|idea|concept|design)\b/i,
];

const AGENT_PATTERNS = [
  /\b(agent|automate|run|execute|deploy|build and|create and|set up|workflow|pipeline|multi.?step|do everything|handle all|complete the)\b/i,
];

const LOCAL_PATTERNS = [
  /\b(private|offline|local|no.?cloud|on.?device|browser.?only|no.?network)\b/i,
];

/**
 * Classify a user message into a task type.
 * Checks in priority order: local > vision > agent > coding > reasoning > long_context > creative > speed
 */
export function classifyTask(
  message: string,
  hasImages = false,
  messageLength = message.length,
): TaskType {
  // 1. Explicit local / offline request
  if (LOCAL_PATTERNS.some(p => p.test(message))) return 'local';

  // 2. Vision — image present OR explicit vision language
  if (hasImages || VISION_PATTERNS.some(p => p.test(message))) return 'vision';

  // 3. Agentic
  if (AGENT_PATTERNS.some(p => p.test(message))) return 'agent';

  // 4. Coding — highest-value technical tasks
  if (CODE_PATTERNS.some(p => p.test(message))) return 'coding';

  // 5. Reasoning / analysis
  if (REASONING_PATTERNS.some(p => p.test(message))) return 'reasoning';

  // 6. Long context — long message OR explicit summary/document language
  if (messageLength > 800 || LONG_CTX_PATTERNS.some(p => p.test(message))) return 'long_context';

  // 7. Creative writing
  if (CREATIVE_PATTERNS.some(p => p.test(message))) return 'creative';

  // 8. Default: speed
  return 'speed';
}

// ─── Router result ────────────────────────────────────────────────────────────

export interface SmartRoutingResult {
  taskType:    TaskType;
  waterfall:   ModelSpec[];   // ordered list to try
  primary:     ModelSpec;     // first in waterfall
  reason:      string;
}

/**
 * Route a message to the optimal model waterfall.
 * Call this once per request; iterate through waterfall on 429/5xx.
 */
export function smartRoute(
  message: string,
  options: {
    hasImages?:   boolean;
    forceTask?:   TaskType;
    forceModel?:  string;    // key from MODEL_CATALOGUE
  } = {},
): SmartRoutingResult {
  // Hard override
  if (options.forceModel && MODEL_CATALOGUE[options.forceModel]) {
    const spec = MODEL_CATALOGUE[options.forceModel];
    return {
      taskType:  options.forceTask ?? 'speed',
      waterfall: [spec],
      primary:   spec,
      reason:    `Forced model: ${options.forceModel}`,
    };
  }

  const task = options.forceTask ?? classifyTask(message, options.hasImages);
  const keys = TASK_WATERFALLS[task] ?? TASK_WATERFALLS.speed;
  const waterfall = keys
    .map(k => MODEL_CATALOGUE[k])
    .filter(Boolean);

  const primary = waterfall[0];

  const taskLabels: Record<TaskType, string> = {
    speed:        '⚡ Fast chat',
    coding:       '💻 Coding',
    reasoning:    '🧠 Deep reasoning',
    long_context: '📄 Long context',
    vision:       '👁️ Vision',
    creative:     '✨ Creative',
    agent:        '🤖 Agent task',
    local:        '🔒 Local/private',
  };

  return {
    taskType:  task,
    waterfall,
    primary,
    reason: `${taskLabels[task]} → ${primary.displayName}`,
  };
}
