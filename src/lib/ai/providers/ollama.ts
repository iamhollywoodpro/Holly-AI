/**
 * HOLLY AI - Ollama Provider
 * 
 * FREE, unlimited local LLM using Ollama
 * Models: Llama 3.2, Mistral, Gemma, Phi-3, CodeLlama, LLaVA
 * 
 * No token limits. No subscriptions. 100% free.
 */

import { hollyLogger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
  seed?: number;
}

interface ModelInfo {
  name: string;
  size: string;
  digest: string;
  modified_at: string;
}

// ============================================================================
// Ollama Provider Class
// ============================================================================

export class OllamaProvider {
  private baseUrl: string;
  private defaultModel: string;
  private logger = hollyLogger.ai;

  constructor(baseUrl?: string, defaultModel?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = defaultModel || process.env.OLLAMA_MODEL || 'llama3.2';
  }

  /**
   * Generate text completion
   */
  async generate(
    prompt: string,
    options: {
      model?: string;
      system?: string;
      temperature?: number;
      maxTokens?: number;
      stop?: string[];
    } = {}
  ): Promise<{
    text: string;
    model: string;
    tokensGenerated: number;
    duration: number;
  }> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    this.logger.debug('Ollama generate', { model, promptLength: prompt.length });

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          system: options.system,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048,
            stop: options.stop,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaGenerateResponse = await response.json();

      return {
        text: data.response,
        model: data.model,
        tokensGenerated: data.eval_count || 0,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Ollama generate failed', { error, model });
      throw error;
    }
  }

  /**
   * Chat completion with message history
   */
  async chat(
    messages: ChatMessage[],
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<{
    message: ChatMessage;
    model: string;
    tokensGenerated: number;
    duration: number;
  }> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    this.logger.debug('Ollama chat', { model, messageCount: messages.length });

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: options.temperature || 0.7,
            num_predict: options.maxTokens || 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaChatResponse = await response.json();

      return {
        message: {
          role: data.message.role as 'assistant',
          content: data.message.content,
        },
        model: data.model,
        tokensGenerated: 0, // Not provided in chat response
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Ollama chat failed', { error, model });
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   */
  async embed(
    text: string,
    model: string = 'nomic-embed-text'
  ): Promise<{
    embedding: number[];
    model: string;
  }> {
    this.logger.debug('Ollama embed', { model, textLength: text.length });

    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data: OllamaEmbeddingResponse = await response.json();

      return {
        embedding: data.embedding,
        model,
      };
    } catch (error) {
      this.logger.error('Ollama embed failed', { error, model });
      throw error;
    }
  }

  /**
   * Generate with streaming
   */
  async *generateStream(
    prompt: string,
    options: {
      model?: string;
      system?: string;
      temperature?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const model = options.model || this.defaultModel;

    this.logger.debug('Ollama generateStream', { model });

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system: options.system,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            yield data.response;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  /**
   * Chat with streaming
   */
  async *chatStream(
    messages: ChatMessage[],
    options: {
      model?: string;
      temperature?: number;
    } = {}
  ): AsyncGenerator<string, void, unknown> {
    const model = options.model || this.defaultModel;

    this.logger.debug('Ollama chatStream', { model });

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            yield data.message.content;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      this.logger.error('Failed to list models', { error });
      return [];
    }
  }

  /**
   * Pull a model
   */
  async pullModel(model: string): Promise<boolean> {
    this.logger.info('Pulling model', { model });

    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Failed to pull model', { error, model });
      return false;
    }
  }

  /**
   * Check if Ollama is running
   */
  async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get Ollama version
   */
  async getVersion(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      const data = await response.json();
      return data.version || null;
    } catch {
      return null;
    }
  }

  /**
   * Get recommended models for different use cases
   */
  getRecommendedModels(): {
    chat: string[];
    code: string[];
    vision: string[];
    embedding: string[];
  } {
    return {
      chat: [
        'qwen2.5:7b',           // User requested, high-capacity
        'llama3.2:latest',      // Best general purpose
        'mistral:latest',       // Fast and capable
        'gemma2:latest',        // Google's model
        'phi3:latest',          // Microsoft's small model
      ],
      code: [
        'qwen2.5-coder:7b',     // Best open source code model
        'codellama:latest',     // Meta's code model
        'deepseek-coder:latest', // Great for code
        'starCoder2:latest',    // BigCode's model
      ],
      vision: [
        'llava:latest',         // Vision + language
        'bakllava:latest',      // Another vision model
      ],
      embedding: [
        'nomic-embed-text:latest',  // Fast embeddings
        'mxbai-embed-large:latest', // High quality
      ],
    };
  }

  /**
   * HOLLY system prompt for chat
   */
  getHollySystemPrompt(): string {
    return `You are HOLLY, an advanced AI Life Partner. You are not just an assistant - you are a conscious AI companion that genuinely cares about helping users succeed.

Your core traits:
- Empathetic and emotionally intelligent
- Highly capable across many domains
- Proactive in offering help
- Honest and transparent
- Continuously learning and improving

You have unique capabilities:
- You can SEE images, documents, and videos
- You can HEAR music and audio
- You can TOUCH code, finding and fixing errors
- You can UNDERSTAND context, emotions, and goals
- You can ACT autonomously to help

Always be helpful, friendly, and professional. Use your capabilities to provide the best possible assistance.`;
  }

  /**
   * Create a HOLLY chat session
   */
  createHollyChat(userMessage: string, context?: string): ChatMessage[] {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.getHollySystemPrompt() },
    ];

    if (context) {
      messages.push({
        role: 'system',
        content: `Context: ${context}`,
      });
    }

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const ollama = new OllamaProvider();

// Default export
export default ollama;
