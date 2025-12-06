/**
 * POST /api/intelligence/prediction/validate
 * Validate prediction with actual outcome
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { validatePrediction } from '@/lib/intelligence/predictive-intelligence';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { predictionId, outcome, accuracy } = body;

    if (!predictionId || !outcome || accuracy === undefined) {
      return NextResponse.json(
        { error: 'predictionId, outcome, and accuracy are required' },
        { status: 400 }
      );
    }

    const result = await validatePrediction({
      predictionId,
      outcome,
      accuracy
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to validate prediction' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accuracy: result.accuracy
    });
  } catch (error) {
    console.error('Error in prediction validate API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
