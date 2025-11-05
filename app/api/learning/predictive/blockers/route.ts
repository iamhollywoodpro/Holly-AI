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
    const blockers = await engine.anticipateBlockers(userId);

    return NextResponse.json({ success: true, blockers });
  } catch (error: any) {
    console.error('Predictive blockers API error:', error);
    return NextResponse.json(
      { error: error.message || 'Blocker anticipation failed' },
      { status: 500 }
    );
  }
}
