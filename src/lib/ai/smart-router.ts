/**
 * HOLLY Smart Model Router — Phase 8A (Gemini-free)
 *
 * Routes every chat request to the best FREE, no-token-cost model based on
 * task type, with automatic cascade fallback if a provider is rate-limited.
 *
 * All providers are genuinely free tiers — no paid plans, no token billing.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Task Type    │  Primary Model                 │  Why                   │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │  speed/chat   │  Groq → Llama 3.3 70B          │  300+ tok/s, free tier │
 * │  coding       │  CF Workers AI → Kimi K2.5     │  Best free coder       │
 * │  reasoning    │  NVIDIA NIM → Qwen3-235B-A22B  │  Deep reasoning, free  │
 * │  long_context │  CF Workers AI → Kimi K2.5     │  256K ctx, free        │
 * │  vision       │  OpenRouter → Qwen3 VL         │  Free vision models    │
 * │  creative     │  OpenRouter → Mistral Small    │  Model variety, free   │
 * │  agent        │  CF Workers AI → Kimi K2.5     │  Tool calling, free    │
 * │  local        │  Ollama                        │  Unlimited/offline     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Cascade fallback per task:
 *   speed:        Groq Llama-3.3 → Groq 8B → OpenRouter Llama → CF Kimi → NVIDIA Llama
 *   coding:       CF Kimi → NVIDIA Qwen3 → OpenRouter Qwen Coder → Groq DeepSeek → Groq Llama
 *   reasoning:    NVIDIA Qwen3 → Groq DeepSeek-R1 → NVIDIA DeepSeek-R1 → CF Kimi → OpenRouter
 *   long_context: CF Kimi (256K) → NVIDIA Qwen3 (262K) → OpenRouter Qwen Coder → Groq Llama
 *   vision:       OpenRouter Qwen VL → OpenRouter free → CF Kimi → Groq Llama
 *   creative:     OpenRouter Mistral → Groq Llama → OpenRouter free → CF Kimi
 *   agent:        CF Kimi → NVIDIA Qwen3 → Groq Llama → OpenRouter Qwen Coder
 *   local:        Ollama (never falls through to cloud)
 */

// ─── Task types ───────────────────────────────────────────────────────────────

export type TaskType =
  | 'speed'        // Fast casual chat, quick questions
  | 'coding'       // Write / debug / review code, anything technical
  | 'reasoning'    // Math, logic, analysis, step-by-step deduction
  | 'long_context' // Summarise / analyse long documents, large context
  | 'vision'       // Images, screenshots, visual content
  | 'creative'     // Stories, poems, brainstorming, writing
  | 'agent'        // Multi-step tool chains, autonomous tasks
  | 'local';       // Privacy-first, offline

// ─── Provider identifiers ─────────────────────────────────────────────────────

export type ProviderId =
  | 'groq'          // api.groq.com — Llama 3.3 70B (300+ tok/s, 14,400 req/day FREE)
  | 'cf_workers'    // api.cloudflare.com — Kimi K2.5 256K ctx (FREE tier, needs CF_ACCOUNT_ID_CF_AI_TOKEN="accountId|token")
  | 'nvidia_nim'    // integrate.api.nvidia.com — Qwen3-235B-A22B (FREE tier)
  | 'openrouter'    // openrouter.ai — 27 free models (20 RPM / 200 RPD FREE)
  | 'ollama';       // localhost:11434 — unlimited, zero cost, offline

export interface ModelSpec {
  provider:    ProviderId;
  model:       string;      // provider's model ID string
  displayName: string;      // human-readable name shown in HOLLY UI
  contextK:    number;      // context window in thousands of tokens
  streaming:   boolean;
}

// ─── Model catalogue ──────────────────────────────────────────────────────────

export const MODEL_CATALOGUE: Record<string, ModelSpec> = {
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

  // ── NVIDIA NIM (best free reasoning — Qwen3 235B) ─────────────────────────
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

  // ── OpenRouter free pool (27 models, 20 RPM / 200 RPD) ───────────────────
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
  'openrouter:free': {
    provider: 'openrouter', model: 'openrouter/auto',
    displayName: 'OpenRouter Auto (free pool)', contextK: 128, streaming: true,
  },

  // ── Ollama (local — unlimited, zero cost) ────────────────────────────────
  'ollama:auto': {
    provider: 'ollama', model: 'auto',
    displayName: 'Ollama (local)', contextK: 32, streaming: true,
  },
};

// ─── Cascade waterfall per task type ──────────────────────────────────────────
// NO Gemini, NO paid APIs — every entry is a 100% free provider

export const TASK_WATERFALLS: Record<TaskType, string[]> = {
  // ⚡ Speed: Groq is king for fast free chat
  speed: [
    'groq:llama-3.3-70b',
    'groq:llama-3.1-8b',
    'openrouter:llama-3.3-70b',
    'cf:kimi-k2.5',
    'nvidia:llama-3.3-70b',
  ],

  // 💻 Coding: Kimi K2.5 is the best free coder (256K ctx + tool calling)
  coding: [
    'cf:kimi-k2.5',
    'nvidia:qwen3-235b',
    'openrouter:qwen3-coder',
    'groq:deepseek-r1-70b',
    'groq:llama-3.3-70b',
  ],

  // 🧠 Reasoning: Qwen3 235B is the best free reasoner
  reasoning: [
    'nvidia:qwen3-235b',
    'groq:deepseek-r1-70b',
    'nvidia:deepseek-r1',
    'cf:kimi-k2.5',
    'openrouter:qwen3-coder',
  ],

  // 📄 Long context: Kimi 256K then Qwen3 262K — no Gemini needed
  long_context: [
    'cf:kimi-k2.5',
    'nvidia:qwen3-235b',
    'openrouter:qwen3-coder',
    'groq:llama-3.3-70b',
  ],

  // 👁️ Vision: OpenRouter has free vision models (Qwen3 VL 30B)
  vision: [
    'openrouter:qwen3-vl-30b',
    'openrouter:free',
    'cf:kimi-k2.5',
    'groq:llama-3.3-70b',
  ],

  // ✨ Creative: Mistral Small is great for creative writing (free)
  creative: [
    'openrouter:mistral-small',
    'groq:llama-3.3-70b',
    'nvidia:mistral-small',
    'openrouter:free',
    'cf:kimi-k2.5',
  ],

  // 🤖 Agent: Kimi K2.5 has the best tool-calling support (free)
  agent: [
    'cf:kimi-k2.5',
    'nvidia:qwen3-235b',
    'groq:llama-3.3-70b',
    'openrouter:qwen3-coder',
  ],

  // 🔒 Local: Ollama only — never touches the cloud
  local: [
    'ollama:auto',
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

const LOCAL_PATTERNS = [
  /\b(private|offline|local|no.?cloud|on.?device|browser.?only|no.?network)\b/i,
];

// ── Mode → TaskType forced routing ───────────────────────────────────────────
// When Holly is in a specific mode the smart router is pre-seeded with the
// optimal task type regardless of what the message text says.
export const MODE_TASK_MAP: Record<string, TaskType> = {
  'default':              'speed',
  'full-stack':           'coding',
  'write-code':           'coding',
  'self-coding':          'coding',
  'magic-design':         'coding',    // UI/UX + code output
  'deep-research':        'reasoning',
  'neural-autonomy':      'reasoning',
  'philosophy':           'reasoning',
  'music-studio':         'creative',
  'music-generation':     'creative',
  'aura-ar':              'creative',
  'creative-writing':     'creative',
  'visual-arts':          'creative',
  'emotional-intelligence':'speed',    // needs warmth/speed not raw compute
  'intimate':             'speed',
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
}

/**
 * Route a message to the optimal model waterfall.
 * Call once per request; iterate waterfall on 429/5xx.
 */
export function smartRoute(
  message: string,
  options: {
    hasImages?:  boolean;
    forceTask?:  TaskType;
    forceModel?: string;   // key from MODEL_CATALOGUE
  } = {},
): SmartRoutingResult {
  if (options.forceModel && MODEL_CATALOGUE[options.forceModel]) {
    const spec = MODEL_CATALOGUE[options.forceModel];
    return {
      taskType:  options.forceTask ?? 'speed',
      waterfall: [spec],
      primary:   spec,
      reason:    `Forced model: ${options.forceModel}`,
    };
  }

  const task     = options.forceTask ?? classifyTask(message, options.hasImages);
  const keys     = TASK_WATERFALLS[task] ?? TASK_WATERFALLS.speed;
  const waterfall = keys.map(k => MODEL_CATALOGUE[k]).filter(Boolean);
  const primary  = waterfall[0];

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
    taskType: task,
    waterfall,
    primary,
    reason: `${taskLabels[task]} → ${primary.displayName}`,
  };
}
