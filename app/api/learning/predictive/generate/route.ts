import { NextRequest, NextResponse } from 'next/server';
import { PredictiveEngine } from '@/lib/creativity/predictive-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { projectId, currentContext } = body as any;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const engine = new PredictiveEngine();
    const concepts = await engine.generateConcepts(projectId, currentContext);

    return NextResponse.json({ success: true, concepts });
  } catch (error: any) {
    console.error('Predictive generation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Concept generation failed' },
      { status: 500 }
    );
  }
}
