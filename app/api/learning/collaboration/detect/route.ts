import { NextRequest, NextResponse } from 'next/server';
import { CollaborationAI } from '@/lib/interaction/collaboration-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { userMessage, conversationHistory } = body as any;

    if (!userMessage) {
      return NextResponse.json(
        { error: 'User message is required' },
        { status: 400 }
      );
    }

    const collaboration = new CollaborationAI();
    const mode = await collaboration.detectUserConfidence(userMessage);

    return NextResponse.json({ success: true, mode });
  } catch (error: any) {
    console.error('Collaboration detection API error:', error);
    return NextResponse.json(
      { error: error.message || 'Confidence detection failed' },
      { status: 500 }
    );
  }
}
