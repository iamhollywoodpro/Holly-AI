import { NextRequest, NextResponse } from 'next/server';
import { getHollyResponse } from '@/lib/ai/ai-orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for complex responses

interface ChatRequest {
  message: string;
  userId: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  forceModel?: 'claude' | 'groq';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest;
    const { message, userId, conversationHistory = [], forceModel } = body;

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: message, userId' },
        { status: 400 }
      );
    }

    // Validate API keys
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY) {
      console.error('⚠️ No AI API keys configured!');
      return NextResponse.json({
        success: true,
        response: "Hey Hollywood! 💜 My AI brain connections aren't set up yet in production. The interface works great, but I need my API keys configured in Vercel environment variables to think for real!",
        emotion: 'thoughtful',
        model: 'fallback',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`💬 HOLLY received message from ${userId}: "${message.substring(0, 50)}..."`);

    // Get response from HYBRID HOLLY (Claude Opus 4 + Groq)
    const hollyResponse = await getHollyResponse(message, conversationHistory, forceModel);

    console.log(`✅ HOLLY responded via ${hollyResponse.model} in ${hollyResponse.responseTime}ms`);

    return NextResponse.json({
      success: true,
      response: hollyResponse.content,
      emotion: hollyResponse.emotion,
      model: hollyResponse.model,
      tokensUsed: hollyResponse.tokensUsed,
      responseTime: hollyResponse.responseTime,
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('💥 Chat error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
