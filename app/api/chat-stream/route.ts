/**
 * HOLLY Chat API - TRUE STREAMING VERSION
 * 
 * Real-time response streaming (like this conversation)
 * Falls back to /api/chat if streaming fails
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { DEFAULT_SETTINGS } from '@/lib/settings/default-settings';
import { streamHollyResponse } from '@/lib/ai/true-streaming';

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
  const encoder = new TextEncoder();
  
  try {
    // Authenticate
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
      include: {
        settings: true,
      },
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: ChatRequest = await request.json();
    const { messages, conversationId } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user settings
    const userSettings = user.settings?.[0] || DEFAULT_SETTINGS;

    console.log(`🌊 [CHAT-STREAM] User: ${user.id}, Messages: ${messages.length}, Conversation: ${conversationId || 'none'}`);

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream HOLLY's response in real-time
          const responseStream = streamHollyResponse(
            messages,
            user.id,
            conversationId,
            {
              responseStyle: userSettings.ai.responseStyle,
              creativity: userSettings.ai.creativity,
            }
          );

          let fullResponse = '';

          for await (const event of responseStream) {
            // Send event to client
            const data = JSON.stringify(event);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));

            // Accumulate full response for database
            if (event.type === 'content' && event.content) {
              fullResponse += event.content;
            }

            // Log progress
            if (event.type === 'tool_start') {
              console.log(`🌊 [CHAT-STREAM] Tool started: ${event.toolName}`);
            }
          }

          // Save conversation to database (non-blocking)
          if (conversationId && fullResponse) {
            prisma.message.create({
              data: {
                conversationId,
                userId,
                role: 'assistant',
                content: fullResponse,
              },
            }).catch(err => console.error('[CHAT-STREAM] Failed to save message:', err));
          }

          // Send done signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();

          console.log(`🌊 [CHAT-STREAM] Stream complete`);

        } catch (error) {
          console.error('🌊 [CHAT-STREAM] Stream error:', error);
          
          // Send error to client
          const errorData = JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });

  } catch (error) {
    console.error('🌊 [CHAT-STREAM] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Health check
export async function GET() {
  return new Response(
    JSON.stringify({
      endpoint: '/api/chat-stream',
      status: 'operational',
      type: 'Real-time streaming chat (Server-Sent Events)',
      note: 'Use POST with messages array',
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
