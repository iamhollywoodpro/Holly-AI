// Taste Learning - Profile API
// Gets user's taste profile and preferences

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
  const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { category } = body;

    const taste = new TasteLearner(userId);
    const profile = await taste.getTasteProfile(category);

    return NextResponse.json({ 
      success: true,
      profile
    });
  } catch (error: any) {
    console.error('Get taste profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get taste profile' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
  const userId = user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const taste = new TasteLearner(userId);
    const profile = await taste.getTasteProfile(category || undefined);

    return NextResponse.json({ 
      success: true,
      profile
    });
  } catch (error: any) {
    console.error('Get taste profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get taste profile' },
      { status: 500 }
    );
  }
}
