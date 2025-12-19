/**
 * HOLLY Streaming Orchestrator
 * 
 * Provides TRUE real-time streaming (like this conversation)
 * Shows HOLLY's thoughts as they're generated, not after completion
 */

import OpenAI from 'openai';
import { getHollySystemPrompt } from './holly-system-prompt';
import { estimateTokens } from './context-manager';

const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY || '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolArgs?: any;
  error?: string;
}

/**
 * Generate HOLLY response with TRUE streaming
 * Returns an async generator that yields chunks in real-time
 */
export async function* generateStreamingResponse(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  conversationId?: string,
  tools?: any[]
): AsyncGenerator<StreamChunk, void, unknown> {
  try {
    const hollySystemPrompt = getHollySystemPrompt('Hollywood');
    
    // Prepare messages
    const messagesWithPersonality = [
      { role: 'system' as const, content: hollySystemPrompt },
      ...messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      }))
    ];

    // Detect if tools are needed
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const requiresTools = /\\b(generate|create|make|build|design)\\b/.test(lastUserMessage);

    console.log(`🌊 [STREAMING] Starting real-time response (tools: ${requiresTools ? 'enabled' : 'disabled'})`);

    // Call Gemini with streaming enabled
    const stream = await gemini.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: messagesWithPersonality,
      tools: tools || [],
      tool_choice: requiresTools ? 'required' : 'auto',
      temperature: 0.7,
      max_tokens: 2048,
      stream: true, // ← CRITICAL: Enable streaming
    });

    let fullContent = '';
    let isToolCall = false;
    let toolCallBuffer = '';

    // Process stream chunks as they arrive
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      
      if (!delta) continue;

      // Handle content chunks (normal text response)
      if (delta.content) {
        fullContent += delta.content;
        yield {
          type: 'content',
          content: delta.content
        };
      }

      // Handle tool calls (buffer until complete)
      if (delta.tool_calls) {
        isToolCall = true;
        toolCallBuffer += JSON.stringify(delta.tool_calls);
        
        // Check if tool call is complete (simplified check)
        if (chunk.choices[0]?.finish_reason === 'tool_calls') {
          try {
            const toolCall = JSON.parse(toolCallBuffer);
            yield {
              type: 'tool_call',
              toolName: toolCall[0]?.function?.name,
              toolArgs: JSON.parse(toolCall[0]?.function?.arguments || '{}')
            };
          } catch (e) {
            console.error('Tool call parsing error:', e);
          }
        }
      }
    }

    // Stream complete
    yield { type: 'done' };

  } catch (error) {
    console.error('🌊 [STREAMING] Error:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown streaming error'
    };
  }
}

/**
 * Helper: Convert streaming chunks to a complete response
 * (For backward compatibility with non-streaming code)
 */
export async function streamToComplete(
  generator: AsyncGenerator<StreamChunk, void, unknown>
): Promise<{ content: string; hadError: boolean }> {
  let fullContent = '';
  let hadError = false;

  for await (const chunk of generator) {
    if (chunk.type === 'content' && chunk.content) {
      fullContent += chunk.content;
    } else if (chunk.type === 'error') {
      hadError = true;
      fullContent += `\n\n[Error: ${chunk.error}]`;
    }
  }

  return { content: fullContent, hadError };
}
