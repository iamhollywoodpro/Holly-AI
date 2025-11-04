import { NextRequest, NextResponse } from 'next/server';
import { PredictiveEngine } from '@/lib/creativity/predictive-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { projectHistory, currentStage } = body as any;

    if (!projectHistory) {
      return NextResponse.json(
        { error: 'Project history is required' },
        { status: 400 }
      );
    }

    const engine = new PredictiveEngine();
    const needs = await engine.predictNextNeeds(projectHistory, currentStage);

    return NextResponse.json({ success: true, needs });
  } catch (error: any) {
    console.error('Predictive needs API error:', error);
    return NextResponse.json(
      { error: error.message || 'Needs prediction failed' },
      { status: 500 }
    );
  }
}
