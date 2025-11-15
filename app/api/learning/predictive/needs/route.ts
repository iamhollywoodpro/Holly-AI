// Predictive Engine - Needs Prediction API
// Predicts upcoming creative needs based on patterns

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { PredictiveEngine } from '@/lib/creativity/predictive-engine';

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
    const { context, timeframe = 'week' } = body;

    const predictive = new PredictiveEngine(userId);
    const predictions = await predictive.predictNeeds(context, timeframe);

    return NextResponse.json({ 
      success: true,
      predictions
    });
  } catch (error: any) {
    console.error('Predict needs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to predict needs' },
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
    const timeframe = searchParams.get('timeframe') || 'week';

    const predictive = new PredictiveEngine(userId);
    const predictions = await predictive.predictNeeds({}, timeframe);

    return NextResponse.json({ 
      success: true,
      predictions
    });
  } catch (error: any) {
    console.error('Get predictions error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get predictions' },
      { status: 500 }
    );
  }
}
