import { NextRequest, NextResponse } from 'next/server';
import { CollaborationAI } from '@/lib/interaction/collaboration-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userConfidence, taskComplexity } = body;

    if (userConfidence === undefined) {
      return NextResponse.json(
        { error: 'User confidence level is required' },
        { status: 400 }
      );
    }

    const collaboration = new CollaborationAI();
    const style = await collaboration.adaptLeadershipStyle(userConfidence, taskComplexity);

    return NextResponse.json({ success: true, style });
  } catch (error: any) {
    console.error('Collaboration adaptation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Leadership adaptation failed' },
      { status: 500 }
    );
  }
}
