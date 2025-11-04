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
    const context = await intelligence.getProjectContext(projectId);

    return NextResponse.json({ success: true, context });
  } catch (error: any) {
    console.error('Context retrieval API error:', error);
    return NextResponse.json(
      { error: error.message || 'Context retrieval failed' },
      { status: 500 }
    );
  }
}
