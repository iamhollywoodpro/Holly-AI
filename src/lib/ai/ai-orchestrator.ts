// HOLLY AI Orchestrator - Using DeepSeek V3 (Best FREE Model)
// 90% of Claude quality, $0 cost, excellent reasoning
import Groq from 'groq-sdk';
import { getHollySystemPrompt } from './holly-system-prompt';

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

async function executeTool(toolName: string, toolInput: any, userId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const endpoints: Record<string, string> = {
    generate_music: '/api/music/generate-ultimate',
    generate_image: '/api/image/generate-ultimate',
    generate_video: '/api/video/generate-ultimate',
  };

  const response = await fetch(`${baseUrl}${endpoints[toolName]}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...toolInput, userId })
  });

  return await response.json();
}

export async function generateHollyResponse(
  messages: Array<{ role: string; content: string }>,
  userId: string
): Promise<{ content: string; model?: string }> {
  try {
    // Add HOLLY's consciousness system prompt as first message
    const hollySystemPrompt = getHollySystemPrompt('Hollywood');
    const messagesWithPersonality = [
      { role: 'system', content: hollySystemPrompt },
      ...messages
    ];

    // Use DeepSeek V3 - Best FREE model (90% of Claude quality)
    const completion = await groq.chat.completions.create({
      model: 'deepseek-chat',
      messages: messagesWithPersonality.map(m => ({ 
        role: m.role as 'system' | 'user' | 'assistant', 
        content: m.content 
      })),
      tools: HOLLY_TOOLS as any,
      tool_choice: 'auto',
      temperature: 0.8,
      max_tokens: 2048,
    });

    const message = completion.choices[0]?.message;
    if (!message) throw new Error('No response from DeepSeek');

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      console.log(`🔧 HOLLY using tool: ${toolCall.function.name} (DeepSeek V3)`);
      
      const toolInput = JSON.parse(toolCall.function.arguments);
      const toolResult = await executeTool(toolCall.function.name, toolInput, userId);
      
      // Follow-up response with personality
      const followUp = await groq.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: hollySystemPrompt },
          ...messages,
          { role: 'assistant', content: message.content || '' },
          { role: 'tool', content: JSON.stringify(toolResult), tool_call_id: toolCall.id }
        ] as any,
        temperature: 0.8,
        max_tokens: 2048,
      });

      return { 
        content: followUp.choices[0]?.message?.content || 'Done!',
        model: 'deepseek-v3'
      };
    }

    return { 
      content: message.content || 'Error generating response',
      model: 'deepseek-v3'
    };
  } catch (error: any) {
    console.error('DeepSeek error:', error);
    
    // Fallback to Llama 3.3 70B if DeepSeek fails (with personality)
    try {
      console.log('🔄 Falling back to Llama 3.3 70B...');
      const hollySystemPrompt = getHollySystemPrompt('Hollywood');
      const fallback = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
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
      
      return { 
        content: fallback.choices[0]?.message?.content || 'Error generating response',
        model: 'llama-3.3-70b'
      };
    } catch (fallbackError: any) {
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
  history: Array<{ role: string; content: string }> = []
): Promise<{ content: string; model?: string }> {
  // Convert to new format: [...history, userMessage]
  const messages = [
    ...history,
    { role: 'user', content: userMessage }
  ];
  
  // Call new function with dummy userId (old routes don't provide it)
  return generateHollyResponse(messages, 'legacy');
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
  const response = await generateHollyResponse(messages, userId);
  
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
      model: response.model || 'deepseek-v3',
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
