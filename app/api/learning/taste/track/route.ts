import { NextRequest, NextResponse } from 'next/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { itemId, category, userAction, context } = body as any;

    if (!itemId || !category || !userAction) {
      return NextResponse.json(
        { error: 'Item ID, category, and user action are required' },
        { status: 400 }
      );
    }

    const learner = new TasteLearner();
    await learner.trackPreference(itemId, category, userAction, context);

    return NextResponse.json({ success: true, message: 'Preference tracked' });
  } catch (error: any) {
    console.error('Taste tracking API error:', error);
    return NextResponse.json(
      { error: error.message || 'Preference tracking failed' },
      { status: 500 }
    );
  }
}
