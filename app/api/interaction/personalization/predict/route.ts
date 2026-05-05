/**
 * POST /api/interaction/personalization/predict
 * Predict user needs based on patterns
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { predictUserNeeds } from '@/lib/interaction/personalization-engine';

export const runtime = 'nodejs';


export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const predictions = await predictUserNeeds(userId);

    return NextResponse.json({
      success: true,
      ...predictions
    });
  } catch (error) {
    console.error('Error in predict user needs API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
