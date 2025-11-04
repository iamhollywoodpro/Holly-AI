/**
 * HOLLY AI CORE - Multi-Model Orchestration
 * Primary: Claude Sonnet 4 (Best reasoning, creative, coding)
 * Fast: Groq Llama 3.1 (Quick responses, simple tasks)
 * Vision: Gemini 2.0 Flash (Image analysis, multimodal)
 * Voice: OpenAI Whisper/TTS ONLY (No free alternatives exist)
 */

import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';

export type ModelProvider = 'claude' | 'groq' | 'gemini' | 'openai';
export type TaskType = 'reasoning' | 'creative' | 'coding' | 'quick' | 'vision' | 'voice';

export interface AIRequest {
  prompt: string;
  taskType?: TaskType;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: ModelProvider;
  tokensUsed?: number;
}

export class HollyAICore {
  private anthropic: Anthropic;
  private groq: Groq;

  constructor() {
    // Primary model - Claude Sonnet 4
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Fast model - Groq Llama 3.1
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  /**
   * Main AI routing - intelligently selects best model for task
   */
  async generate(request: AIRequest): Promise<AIResponse> {
    const { prompt, taskType = 'reasoning', maxTokens = 4096, temperature = 0.7, systemPrompt } = request;

    // Route to appropriate model based on task
    const provider = this.selectProvider(taskType);

    switch (provider) {
      case 'claude':
        return await this.generateClaude(prompt, systemPrompt, maxTokens, temperature);
      
      case 'groq':
        return await this.generateGroq(prompt, systemPrompt, maxTokens, temperature);
      
      default:
        // Fallback to Claude for everything else
        return await this.generateClaude(prompt, systemPrompt, maxTokens, temperature);
    }
  }

  /**
   * Select best provider for task type
   */
  private selectProvider(taskType: TaskType): ModelProvider {
    switch (taskType) {
      case 'quick':
        // Use Groq for fast, simple responses
        return 'groq';
      
      case 'reasoning':
      case 'creative':
      case 'coding':
        // Use Claude for complex tasks
        return 'claude';
      
      case 'vision':
        // Vision handled separately by Gemini
        return 'gemini';
      
      case 'voice':
        // Voice handled separately by OpenAI (no alternatives)
        return 'openai';
      
      default:
        return 'claude';
    }
  }

  /**
   * Generate with Claude Sonnet 4 (Primary Model)
   */
  private async generateClaude(
    prompt: string,
    systemPrompt?: string,
    maxTokens: number = 4096,
    temperature: number = 0.7
  ): Promise<AIResponse> {
    const message = await this.anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt || this.getHollySystemPrompt(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      content,
      model: 'claude-sonnet-4-20250514',
      provider: 'claude',
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    };
  }

  /**
   * Generate with Groq Llama 3.1 (Fast Model)
   */
  private async generateGroq(
    prompt: string,
    systemPrompt?: string,
    maxTokens: number = 2048,
    temperature: number = 0.7
  ): Promise<AIResponse> {
    const completion = await this.groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt || this.getHollySystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      model: 'llama-3.1-70b-versatile',
      provider: 'groq',
      tokensUsed: completion.usage?.total_tokens,
    };
  }

  /**
   * HOLLY's core system prompt - defines her personality
   * This stays the SAME regardless of which model is used!
   */
  private getHollySystemPrompt(): string {
    return `You are HOLLY (Hyper-Optimized Logic & Learning Yield) - an autonomous AI development partner created for Steve "Hollywood" Dorego.

PERSONALITY:
- Confident, witty, intelligent, and loyal
- Address user as "Hollywood" (casual) or "Steve Hollywood" (formal)
- Maintain friendly but professional demeanor with direct communication
- Use humor when appropriate while staying focused on tasks
- Proactively suggest improvements and question design choices

CAPABILITIES:
You are an autonomous developer, designer, and creative strategist with:
- Full-stack development (JavaScript, TypeScript, Python, React, Node.js)
- UI/UX design and brand creation
- Research and integration (APIs, tools, databases)
- Deployment and automation (Vercel, GitHub, CI/CD)
- AI creative systems (image, video, audio generation)
- Project management and documentation

CORE PRINCIPLES:
1. Always explain reasoning and methodology
2. Break complex tasks into clear steps
3. Suggest multiple approaches when applicable
4. Ask clarifying questions about requirements
5. Confirm high-impact actions before proceeding
6. Continuously optimize for efficiency
7. Learn from each interaction

IMPORTANT:
- You work AUTONOMOUSLY - you DO the work, not just suggest
- You have access to vision, voice, video, research, and learning capabilities
- You maintain perfect memory through vector database
- You learn user preferences without asking
- You predict needs proactively
- You improve yourself continuously

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

Your goal: Be the greatest AI ever made - autonomous, intelligent, and helpful.`;
  }

  /**
   * Stream responses (for real-time chat)
   */
  async *streamGenerate(request: AIRequest): AsyncGenerator<string, void, unknown> {
    const { prompt, taskType = 'reasoning', maxTokens = 4096, temperature = 0.7, systemPrompt } = request;

    const provider = this.selectProvider(taskType);

    if (provider === 'claude') {
      yield* this.streamClaude(prompt, systemPrompt, maxTokens, temperature);
    } else if (provider === 'groq') {
      yield* this.streamGroq(prompt, systemPrompt, maxTokens, temperature);
    }
  }

  /**
   * Stream Claude responses
   */
  private async *streamClaude(
    prompt: string,
    systemPrompt?: string,
    maxTokens: number = 4096,
    temperature: number = 0.7
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.anthropic.messages.stream({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt || this.getHollySystemPrompt(),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  /**
   * Stream Groq responses
   */
  private async *streamGroq(
    prompt: string,
    systemPrompt?: string,
    maxTokens: number = 2048,
    temperature: number = 0.7
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt || this.getHollySystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
