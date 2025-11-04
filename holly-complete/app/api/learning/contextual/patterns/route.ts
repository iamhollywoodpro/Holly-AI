import { NextRequest, NextResponse } from 'next/server';
import { ContextualIntelligence } from '@/lib/learning/contextual-intelligence';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const intelligence = new ContextualIntelligence();
    const patterns = await intelligence.detectPatterns(projectId);

    return NextResponse.json({ success: true, patterns });
  } catch (error: any) {
    console.error('Pattern detection API error:', error);
    return NextResponse.json(
      { error: error.message || 'Pattern detection failed' },
      { status: 500 }
    );
  }
}
