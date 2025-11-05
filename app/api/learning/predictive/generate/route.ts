import { NextRequest, NextResponse } from 'next/server';
import { PredictiveEngine } from '@/lib/creativity/predictive-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { userId } = body as any;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const engine = new PredictiveEngine();
    const concepts = await engine.generateDraftConcepts(userId);

    return NextResponse.json({ success: true, concepts });
  } catch (error: any) {
    console.error('Predictive generation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Concept generation failed' },
      { status: 500 }
    );
  }
}
