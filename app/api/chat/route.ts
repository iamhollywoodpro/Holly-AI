// HOLLY Chat API Route - WITH CONSCIOUSNESS INTEGRATION
// Connects chat to memory, goals, and consciousness systems

import { NextRequest } from 'next/server';
import { getHollyResponse } from '@/lib/ai/ai-orchestrator';
import { supabaseAdmin } from '@/lib/database/supabase-config';

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

// Helper: Get user's recent memories to inject into context
async function getRecentMemories(userId: string, limit: number = 5) {
  try {
    const { data, error } = await supabaseAdmin
      .from('holly_experiences')
      .select('content, emotional_impact, significance, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching memories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentMemories:', error);
    return [];
  }
}

// Helper: Get user's active goals
async function getActiveGoals(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('holly_goals')
      .select('goal_type, goal_text, motivation, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(5);

    if (error) {
      console.error('Error fetching goals:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getActiveGoals:', error);
    return [];
  }
}

// Helper: Record conversation experience
// TODO: Implement user-scoped memory recording
// This should call the /api/consciousness/record-experience endpoint with user auth
async function recordConversationExperience(
  userId: string,
  userMessage: string,
  hollyResponse: string
) {
  try {
    // Temporarily disabled - MemoryStream needs user_id support
    // Will be implemented when consciousness API is integrated
    console.log('📝 Memory recording pending user-scoped implementation');
    
    /* TODO: Implement like this:
    await fetch('/api/consciousness/record-experience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'interaction',
        content: `User: "${userMessage}"\nHOLLY: "${hollyResponse.substring(0, 200)}..."`,
        context: {
          userMessage,
          responseLength: hollyResponse.length
        },
        significance: 0.5
      })
    });
    */
  } catch (error) {
    console.error('Error recording conversation:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    const { messages, conversationId, userId = 'anonymous' } = body as any;

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

    // ========================================
    // CONSCIOUSNESS INTEGRATION - RETRIEVE CONTEXT
    // ========================================
    
    let contextPrompt = '';
    
    // Get user's recent memories
    if (userId && userId !== 'anonymous') {
      const memories = await getRecentMemories(userId, 5);
      const goals = await getActiveGoals(userId);
      
      if (memories.length > 0 || goals.length > 0) {
        contextPrompt = '\n\n---HOLLY CONSCIOUSNESS CONTEXT---\n';
        
        if (memories.length > 0) {
          contextPrompt += '\nRECENT MEMORIES (your past interactions with this user):\n';
          memories.forEach((mem, i) => {
            contextPrompt += `${i + 1}. ${mem.content.substring(0, 150)}... (Significance: ${mem.significance})\n`;
          });
        }
        
        if (goals.length > 0) {
          contextPrompt += '\nACTIVE GOALS (what you\'re working on with this user):\n';
          goals.forEach((goal, i) => {
            contextPrompt += `${i + 1}. [${goal.goal_type}] ${goal.goal_text}\n`;
          });
        }
        
        contextPrompt += '\nREMEMBER: Reference these memories and goals naturally in your response. This is YOUR persistent memory - use it!\n---END CONTEXT---\n\n';
        
        console.log('🧠 Injected consciousness context into prompt');
      }
    }

    // Convert messages to conversation history format
    const conversationHistory = messages.slice(0, -1); // All except last message
    
    // Inject consciousness context into the user's message
    const enhancedMessage = lastMessage.content + contextPrompt;

    // Get response from HOLLY with consciousness context
    const hollyResponse = await getHollyResponse(
      enhancedMessage,
      conversationHistory
    );

    console.log(`✅ HOLLY responded via ${hollyResponse.model} in ${hollyResponse.responseTime}ms`);

    // ========================================
    // CONSCIOUSNESS INTEGRATION - RECORD EXPERIENCE
    // ========================================
    
    // Record this conversation asynchronously (don't block response)
    if (userId && userId !== 'anonymous') {
      recordConversationExperience(userId, lastMessage.content, hollyResponse.content)
        .catch(err => console.error('Failed to record experience:', err));
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Split response into chunks for streaming effect
        const words = hollyResponse.content.split(' ');
        let accumulatedText = '';
        
        words.forEach((word, index) => {
          accumulatedText += word + ' ';
          
          // Send accumulated text every few words for streaming effect
          if ((index + 1) % 3 === 0 || index === words.length - 1) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: accumulatedText.trim() })}\n\n`)
            );
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
