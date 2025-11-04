import { NextRequest } from 'next/server';
import { streamHollyResponse } from '@/lib/ai/ai-orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ChatRequest {
  message: string;
  userId: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    const { message, userId, conversationHistory = [] } = body;

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    // Check API keys
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY) {
      const fallbackMessage = "Hey Hollywood! 💜 My AI connections need to be set up in production. Add ANTHROPIC_API_KEY and GROQ_API_KEY to Vercel environment variables!";
      
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: fallbackMessage, done: false })}\n\n`));
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true, emotion: 'thoughtful', model: 'fallback' })}\n\n`));
            controller.close();
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    console.log(`🌊 Streaming response for: "${message.substring(0, 50)}..."`);

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('🚀 Starting streamHollyResponse...');
          const finalResponse = await streamHollyResponse(
            message,
            conversationHistory,
            (chunk) => {
              // Send each chunk as Server-Sent Event
              console.log('📦 Sending chunk:', chunk.substring(0, 50));
              const data = JSON.stringify({ content: chunk, done: false });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          );
          
          console.log('✅ Stream complete, sending final response');
          
          // Send final metadata
            const finalData = JSON.stringify({
              done: true,
              emotion: finalResponse.emotion,
              model: finalResponse.model,
              tokensUsed: finalResponse.tokensUsed,
              responseTime: finalResponse.responseTime,
            });
            controller.enqueue(new TextEncoder().encode(`data: ${finalData}\n\n`));
            controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = JSON.stringify({
            error: true,
            message: 'Streaming failed',
            done: true,
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream setup error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}
