import { NextRequest, NextResponse } from 'next/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { userId, item, category } = body as any;

    if (!userId || !item || !category) {
      return NextResponse.json(
        { error: 'User ID, item, and category are required' },
        { status: 400 }
      );
    }

    const learner = new TasteLearner();
    const prediction = await learner.predictPreference(userId, item, category);

    return NextResponse.json({ success: true, prediction });
  } catch (error: any) {
    console.error('Taste prediction API error:', error);
    return NextResponse.json(
      { error: error.message || 'Preference prediction failed' },
      { status: 500 }
    );
  }
}
