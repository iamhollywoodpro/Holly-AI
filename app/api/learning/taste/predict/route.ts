import { NextRequest, NextResponse } from 'next/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { itemId, category, context } = body as any;

    if (!itemId || !category) {
      return NextResponse.json(
        { error: 'Item ID and category are required' },
        { status: 400 }
      );
    }

    const learner = new TasteLearner();
    const prediction = await learner.predictPreference(itemId, category, context);

    return NextResponse.json({ success: true, prediction });
  } catch (error: any) {
    console.error('Taste prediction API error:', error);
    return NextResponse.json(
      { error: error.message || 'Preference prediction failed' },
      { status: 500 }
    );
  }
}
