import { NextRequest, NextResponse } from 'next/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const learner = new TasteLearner();
    const profile = await learner.initializeTasteProfile(userId);

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Taste profile API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve taste profile' },
      { status: 500 }
    );
  }
}
