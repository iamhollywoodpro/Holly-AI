import { NextRequest, NextResponse } from 'next/server';
import { EnhancedAIRouter } from '@/lib/ai/enhanced-ai-router';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { message, conversationHistory, context } = body as any;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const router = new EnhancedAIRouter();
    
    // Check if we should proactively suggest a capability
    const suggestion = router.shouldSuggestCapability(message);
    
    // Route the message through enhanced AI system
    const response = await router.route({
      message,
      conversationHistory,
      context,
    });

    return NextResponse.json({
      success: true,
      response,
      suggestion,
    });
  } catch (error: any) {
    console.error('Enhanced chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Enhanced chat failed' },
      { status: 500 }
    );
  }
}
