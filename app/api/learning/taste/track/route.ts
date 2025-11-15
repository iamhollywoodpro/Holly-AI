import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { category, item, action, context } = await req.json();
    const taste = new TasteLearner(userId);
    await taste.recordSignal({ category, item, action, context });

    return NextResponse.json({ success: true, message: 'Taste signal recorded' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
