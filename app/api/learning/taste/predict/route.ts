import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { category, count = 5 } = await req.json();
    const taste = new TasteLearner(userId);
    const recommendations = await taste.getRecommendations(category, count);

    return NextResponse.json({ success: true, recommendations });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
