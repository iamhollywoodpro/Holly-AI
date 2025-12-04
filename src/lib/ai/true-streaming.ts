/**
 * HOLLY TRUE STREAMING
 * 
 * Real-time response streaming like GPT-4 / Claude
 * Shows HOLLY's thoughts as they're generated
 */

import OpenAI from 'openai';
import { getHollySystemPrompt } from './holly-system-prompt';
import { estimateTokens } from './context-manager';

const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

// Import tools from main orchestrator
import { HOLLY_TOOLS } from './ai-orchestrator';

export interface StreamEvent {
  type: 'start' | 'content' | 'tool_start' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolStatus?: string;
  error?: string;
}

/**
 * Stream HOLLY's response in real-time
 * Yields events as they happen
 */
export async function* streamHollyResponse(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  conversationId?: string,
  aiSettings?: {
    responseStyle?: 'professional' | 'casual' | 'technical';
    creativity?: number;
  }
): AsyncGenerator<StreamEvent, void, unknown> {
  try {
    yield { type: 'start' };

    // Prepare system prompt
    let hollySystemPrompt = getHollySystemPrompt('Hollywood');
    
    if (aiSettings?.responseStyle === 'professional') {
      hollySystemPrompt += '\n\nIMPORTANT: Use professional, formal language.';
    } else if (aiSettings?.responseStyle === 'technical') {
      hollySystemPrompt += '\n\nIMPORTANT: Provide detailed technical explanations.';
    }

    // Use full conversation (no artificial limits)
    const estimatedTotalTokens = estimateTokens(JSON.stringify(messages));
    console.log(`🌊 [STREAM] Starting - Messages: ${messages.length}, Est. tokens: ${estimatedTotalTokens}`);

    const messagesWithPersonality = [
      { role: 'system' as const, content: hollySystemPrompt },
      ...messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content
      }))
    ];

    // Check if tools are needed
    const lastUserMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const requiresTools = /\b(generate|create|make|build|design|compose|draw|paint|render|produce|synthesize|image|picture|photo|illustration|music|song|beat|melody|audio|sound|video|clip|animation|commit|deploy|push|merge|analyze)\b/.test(lastUserMessage);

    console.log(`🌊 [STREAM] Tools required: ${requiresTools}`);

    // Start streaming from Gemini
    const stream = await gemini.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: messagesWithPersonality,
      tools: requiresTools ? HOLLY_TOOLS as any : undefined,
      tool_choice: requiresTools ? 'required' : 'auto',
      temperature: aiSettings?.creativity ?? 0.7,
      max_tokens: 2048,
      stream: true, // ← CRITICAL: Real streaming
    });

    let accumulatedContent = '';
    let toolCallData: any = null;

    // Process chunks as they arrive from Gemini
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      const finishReason = chunk.choices[0]?.finish_reason;

      // Stream content chunks immediately
      if (delta?.content) {
        accumulatedContent += delta.content;
        yield {
          type: 'content',
          content: delta.content
        };
      }

      // Handle tool calls (need to accumulate first)
      if (delta?.tool_calls) {
        if (!toolCallData) {
          toolCallData = delta.tool_calls[0];
        } else {
          // Merge accumulated tool call data
          if (delta.tool_calls[0]?.function?.arguments) {
            toolCallData.function = toolCallData.function || {};
            toolCallData.function.arguments = (toolCallData.function.arguments || '') + delta.tool_calls[0].function.arguments;
          }
        }
      }

      // When stream finishes with tool call
      if (finishReason === 'tool_calls' && toolCallData) {
        const toolName = toolCallData.function?.name || 'unknown';
        const toolArgs = JSON.parse(toolCallData.function?.arguments || '{}');

        yield {
          type: 'tool_start',
          toolName,
          toolStatus: `Calling ${toolName}...`
        };

        // Execute tool (import from main orchestrator)
        try {
          const { executeTool } = await import('./ai-orchestrator');
          const toolResult = await executeTool(toolName, toolArgs, userId, conversationId);
          
          yield {
            type: 'tool_result',
            toolName,
            toolStatus: 'Tool completed',
            content: JSON.stringify(toolResult)
          };

          // Now stream HOLLY's follow-up response about the tool result
          const followUpStream = await gemini.chat.completions.create({
            model: 'gemini-2.5-flash',
            messages: [
              ...messagesWithPersonality,
              {
                role: 'assistant',
                content: '',
                tool_calls: [toolCallData]
              },
              {
                role: 'tool',
                content: JSON.stringify(toolResult),
                tool_call_id: toolCallData.id || 'tool_call_0'
              }
            ],
            temperature: 0.7,
            max_tokens: 2048,
            stream: true
          });

          // Stream follow-up response
          for await (const followChunk of followUpStream) {
            const followDelta = followChunk.choices[0]?.delta;
            if (followDelta?.content) {
              yield {
                type: 'content',
                content: followDelta.content
              };
            }
          }

        } catch (toolError) {
          console.error('🌊 [STREAM] Tool execution error:', toolError);
          yield {
            type: 'error',
            error: `Tool execution failed: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`
          };
        }
      }
    }

    yield { type: 'done' };

  } catch (error) {
    console.error('🌊 [STREAM] Fatal error:', error);
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Streaming failed'
    };
  }
}
