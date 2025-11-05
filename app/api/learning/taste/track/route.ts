import { NextRequest, NextResponse } from 'next/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { userId, signal } = body as any;

    if (!userId || !signal) {
      return NextResponse.json(
        { error: 'User ID and taste signal are required' },
        { status: 400 }
      );
    }

    const learner = new TasteLearner();
    await learner.recordTasteSignal(userId, signal);

    return NextResponse.json({ success: true, message: 'Preference tracked' });
  } catch (error: any) {
    console.error('Taste tracking API error:', error);
    return NextResponse.json(
      { error: error.message || 'Preference tracking failed' },
      { status: 500 }
    );
  }
}
