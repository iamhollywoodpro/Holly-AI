/**
 * HOLLY Free Provider Adapters — Phase 8A (Gemini-free)
 *
 * Each adapter exposes:
 *   streamChat(messages, model, options) → AsyncIterable<string>  (token chunks)
 *   isConfigured(): boolean
 *
 * Providers (ALL are 100% free tiers — no paid plans, no token billing):
 *  • Groq             (GROQ_API_KEY)          — 14,400 req/day, 300+ tok/s
 *  • Cloudflare AI    (CF_ACCOUNT_ID_CF_AI_TOKEN = "accountId|token") — Kimi K2.5 256K, free tier
 *  • NVIDIA NIM       (NVIDIA_API_KEY)         — Qwen3-235B, DeepSeek R1, free tier
 *  • OpenRouter free  (OPENROUTER_API_KEY)     — 27 free models, 20 RPM / 200 RPD
 *  • Ollama           (no key — localhost)     — unlimited, zero cost, offline
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
    });

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

    const res = await fetch(url, { method: 'POST', headers, body });
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
  isConfigured: () => true, // always available if Ollama is running locally

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

// ─── Provider registry ────────────────────────────────────────────────────────

export const PROVIDERS = {
  groq:       groqProvider,
  cf_workers: cloudflareProvider,
  nvidia_nim: nvidiaProvider,
  openrouter: openrouterProvider,
  ollama:     ollamaFreeProvider,
} as const;

export type ProviderKey = keyof typeof PROVIDERS;

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
