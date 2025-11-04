import { NextRequest, NextResponse } from 'next/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');

    const learner = new TasteLearner();
    const profile = await learner.getTasteProfile(category || undefined);

    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    console.error('Taste profile API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve taste profile' },
      { status: 500 }
    );
  }
}
