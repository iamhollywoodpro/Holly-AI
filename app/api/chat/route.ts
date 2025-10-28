// HOLLY Chat API Route - FIXED VERSION
// Now supports streaming and matches chat interface expectations

import { NextRequest } from 'next/server';
import { getHollyResponse } from '@/lib/ai/ai-orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  conversationId?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    const { messages, conversationId, userId = 'default-user' } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: messages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate API keys
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY) {
      console.error('⚠️ No AI API keys configured!');
      
      // Return streaming response even for fallback
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const fallbackMessage = "Hey Hollywood! 💜 My AI brain connections aren't set up yet in production. The interface works great, but I need my API keys configured in Vercel environment variables to think for real!";
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: fallbackMessage })}\n\n`)
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    console.log(`💬 HOLLY received message from ${userId}: "${lastMessage.content.substring(0, 50)}..."`);

    // Convert messages to conversation history format
    const conversationHistory = messages.slice(0, -1); // All except last message

    // Get response from HOLLY
    const hollyResponse = await getHollyResponse(
      lastMessage.content,
      conversationHistory
    );

    console.log(`✅ HOLLY responded via ${hollyResponse.model} in ${hollyResponse.responseTime}ms`);

    // Stream the response back
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Split response into chunks for streaming effect
        const words = hollyResponse.content.split(' ');
        let buffer = '';
        
        words.forEach((word, index) => {
          buffer += word + ' ';
          
          // Send chunks every few words
          if ((index + 1) % 3 === 0 || index === words.length - 1) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: buffer })}\n\n`)
            );
            buffer = '';
          }
        });

        // Send done signal
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
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
    console.error('💥 Chat error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
