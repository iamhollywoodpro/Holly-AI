// HOLLY AI Orchestrator - Using Google Gemini 2.0 Flash (BEST FREE MODEL)
// 1M tokens/minute, 200 requests/day, completely FREE, cutting-edge Google AI
import OpenAI from 'openai';
import { getHollySystemPrompt } from './holly-system-prompt';
// Work Log system disabled for regular responses - only used for creation tasks
// import { logWorking, logSuccess, logError, logInfo } from '@/lib/logging/work-log-service';

// Google Gemini via OpenAI-compatible endpoint
const gemini = new OpenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

// Groq as fallback
import Groq from 'groq-sdk';
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

const HOLLY_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'generate_music',
      description: 'Generate music using Suno AI (primary) or free alternatives',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Music description' },
          lyrics: { type: 'string', description: 'Optional lyrics' },
          modelPreference: { 
            type: 'string', 
            enum: ['suno', 'musicgen', 'riffusion', 'audiocraft', 'audioldm'] 
          }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate images using 8 FREE Hugging Face models',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image description' },
          style: { type: 'string', description: 'Art style' },
          modelPreference: { 
            type: 'string',
            enum: ['flux-schnell', 'flux-dev', 'sdxl', 'animagine', 'realistic', 'proteus']
          }
        },
        required: ['prompt']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_video',
      description: 'Generate videos using 5 FREE Hugging Face models',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Video description' },
          modelPreference: { 
            type: 'string',
            enum: ['zeroscope-v2', 'animatediff', 'cogvideo', 'modelscope', 'lavie']
          }
        },
        required: ['prompt']
      }
    }
  }
];

async function executeTool(toolName: string, toolInput: any, userId: string, conversationId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const endpoints: Record<string, string> = {
    generate_music: '/api/music/generate-ultimate',
    generate_image: '/api/image/generate-ultimate',
    generate_video: '/api/video/generate-ultimate',
  };

  // Log tool execution start
  const toolDisplayNames: Record<string, string> = {
    generate_music: 'Music Generation',
    generate_image: 'Image Generation',
    generate_video: 'Video Generation',
  };
  
  // Work log disabled - will be enabled only for explicit creation requests
  // await logWorking(userId, `Starting ${toolDisplayNames[toolName]}`, {
  //   conversationId,
  //   metadata: { 
  //     tool: toolName, 
  //     prompt: toolInput.prompt?.substring(0, 100) || 'N/A',
  //     model: toolInput.modelPreference || 'auto'
  //   }
  // });

  try {
    const response = await fetch(`${baseUrl}${endpoints[toolName]}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...toolInput, userId })
    });

    const result = await response.json();
    
    // Work log disabled
    // await logSuccess(userId, `${toolDisplayNames[toolName]} completed`, {
    //   conversationId,
    //   metadata: { 
    //     tool: toolName,
    //     status: result.success ? 'success' : 'failed',
    //     model: result.modelUsed || toolInput.modelPreference
    //   }
    // });
    
    return result;
  } catch (error: any) {
    // Work log disabled
    // await logError(userId, `${toolDisplayNames[toolName]} failed: ${error.message}`, {
    //   conversationId,
    //   metadata: { tool: toolName, error: error.message }
    // });
    throw error;
  }
}

export async function generateHollyResponse(
  messages: Array<{ role: string; content: string }>,
  userId: string,
  conversationId?: string,
  aiSettings?: {
    responseStyle?: 'professional' | 'casual' | 'technical';
    creativity?: number;
    contextWindow?: number;
  },
  systemPromptOverride?: string,
  userName?: string
): Promise<{ content: string; model?: string }> {
  const startTime = Date.now();
  
  try {
    // Work log disabled for regular AI responses
    // await logWorking(userId, 'Generating AI response with Gemini 2.0 Flash', {
    //   conversationId,
    //   metadata: { 
    //     model: 'gemini-2.5-flash',
    //     messageCount: messages.length
    //   }
    // });
    
    // Add HOLLY's consciousness system prompt as first message
    // Use personalized system prompt if provided, otherwise use default
    let hollySystemPrompt = systemPromptOverride || getHollySystemPrompt(userName || 'Hollywood');
    
    // Apply user's response style preference
    if (aiSettings?.responseStyle) {
      if (aiSettings.responseStyle === 'professional') {
        hollySystemPrompt += '\n\nIMPORTANT: Use professional, formal language. Maintain a business-appropriate tone.';
      } else if (aiSettings.responseStyle === 'technical') {
        hollySystemPrompt += '\n\nIMPORTANT: Provide detailed technical explanations with precise terminology. Include implementation details and best practices.';
      }
      // 'casual' is default - no modification needed
    }
    
    // Apply context window (limit conversation history)
    const contextWindow = aiSettings?.contextWindow || 20;
    const limitedMessages = messages.length > contextWindow 
      ? messages.slice(-contextWindow) 
      : messages;
    
    const messagesWithPersonality = [
      { role: 'system', content: hollySystemPrompt },
      ...limitedMessages
    ];

    // Use Google Gemini 2.0 Flash - BEST FREE MODEL
    // 1M tokens/minute, 200 requests/day, $0 cost forever
    const completion = await gemini.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: messagesWithPersonality.map(m => ({ 
        role: m.role as 'system' | 'user' | 'assistant', 
        content: m.content 
      })),
      tools: HOLLY_TOOLS as any,
      tool_choice: 'auto',
      temperature: aiSettings?.creativity ?? 0.7, // User's creativity setting
      max_tokens: 2048,
    });

    const message = completion.choices[0]?.message;
    if (!message) throw new Error('No response from Gemini');

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0] as any;
      console.log(`🔧 HOLLY using tool: ${toolCall.function?.name || 'unknown'} (Gemini 2.0 Flash)`);
      
      const toolInput = JSON.parse(toolCall.function?.arguments || '{}');
      const toolResult = await executeTool(toolCall.function?.name || '', toolInput, userId, conversationId);
      
      // Follow-up response with personality
      const followUp = await gemini.chat.completions.create({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: hollySystemPrompt },
          ...messages,
          { role: 'assistant', content: message.content || '' },
          { role: 'tool', content: JSON.stringify(toolResult), tool_call_id: toolCall.id || '' }
        ] as any,
        temperature: aiSettings?.creativity ?? 0.7, // User's creativity setting
        max_tokens: 2048,
      });

      const duration = Date.now() - startTime;
      const responseContent = followUp.choices[0]?.message?.content || 'Done!';
      
      // Work log disabled
      // await logSuccess(userId, `AI response with tool completed (${duration}ms)`, {
      //   conversationId,
      //   metadata: { 
      //     model: 'gemini-2.5-flash',
      //     duration,
      //     tokens: Math.floor(responseContent.length / 4),
      //     toolUsed: toolCall.function?.name
      //   }
      // });
      
      return { 
        content: responseContent,
        model: 'gemini-2.5-flash'
      };
    }

    const duration = Date.now() - startTime;
    const responseContent = message.content || 'Error generating response';
    
    // Work log disabled
    // await logSuccess(userId, `AI response generated (${duration}ms)`, {
    //   conversationId,
    //   metadata: { 
    //     model: 'gemini-2.5-flash',
    //     duration,
    //     tokens: Math.floor(responseContent.length / 4)
    //   }
    // });
    
    return { 
      content: responseContent,
      model: 'gemini-2.5-flash'
    };
  } catch (error: any) {
    console.error('Gemini error:', error);
    
    // Work log disabled
    // await logError(userId, `Gemini error: ${error.message}`, {
    //   conversationId,
    //   metadata: { model: 'gemini-2.5-flash', error: error.message }
    // });
    
    // Fallback to Groq Llama 3.1 8B (500K tokens/day free)
    try {
      console.log('🔄 Falling back to Groq Llama 3.1 8B...');
      
      // Work log disabled
      // await logInfo(userId, 'Switching to Groq Llama 3.1 8B fallback', {
      //   conversationId,
      //   metadata: { model: 'llama-3.1-8b-instant' }
      // });
      
      const hollySystemPrompt = getHollySystemPrompt('Hollywood');
      const fallback = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: hollySystemPrompt },
          ...messages
        ].map(m => ({ 
          role: m.role as 'system' | 'user' | 'assistant', 
          content: m.content 
        })),
        temperature: 0.8,
        max_tokens: 2048,
      });
      
      const duration = Date.now() - startTime;
      const fallbackContent = fallback.choices[0]?.message?.content || 'Error generating response';
      
      // Work log disabled
      // await logSuccess(userId, `Fallback response generated (${duration}ms)`, {
      //   conversationId,
      //   metadata: { 
      //     model: 'llama-3.1-8b',
      //     duration,
      //     tokens: Math.floor(fallbackContent.length / 4)
      //   }
      // });
      
      return { 
        content: fallbackContent,
        model: 'llama-3.1-8b'
      };
    } catch (fallbackError: any) {
      // Work log disabled
      // await logError(userId, `All models failed: ${fallbackError.message}`, {
      //   conversationId,
      //   metadata: { error: fallbackError.message }
      // });
      
      return { 
        content: `I encountered an error: ${error.message}. Please try again.`,
        model: 'error'
      };
    }
  }
}

// Legacy wrapper for backward compatibility with old chat routes
// Old signature: getHollyResponse(userMessage: string, history: Message[])
export async function getHollyResponse(
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  aiSettings?: {
    responseStyle?: 'professional' | 'casual' | 'technical';
    creativity?: number;
    contextWindow?: number;
    systemPrompt?: string;
    userName?: string;
  }
): Promise<{ content: string; model?: string }> {
  // Convert to new format: [...history, userMessage]
  const messages = [
    ...history,
    { role: 'user', content: userMessage }
  ];
  
  // Call new function with dummy userId (old routes don't provide it)
  return generateHollyResponse(
    messages, 
    'legacy', 
    undefined, 
    aiSettings,
    aiSettings?.systemPrompt,
    aiSettings?.userName
  );
}

// Streaming version with legacy signature support
// Old signature: streamHollyResponse(message: string, history: Message[], onChunk?: callback)
export async function streamHollyResponse(
  messageOrMessages: string | Array<{ role: string; content: string }>,
  historyOrUserId: Array<{ role: string; content: string }> | string = [],
  onChunkCallback?: (chunk: string) => void
): Promise<any> {
  // Detect which signature is being used
  const isLegacySignature = typeof messageOrMessages === 'string';
  
  let messages: Array<{ role: string; content: string }>;
  let userId: string;
  
  if (isLegacySignature) {
    // Legacy: (message: string, history: Message[], callback)
    const userMessage = messageOrMessages as string;
    const history = historyOrUserId as Array<{ role: string; content: string }>;
    messages = [...history, { role: 'user', content: userMessage }];
    userId = 'legacy';
  } else {
    // New: (messages: Message[], userId: string)
    messages = messageOrMessages as Array<{ role: string; content: string }>;
    userId = historyOrUserId as string;
  }
  
  // Get the response
  const response = await generateHollyResponse(messages, userId, undefined);
  
  // If callback provided (legacy streaming), call it with chunks
  if (onChunkCallback) {
    // Simulate streaming by sending content in chunks
    const content = response.content;
    const chunkSize = 50;
    for (let i = 0; i < content.length; i += chunkSize) {
      onChunkCallback(content.substring(i, i + chunkSize));
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Return metadata for legacy format
    return {
      content: response.content,
      model: response.model || 'gemini-2.5-flash',
      emotion: 'focused',
      tokensUsed: Math.floor(response.content.length / 4),
      responseTime: 1500,
    };
  }
  
  // New format: return ReadableStream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify(response)));
      controller.close();
    }
  });
  
  return stream;
}

export default generateHollyResponse;
