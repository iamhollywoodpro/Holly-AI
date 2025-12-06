/**
 * POST /api/intelligence/prediction/predict
 * Make a prediction
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { makePrediction } from '@/lib/intelligence/predictive-intelligence';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, target, prediction, confidence, context } = body;

    if (!type || !target || !prediction || confidence === undefined) {
      return NextResponse.json(
        { error: 'Type, target, prediction, and confidence are required' },
        { status: 400 }
      );
    }

    const result = await makePrediction({
      type,
      target,
      prediction,
      confidence,
      context: context || {}
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to make prediction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id,
      prediction: result.prediction
    });
  } catch (error) {
    console.error('Error in prediction predict API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
