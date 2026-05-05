/**
 * HOLLY Ollama Service — Phase 4B
 *
 * Provides a local LLM fallback via Ollama (https://ollama.ai).
 * When Ollama is running locally (or on a self-hosted server),
 * HOLLY can route requests there instead of paid APIs.
 *
 * Supported models (auto-detected from what's pulled):
 *   gemma4:26b (Gemma 4 26B MoE — primary), gemma4:e4b (fast),
 *   llama3.1:8b (HOLLY-8B fine-tuning base), mistral, qwen2.5-coder, codellama, phi3
 *
 * Usage:
 *   const ollama = getOllamaService();
 *   const healthy = await ollama.isHealthy();
 *   const reply   = await ollama.chat(messages, { model: 'llama3.2' });
 *   for await (const chunk of ollama.chatStream(messages)) { ... }
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface OllamaChatResult {
  content: string;
  model: string;
  done: boolean;
  totalDuration?: number;   // nanoseconds
  evalCount?: number;       // tokens generated
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modifiedAt: string;
}

export interface OllamaHealth {
  available: boolean;
  baseUrl: string;
  models: OllamaModel[];
  preferredModel: string | null;
  latencyMs?: number;
  error?: string;
}

// Model preference order — best quality first
const PREFERRED_MODELS = [
  'gemma4:31b',
  'gemma4:26b',
  'qwen3.5:32b',
  'qwen3.5:14b',
  'deepseek-r1:14b',
  'llama3.2',
  'llama3.1',
  'llama3',
  'qwen2.5-coder',
  'qwen2.5',
  'mistral',
  'codellama',
  'phi3',
  'phi3.5',
  'gemma2',
  'gemma',
  'deepseek-coder',
  'neural-chat',
];

export class OllamaService {
  private baseUrl: string;
  private _cachedHealth: OllamaHealth | null = null;
  private _lastHealthCheck = 0;
  private readonly HEALTH_CACHE_MS = 30_000; // re-check every 30s

  constructor(baseUrl?: string) {
    this.baseUrl = (
      baseUrl ||
      process.env.OLLAMA_BASE_URL ||
      'http://localhost:11434'
    ).replace(/\/$/, '');
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  /**
   * Check if Ollama is running and which models are available.
   * Results are cached for 30 seconds to avoid per-request overhead.
   */
  async isHealthy(force = false): Promise<boolean> {
    const health = await this.getHealth(force);
    return health.available;
  }

  async getHealth(force = false): Promise<OllamaHealth> {
    const now = Date.now();
    if (!force && this._cachedHealth && now - this._lastHealthCheck < this.HEALTH_CACHE_MS) {
      return this._cachedHealth;
    }

    const t0 = Date.now();
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/api/tags`, 3000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { models?: any[] };

      const models: OllamaModel[] = (data.models || []).map((m: any) => ({
        name: m.name,
        size: m.size || 0,
        digest: m.digest || '',
        modifiedAt: m.modified_at || '',
      }));

      const preferredModel = this._pickBestModel(models.map(m => m.name));

      this._cachedHealth = {
        available: true,
        baseUrl: this.baseUrl,
        models,
        preferredModel,
        latencyMs: Date.now() - t0,
      };
    } catch (err: any) {
      this._cachedHealth = {
        available: false,
        baseUrl: this.baseUrl,
        models: [],
        preferredModel: null,
        error: err.message,
      };
    }

    this._lastHealthCheck = Date.now();
    return this._cachedHealth!;
  }

  private _pickBestModel(available: string[]): string | null {
    for (const preferred of PREFERRED_MODELS) {
      const match = available.find(m => m.startsWith(preferred));
      if (match) return match;
    }
    return available[0] || null;
  }

  // ─── Chat (non-streaming) ─────────────────────────────────────────────────

  async chat(
    messages: OllamaMessage[],
    opts: OllamaChatOptions = {}
  ): Promise<OllamaChatResult> {
    const health = await this.getHealth();
    if (!health.available) {
      throw new Error(`[Ollama] Not available at ${this.baseUrl}: ${health.error}`);
    }

    const model = opts.model || health.preferredModel || 'llama3.2';

    const body = JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: opts.temperature ?? 0.7,
        ...(opts.maxTokens ? { num_predict: opts.maxTokens } : {}),
      },
    });

    const res = await fetchWithTimeout(`${this.baseUrl}/api/chat`, 60_000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Ollama] Chat error (${res.status}): ${err}`);
    }

    const data = await res.json() as any;
    return {
      content: data.message?.content || '',
      model: data.model || model,
      done: data.done ?? true,
      totalDuration: data.total_duration,
      evalCount: data.eval_count,
    };
  }

  // ─── Chat (streaming) ─────────────────────────────────────────────────────

  async *chatStream(
    messages: OllamaMessage[],
    opts: OllamaChatOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const health = await this.getHealth();
    if (!health.available) {
      throw new Error(`[Ollama] Not available: ${health.error}`);
    }

    const model = opts.model || health.preferredModel || 'llama3.2';

    const res = await fetchWithTimeout(`${this.baseUrl}/api/chat`, 120_000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature: opts.temperature ?? 0.7,
          ...(opts.maxTokens ? { num_predict: opts.maxTokens } : {}),
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[Ollama] Stream error (${res.status}): ${err}`);
    }

    if (!res.body) throw new Error('[Ollama] No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as any;
          const token = chunk.message?.content || '';
          if (token) yield token;
          if (chunk.done) return;
        } catch {
          // malformed line — skip
        }
      }
    }
  }

  // ─── Generate (raw completion, no chat template) ──────────────────────────

  async generate(
    prompt: string,
    opts: OllamaChatOptions & { system?: string } = {}
  ): Promise<string> {
    const health = await this.getHealth();
    if (!health.available) throw new Error(`[Ollama] Not available: ${health.error}`);

    const model = opts.model || health.preferredModel || 'llama3.2';

    const res = await fetchWithTimeout(`${this.baseUrl}/api/generate`, 60_000, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: opts.system || '',
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.7,
          ...(opts.maxTokens ? { num_predict: opts.maxTokens } : {}),
        },
      }),
    });

    if (!res.ok) throw new Error(`[Ollama] Generate error (${res.status})`);
    const data = await res.json() as any;
    return data.response || '';
  }

  // ─── Pull a model ─────────────────────────────────────────────────────────

  async pull(modelName: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/api/pull`, 300_000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: false }),
      });
      if (!res.ok) {
        const err = await res.text();
        return { success: false, message: `Pull failed (${res.status}): ${err}` };
      }
      // Invalidate cache so next health check picks up new model
      this._cachedHealth = null;
      return { success: true, message: `Model ${modelName} pulled successfully` };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _instance: OllamaService | null = null;
export function getOllamaService(): OllamaService {
  if (!_instance) _instance = new OllamaService();
  return _instance;
}
export const ollamaService = getOllamaService();
