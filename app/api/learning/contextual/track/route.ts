import { NextRequest, NextResponse } from 'next/server';
import { ContextualIntelligence } from '@/lib/learning/contextual-intelligence';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { projectId, update } = body as any;

    if (!projectId || !update) {
      return NextResponse.json(
        { error: 'Project ID and update are required' },
        { status: 400 }
      );
    }

    const intelligence = new ContextualIntelligence();
    await intelligence.trackProject(projectId, update);

    return NextResponse.json({ success: true, message: 'Project update tracked' });
  } catch (error: any) {
    console.error('Contextual tracking API error:', error);
    return NextResponse.json(
      { error: error.message || 'Project tracking failed' },
      { status: 500 }
    );
  }
}
