/**
 * HOLLY Free Provider Adapters — Phase 8B (Gemini-enabled)
 *
 * Each adapter exposes:
 *   streamChat(messages, model, options) → AsyncIterable<string>  (token chunks)
 *   isConfigured(): boolean
 *
 * Providers (ALL are 100% free tiers — no paid plans, no token billing):
 *  • Groq             (GROQ_API_KEY)          — 14,400 req/day, 300+ tok/s
 *  • Google AI Studio (GOOGLE_AI_API_KEY)     — Gemini 2.5 Flash, 15 RPM, NO daily cap
 *  • Cloudflare AI    (CF_ACCOUNT_ID_CF_AI_TOKEN = "accountId|token") — Kimi K2.5/K2.6, ~27K tok/day
 *  • NVIDIA NIM       (NVIDIA_API_KEY)         — Qwen3-235B, DeepSeek R1, 1K req/day
 *  • OpenRouter free  (OPENROUTER_API_KEY)     — 27 free models, 20 RPM / 200 RPD
 *  • Ollama           (no key — localhost)     — unlimited, zero cost, offline
 *  • Arcee Trinity    (ARCEE_API_KEY)          — Agent-optimized models, free credits
 */

import Groq from 'groq-sdk';

// ─── Types ────────────────────────────────────────────────────────────────────

// Content block types for multimodal messages (OpenAI vision format)
export type ContentBlock =
  | { type: 'text';      text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

export interface ChatMessage {
  role:    'system' | 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?:   number;
  tools?:       unknown[];   // Groq / OpenAI-style tools
  sessionId?:   string;      // for CF prefix caching
}

export type TokenStream = AsyncGenerator<string, void, unknown>;

/**
 * Compute a fetch timeout appropriate for the message content.
 * Vision requests (messages containing image_url blocks) need longer because
 * the model must download + encode the image before producing the first token.
 * Text-only requests stay at the snappier base timeout.
 */
function timeoutFor(
  messages: ChatMessage[],
  baseMs:    number = 15_000,
  visionMs:  number = 45_000,
): number {
  const hasImages = messages.some(m =>
    Array.isArray(m.content) && m.content.some(b => b.type === 'image_url')
  );
  return hasImages ? visionMs : baseMs;
}

// ─── GROQ ─────────────────────────────────────────────────────────────────────
// Free tier: 14,400 req/day · 6,000 TPM · 300+ tok/s
// Models: Llama 3.3 70B, Llama 3.1 8B, DeepSeek R1 70B

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

export const groqProvider = {
  isConfigured: () => !!process.env.GROQ_API_KEY,

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    if (!groqClient) throw new Error('GROQ_API_KEY not set');

    const completion = await groqClient.chat.completions.create({
      model,
      messages: messages as Parameters<typeof groqClient.chat.completions.create>[0]['messages'],
      stream:      true,
      temperature: opts.temperature ?? 0.7,
      max_tokens:  opts.maxTokens  ?? 2048,
      tools:       opts.tools as Parameters<typeof groqClient.chat.completions.create>[0]['tools'],
    }, { timeout: 15_000 });

    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield text;
    }
  },
};

// ─── CLOUDFLARE WORKERS AI ────────────────────────────────────────────────────
// Docs: https://developers.cloudflare.com/workers-ai/
// Free: ~10,000 neurons/month free · prefix caching · no credit card needed
// Models: Kimi K2.5 (256K ctx, best free coder), Llama 3.3 70B, Qwen3 32B
//
// Vercel env var: CF_ACCOUNT_ID_CF_AI_TOKEN
//   Format: "<accountId>|<apiToken>"
//   Example: "abc123def456|your-cloudflare-api-token"
//   Get accountId from: https://dash.cloudflare.com → right sidebar
//   Get token from: Workers AI → API Tokens → Create Token

function parseCFCredentials(): { accountId: string; token: string } | null {
  const combined = process.env.CF_ACCOUNT_ID_CF_AI_TOKEN;
  if (!combined) return null;
  const pipe = combined.indexOf('|');
  if (pipe === -1) return null; // must contain '|'
  return {
    accountId: combined.slice(0, pipe).trim(),
    token:     combined.slice(pipe + 1).trim(),
  };
}

export const cloudflareProvider = {
  isConfigured: () => parseCFCredentials() !== null,

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    const creds = parseCFCredentials();
    if (!creds) throw new Error('CF_ACCOUNT_ID_CF_AI_TOKEN not set. Format: "accountId|apiToken"');
    const { accountId, token } = creds;

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    };

    // Prefix caching — tie requests to a session so CF reuses KV cache
    if (opts.sessionId) {
      headers['x-session-affinity'] = opts.sessionId;
    }

    const body = JSON.stringify({
      messages,
      max_tokens:  opts.maxTokens  ?? 2048,
      temperature: opts.temperature ?? 0.7,
      stream: true,
    });

    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cloudflare Workers AI ${res.status}: ${err}`);
    }
    if (!res.body) throw new Error('No response body from Cloudflare Workers AI');

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const text = parsed?.response ?? parsed?.choices?.[0]?.delta?.content ?? '';
          if (text) yield text;
        } catch {
          // malformed SSE line — skip
        }
      }
    }
  },

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const creds = parseCFCredentials();
    if (!creds) throw new Error('CF_ACCOUNT_ID_CF_AI_TOKEN not set for embeddings');
    const { accountId, token } = creds;

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/baai/bge-large-en-v1.5`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Cloudflare Embeddings ${res.status}: ${err}`);
    }

    const json = await res.json();
    if (!json.success || !json.result || !json.result.data) {
      throw new Error(`Cloudflare Embeddings failed: ${JSON.stringify(json)}`);
    }

    return json.result.data; // Array of embedding arrays
  }
};

// ─── NVIDIA NIM ───────────────────────────────────────────────────────────────
// Docs: https://build.nvidia.com/  (OpenAI-compatible endpoint)
// Free: ~40 RPM · generous monthly quota · no credit card for free models
// Models: Qwen3-235B-A22B (best free reasoner), DeepSeek R1, Llama 3.3 70B

export const nvidiaProvider = {
  isConfigured: () => !!process.env.NVIDIA_API_KEY,

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error('NVIDIA_API_KEY not set');

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream:      true,
        temperature: opts.temperature ?? 0.7,
        max_tokens:  opts.maxTokens  ?? 2048,
      }),
      signal: AbortSignal.timeout(timeoutFor(messages)),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`NVIDIA NIM ${res.status}: ${err}`);
    }
    if (!res.body) throw new Error('No response body from NVIDIA NIM');

    yield* parseOpenAIStream(res.body);
  },
};

// ─── OPENROUTER (free pool) ───────────────────────────────────────────────────
// Docs: https://openrouter.ai/docs
// Free: 20 RPM · 200 RPD · 27 free models (no credit card needed for :free models)
// Models: Qwen3 Coder 480B, Mistral Small 3.1 24B, Qwen3 VL 30B, Llama 3.3 70B...

export const openrouterProvider = {
  isConfigured: () => !!process.env.OPENROUTER_API_KEY,

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

    // ── HARD COST GUARD ────────────────────────────────────────────────────
    // Reject any model that doesn't end with :free. This prevents paid models
    // from ever being called through OpenRouter regardless of what the router
    // or auto-discovery tries to send.
    if (!model.endsWith(':free')) {
      throw new Error(
        `[COST GUARD] Blocked paid OpenRouter model "${model}". ` +
        `Only models ending with :free are allowed. ` +
        `If you need this model, use the :free variant.`
      );
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  'https://holly-ai.dev',
        'X-Title':       'HOLLY AI Partner',
      },
      body: JSON.stringify({
        model,
        messages,
        stream:      true,
        temperature: opts.temperature ?? 0.7,
        max_tokens:  opts.maxTokens  ?? 2048,
      }),
      signal: AbortSignal.timeout(timeoutFor(messages)),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${err}`);
    }
    if (!res.body) throw new Error('No response body from OpenRouter');

    yield* parseOpenAIStream(res.body);
  },
};

// ─── OLLAMA (local) ───────────────────────────────────────────────────────────
// Unlimited · zero cost · fully offline · any model you pull
// Set OLLAMA_ENABLED=true and OLLAMA_BASE_URL=http://localhost:11434

export const ollamaFreeProvider = {
  isConfigured: () => process.env.OLLAMA_ENABLED === 'true', // only if explicitly enabled

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model === 'auto' ? (process.env.OLLAMA_MODEL ?? 'llama3.2') : model,
        messages,
        stream:  true,
        options: {
          temperature: opts.temperature ?? 0.7,
          num_predict: opts.maxTokens  ?? 2048,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      throw new Error(`Ollama ${res.status}: ${await res.text()}`);
    }
    if (!res.body) throw new Error('No response body from Ollama');

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          const text = parsed?.message?.content ?? '';
          if (text) yield text;
          if (parsed?.done) return;
        } catch { /* skip malformed lines */ }
      }
    }
  },
};

// ─── TOGETHER AI ─────────────────────────────────────────────────────────────
// Docs: https://docs.together.ai/ (OpenAI-compatible endpoint)
// Free: 80+ models at $0/token · 60 RPM free tier · 1M ctx (MiniMax M1)
// Note: Requires one-time $5 credit for platform access, but free models cost $0 ongoing
// Models: Llama 4 Scout (328K), Qwen3.5 122B, MiniMax M1 (1M), Qwen3 VL 235B, Gemma 4 26B
//
// HARD COST GUARD: Only models in the APPROVED_FREE list below are allowed.
// Any model not on this list is blocked before the API call is made.
// This ensures your $5 credit is NEVER touched.

const TOGETHER_APPROVED_FREE_MODELS = new Set([
  'meta-llama/Llama-4-Scout-17B-16E-Instruct',
  'Qwen/Qwen3.5-122B-A10B',
  'MiniMaxAI/MiniMax-M1',
  'Qwen/Qwen3-VL-235B-A22B-Instruct',
  'Qwen/Qwen3-Coder-30B-A3B-Instruct',
  'google/gemma-4-26b-a4b-it',
  'meta-llama/Llama-3.1-70B-Instruct',
  'mistralai/Devstral-Small-2505',
  'Qwen/Qwen3.6-35B-A3B',
  'mistralai/Mistral-Small-3.2-24B',
  'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  'Qwen/Qwen3-32B',
  'google/gemma-3-27b-it',
  'mistralai/Mixtral-8x22B-Instruct',
  'google/gemma-4-e4b-it',
  'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'Qwen/Qwen3-Next-80B-A3B-Instruct',
  'MiniMaxAI/MiniMax-M2',
]);

export const togetherProvider = {
  isConfigured: () => !!process.env.TOGETHER_API_KEY,

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) throw new Error('TOGETHER_API_KEY not set');

    // ── HARD COST GUARD ────────────────────────────────────────────────────
    // Only allow models explicitly on the approved free list.
    // This prevents your $5 credit from EVER being spent.
    if (!TOGETHER_APPROVED_FREE_MODELS.has(model)) {
      throw new Error(
        `[COST GUARD] Blocked paid Together AI model "${model}". ` +
        `Only approved free models are allowed. ` +
        `Add it to TOGETHER_APPROVED_FREE_MODELS if it's genuinely free.`
      );
    }

    const res = await fetch('https://api.together.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream:      true,
        temperature: opts.temperature ?? 0.7,
        max_tokens:  opts.maxTokens  ?? 2048,
      }),
      signal: AbortSignal.timeout(timeoutFor(messages)),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Together AI ${res.status}: ${err}`);
    }
    if (!res.body) throw new Error('No response body from Together AI');

    yield* parseOpenAIStream(res.body);
  },
};

// ─── MISTRAL AI (La Plateforme) ───────────────────────────────────────────────
// Docs: https://docs.mistral.ai/ (OpenAI-compatible endpoint)
// Free: 1 BILLION tokens/month · 2 RPM · all models available
// BEST FOR: Background tasks, consciousness cycles, non-time-sensitive work
// Models: Mistral Medium 3.5 (128B), Mistral Small 4 (119B), Codestral, Magistral
//
// RATE LIMIT WARNING: Only 2 RPM — DO NOT use for real-time chat.
// Perfect for: consciousness cycles, inner monologue, memory processing, pattern detection

export const mistralProvider = {
  isConfigured: () => !!process.env.MISTRAL_API_KEY,

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error('MISTRAL_API_KEY not set');

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        stream:      true,
        temperature: opts.temperature ?? 0.7,
        max_tokens:  opts.maxTokens  ?? 2048,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mistral AI ${res.status}: ${err}`);
    }
    if (!res.body) throw new Error('No response body from Mistral AI');

    yield* parseOpenAIStream(res.body);
  },
};

// ─── ARCEE TRINITY ──────────────────────────────────────────────────────────
// Docs: https://docs.arcee.ai/ (OpenAI-compatible endpoint)
// Free tier: generous credits · OpenAI-compatible API · Apache 2.0 models
// Models: Trinity Mini (26B, 3B active), Trinity Large Thinking (400B, 13B active)
// Purpose-built for agents: reliable tool calling, structured outputs, MCP support

export const arceeProvider = {
  isConfigured: () => !!process.env.ARCEE_API_KEY,

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    const apiKey = process.env.ARCEE_API_KEY;
    const baseUrl = process.env.ARCEE_BASE_URL || 'https://api.arcee.ai/api/v1';
    if (!apiKey) throw new Error('ARCEE_API_KEY not set');

    const body: Record<string, unknown> = {
      model,
      messages,
      stream:      true,
      temperature: opts.temperature ?? 0.7,
      max_tokens:  opts.maxTokens  ?? 4096,
    };

    if (opts.tools && Array.isArray(opts.tools) && opts.tools.length > 0) {
      body.tools = opts.tools;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Arcee ${res.status}: ${errText.slice(0, 300)}`);
    }
    if (!res.body) throw new Error('No response body from Arcee');

    yield* parseOpenAIStream(res.body as ReadableStream<Uint8Array>);
  },
};

// ─── GOOGLE AI STUDIO (Gemini) ────────────────────────────────────────────────
// Docs: https://ai.google.dev/gemini-api/docs
// Free: 15 RPM · NO daily token cap · 1M context window
// Models: Gemini 2.5 Flash (fast, multimodal, 1M ctx), Gemini 2.5 Pro (stronger reasoning)

export const googleProvider = {
  isConfigured: () => !!process.env.GOOGLE_AI_API_KEY,

  async *streamChat(
    messages: ChatMessage[],
    model: string,
    opts: StreamOptions = {},
  ): TokenStream {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not set');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const contents = messages.map(m => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      if (typeof m.content === 'string') {
        return { role, parts: [{ text: m.content }] };
      }
      const parts = m.content.map((block) => {
        if (block.type === 'text') return { text: block.text };
        if (block.type === 'image_url') {
          const url = block.image_url.url;
          if (url.startsWith('data:')) {
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              return {
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              };
            }
          }
          return { text: url };
        }
        return { text: '' };
      });
      return { role, parts };
    });

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        maxOutputTokens: opts.maxTokens ?? 8192,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google AI ${res.status}: ${err.slice(0, 300)}`);
    }
    if (!res.body) throw new Error('No response body from Google AI');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (text) yield text;
        } catch { /* skip malformed SSE */ }
      }
    }
  },
};

// ─── HOLLY-8B Self-Sovereign Provider ─────────────────────────────────────────
// Holly's own fine-tuned Qwen3-8B model deployed on Modal.com
// OpenAI-compatible API at HOLLY_OWN_MODEL_URL
//
// URL FORMAT: HOLLY_OWN_MODEL_URL must be the FULL chat endpoint URL
//   (e.g., https://iamhollywoodpro--chat.modal.run)
// Modal's fastapi_endpoint label IS the URL — do NOT append /chat to it.

const HOLLY_OWN_URL = process.env.HOLLY_OWN_MODEL_URL || '';

const hollyOwnProvider: { isConfigured: () => boolean; streamChat: (messages: ChatMessage[], _model: string, opts?: StreamOptions) => TokenStream } = {
  isConfigured: () => !!HOLLY_OWN_URL,
  async *streamChat(messages: ChatMessage[], _model: string, opts: StreamOptions = {}): TokenStream {
    if (!HOLLY_OWN_URL) throw new Error('HOLLY_OWN_MODEL_URL not configured');

    // Modal endpoint returns JSON {response: "..."} — not OpenAI SSE.
    // HOLLY_OWN_URL already points to the chat endpoint
    // (e.g., https://iamhollywoodpro--chat.modal.run). POST directly to it.
    const res = await fetch(HOLLY_OWN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens:  opts.maxTokens   ?? 4096,
        stream:      false,  // Modal endpoint returns full JSON, not SSE
      }),
      signal: AbortSignal.timeout(90_000),  // cold start can be 30-60s; allow headroom
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error');
      throw new Error(`HOLLY-8B API error ${res.status}: ${text}`);
    }

    const data = await res.json() as { response?: string; error?: string };
    if (data.error) throw new Error(`HOLLY-8B: ${data.error}`);
    if (data.response) yield data.response;
  },
};

// ─── Provider registry ────────────────────────────────────────────────────────

export const PROVIDERS = {
  holly_own:   hollyOwnProvider,
  groq:        groqProvider,
  google:      googleProvider,
  cf_workers:  cloudflareProvider,
  nvidia_nim:  nvidiaProvider,
  openrouter:  openrouterProvider,
  together:    togetherProvider,
  mistral:     mistralProvider,
  ollama:      ollamaFreeProvider,
  arcee:       arceeProvider,
} as const;

export type ProviderKey = keyof typeof PROVIDERS;

// ── Hard cost guard for OpenRouter ──────────────────────────────────────────
// Throws if a model ID doesn't end with :free.
// Import and call this from any file that makes OpenRouter API calls.
export function assertFreeModel(model: string): void {
  if (!model.endsWith(':free')) {
    throw new Error(
      `[COST GUARD] Blocked paid OpenRouter model "${model}". Only :free models allowed.`
    );
  }
}

// ─── Shared OpenAI-stream parser (used by NVIDIA + OpenRouter) ────────────────

async function* parseOpenAIStream(body: ReadableStream<Uint8Array>): TokenStream {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(trimmed.slice(6));
        const text = parsed?.choices?.[0]?.delta?.content ?? '';
        if (text) yield text;
      } catch { /* skip */ }
    }
  }
}
