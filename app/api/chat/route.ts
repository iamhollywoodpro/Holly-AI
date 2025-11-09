// HOLLY Chat API Route - WITH CONSCIOUSNESS INTEGRATION
// Connects chat to memory, goals, and consciousness systems

import { NextRequest } from 'next/server';
import { getHollyResponse } from '@/lib/ai/ai-orchestrator';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

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
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
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
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .limit(3);

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

// Helper: Record conversation experience with user scoping
async function recordConversationExperience(
  userId: string,
  userMessage: string,
  hollyResponse: string
) {
  try {
    const memory = new MemoryStream(supabaseAdmin);
    
    // Determine significance based on conversation characteristics
    const significance = calculateSignificance(userMessage, hollyResponse);
    
    // Record the interaction experience
    const experience = await memory.recordExperienceSimple(
      'interaction',
      `Conversation with user: User: "${userMessage}" HOLLY: "${hollyResponse.substring(0, 300)}${hollyResponse.length > 300 ? '...' : ''}"`,
      {
        userMessage,
        hollyResponse: hollyResponse.substring(0, 500),
        responseLength: hollyResponse.length,
        messageLength: userMessage.length,
        timestamp: new Date().toISOString()
      },
      significance
    );

    // Update the experience with user_id (since MemoryStream doesn't support it directly yet)
    await supabaseAdmin
      .from('holly_experiences')
      .update({ user_id: userId })
      .eq('id', experience.id);

    console.log(`[Memory] Conversation recorded to memory (significance: ${significance})`);
  } catch (error) {
    console.error('[Memory] Error recording conversation:', error);
    // Don't throw - memory recording shouldn't break chat
  }
}

// Helper: Calculate conversation significance
function calculateSignificance(userMessage: string, hollyResponse: string): number {
  let significance = 0.3; // Base significance for all interactions

  // Increase for longer, more detailed conversations
  if (userMessage.length > 200) significance += 0.1;
  if (hollyResponse.length > 500) significance += 0.1;

  // Increase for questions (likely learning moments)
  if (userMessage.includes('?')) significance += 0.1;

  // Increase for code/technical discussions
  if (userMessage.match(/```|function|const|class|import/)) significance += 0.2;

  // Increase for emotional expressions
  if (userMessage.match(/!/g)?.length > 1) significance += 0.1;

  // Cap at 0.9 (reserve 1.0 for truly exceptional moments)
  return Math.min(significance, 0.9);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    const { messages, conversationId, userId = 'anonymous' } = body as any;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get context from memories and goals
    const memories = await getRecentMemories(userId, 3);
    const goals = await getActiveGoals(userId);

    // Build context string
    let contextString = '';
    
    if (memories.length > 0) {
      contextString += '\n\n[Recent Memories]:\n';
      memories.forEach(m => {
        const content = typeof m.content === 'object' && m.content?.what 
          ? m.content.what 
          : String(m.content);
        contextString += `- ${content}\n`;
      });
    }

    if (goals.length > 0) {
      contextString += '\n[Active Goals]:\n';
      goals.forEach((g: any) => {
        contextString += `- ${g.description || g.goal_text} (${Math.round((g.progress || 0) * 100)}% complete)\n`;
      });
    }

    // Add context to user's message
    const messageWithContext = contextString
      ? `${contextString}\n\n${lastMessage.content}`
      : lastMessage.content;

    // Get HOLLY's response with proper parameters
    const hollyResponse = await getHollyResponse(
      messageWithContext, // User's message with context (string)
      messages.slice(0, -1) // Conversation history (exclude last message)
    );

    // Record conversation experience (non-blocking)
    if (userId && userId !== 'anonymous') {
      recordConversationExperience(userId, lastMessage.content, hollyResponse.content)
        .catch(err => console.error('[Memory] Background recording failed:', err));
    }

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the complete response
          const chunk = encoder.encode(`data: ${JSON.stringify({ content: hollyResponse.content })}\n\n`);
          controller.enqueue(chunk);
          
          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
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

export async function GET() {
  return new Response(
    JSON.stringify({
      message: 'HOLLY Chat API',
      version: '4.1',
      endpoints: {
        POST: 'Send messages to HOLLY'
      }
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
