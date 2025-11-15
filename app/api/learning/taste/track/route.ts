// Taste Learning - Track Preferences API
// Records user taste signals and preferences

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { TasteLearner } from '@/lib/learning/taste-learner';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { category, item, interaction, metadata } = body;

    if (!category || !item || !interaction) {
      return NextResponse.json(
        { error: 'Missing required fields: category, item, interaction' },
        { status: 400 }
      );
    }

    const taste = new TasteLearner(userId);
    await taste.recordSignal(category, item, interaction, metadata);

    return NextResponse.json({ 
      success: true,
      message: 'Taste signal recorded successfully'
    });
  } catch (error: any) {
    console.error('Track taste error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track taste' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const taste = new TasteLearner(userId);
    const signals = await taste.getSignals(category || undefined);

    return NextResponse.json({ 
      success: true,
      signals
    });
  } catch (error: any) {
    console.error('Get taste signals error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get taste signals' },
      { status: 500 }
    );
  }
}
