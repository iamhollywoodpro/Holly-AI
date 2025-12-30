/**
 * Enhanced Streaming Service
 * 
 * Provides Manus-like smooth streaming experience with:
 * - Smooth token delivery
 * - Visual progress indicators
 * - Tool use visualization
 * - Sandbox window integration
 */

import OpenAI from "openai";
import { logger } from "../monitoring/logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface StreamEvent {
  type: "thinking" | "content" | "tool_start" | "tool_progress" | "tool_result" | "done" | "error";
  content?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  progress?: number;
  message?: string;
  error?: string;
  timestamp: number;
}

export interface StreamingConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  showThinking?: boolean;
  showToolUse?: boolean;
  smoothing?: boolean;
}

export class EnhancedStreamingService {
  private defaultConfig: StreamingConfig = {
    model: "gpt-4-turbo-preview",
    temperature: 0.7,
    maxTokens: 4096,
    showThinking: true,
    showToolUse: true,
    smoothing: true,
  };

  /**
   * Stream response with enhanced UX
   */
  async *streamResponse(
    messages: Array<{ role: string; content: string }>,
    config?: Partial<StreamingConfig>
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // Emit thinking state
      if (finalConfig.showThinking) {
        yield {
          type: "thinking",
          message: "Processing your request...",
          timestamp: Date.now(),
        };
      }

      logger.info("Starting enhanced streaming", {
        messageCount: messages.length,
        model: finalConfig.model,
        category: "streaming",
      });

      // Create streaming completion
      const stream = await openai.chat.completions.create({
        model: finalConfig.model!,
        messages: messages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        })),
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        stream: true,
      });

      let buffer = "";
      let tokenCount = 0;

      // Process stream chunks
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (!delta) continue;

        // Handle content
        if (delta.content) {
          buffer += delta.content;
          tokenCount++;

          // Smooth delivery: emit every few tokens or on punctuation
          if (
            finalConfig.smoothing &&
            (buffer.match(/[.!?,;:\n]/) || tokenCount % 3 === 0)
          ) {
            yield {
              type: "content",
              content: buffer,
              timestamp: Date.now(),
            };
            buffer = "";
          } else if (!finalConfig.smoothing) {
            // Immediate delivery
            yield {
              type: "content",
              content: delta.content,
              timestamp: Date.now(),
            };
          }
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              yield {
                type: "tool_start",
                toolName: toolCall.function.name,
                toolArgs: toolCall.function.arguments,
                timestamp: Date.now(),
              };
            }
          }
        }
      }

      // Flush remaining buffer
      if (buffer) {
        yield {
          type: "content",
          content: buffer,
          timestamp: Date.now(),
        };
      }

      // Emit done
      yield {
        type: "done",
        message: "Response complete",
        timestamp: Date.now(),
      };

      logger.info("Enhanced streaming completed", {
        tokenCount,
        category: "streaming",
      });
    } catch (error: any) {
      logger.error("Enhanced streaming failed", {
        error: error.message,
        category: "streaming",
      });

      yield {
        type: "error",
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Stream with tool execution visualization
   */
  async *streamWithTools(
    messages: Array<{ role: string; content: string }>,
    tools: any[],
    config?: Partial<StreamingConfig>
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const finalConfig = { ...this.defaultConfig, ...config };

    try {
      // Emit thinking state
      if (finalConfig.showThinking) {
        yield {
          type: "thinking",
          message: "Analyzing your request and selecting tools...",
          timestamp: Date.now(),
        };
      }

      logger.info("Starting tool-enhanced streaming", {
        messageCount: messages.length,
        toolCount: tools.length,
        category: "streaming",
      });

      // Create streaming completion with tools
      const stream = await openai.chat.completions.create({
        model: finalConfig.model!,
        messages: messages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        })),
        tools,
        tool_choice: "auto",
        temperature: finalConfig.temperature,
        max_tokens: finalConfig.maxTokens,
        stream: true,
      });

      let buffer = "";
      let currentToolCall: any = null;

      // Process stream chunks
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (!delta) continue;

        // Handle content
        if (delta.content) {
          buffer += delta.content;

          // Smooth delivery
          if (
            finalConfig.smoothing &&
            (buffer.match(/[.!?,;:\n]/) || buffer.length > 50)
          ) {
            yield {
              type: "content",
              content: buffer,
              timestamp: Date.now(),
            };
            buffer = "";
          } else if (!finalConfig.smoothing) {
            yield {
              type: "content",
              content: delta.content,
              timestamp: Date.now(),
            };
          }
        }

        // Handle tool calls
        if (delta.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.function?.name) {
              currentToolCall = {
                name: toolCall.function.name,
                args: toolCall.function.arguments,
              };

              if (finalConfig.showToolUse) {
                yield {
                  type: "tool_start",
                  toolName: currentToolCall.name,
                  toolArgs: currentToolCall.args,
                  message: `Using tool: ${currentToolCall.name}`,
                  timestamp: Date.now(),
                };
              }
            }
          }
        }
      }

      // Flush remaining buffer
      if (buffer) {
        yield {
          type: "content",
          content: buffer,
          timestamp: Date.now(),
        };
      }

      // Emit done
      yield {
        type: "done",
        message: "Response complete",
        timestamp: Date.now(),
      };

      logger.info("Tool-enhanced streaming completed", {
        category: "streaming",
      });
    } catch (error: any) {
      logger.error("Tool-enhanced streaming failed", {
        error: error.message,
        category: "streaming",
      });

      yield {
        type: "error",
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Create a progress indicator for long operations
   */
  async *emitProgress(
    operation: string,
    steps: string[],
    duration: number
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const stepDuration = duration / steps.length;

    for (let i = 0; i < steps.length; i++) {
      yield {
        type: "tool_progress",
        message: steps[i],
        progress: ((i + 1) / steps.length) * 100,
        timestamp: Date.now(),
      };

      // Wait for step duration
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
    }

    yield {
      type: "tool_result",
      message: `${operation} completed`,
      progress: 100,
      timestamp: Date.now(),
    };
  }
}

export const enhancedStreaming = new EnhancedStreamingService();
