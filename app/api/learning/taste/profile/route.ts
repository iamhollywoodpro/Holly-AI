import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const taste = new TasteLearner(userId);
    const profile = await taste.getProfile();

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
