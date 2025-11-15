import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { PredictiveEngine } from '@/lib/creativity/predictive-engine';

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const predictive = new PredictiveEngine(userId);
    const blockers = await predictive.anticipateBlockers();

    return NextResponse.json({ success: true, blockers });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
