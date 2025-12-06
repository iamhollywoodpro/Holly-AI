/**
 * GET /api/intelligence/prediction/accuracy
 * Get prediction accuracy metrics
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAccuracyMetrics } from '@/lib/intelligence/predictive-intelligence';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics = await getAccuracyMetrics();

    return NextResponse.json({
      success: true,
      ...metrics
    });
  } catch (error) {
    console.error('Error in prediction accuracy API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
