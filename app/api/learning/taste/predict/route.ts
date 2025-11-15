// Taste Learning - Predict/Recommend API
// Predicts preferences and provides recommendations

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
    const { category, count = 10 } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'Missing required field: category' },
        { status: 400 }
      );
    }

    const taste = new TasteLearner(userId);
    const recommendations = await taste.getRecommendations(category, count);

    return NextResponse.json({ 
      success: true,
      recommendations
    });
  } catch (error: any) {
    console.error('Get recommendations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
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
    const count = parseInt(searchParams.get('count') || '10');

    if (!category) {
      return NextResponse.json(
        { error: 'Missing required parameter: category' },
        { status: 400 }
      );
    }

    const taste = new TasteLearner(userId);
    const recommendations = await taste.getRecommendations(category, count);

    return NextResponse.json({ 
      success: true,
      recommendations
    });
  } catch (error: any) {
    console.error('Get recommendations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
