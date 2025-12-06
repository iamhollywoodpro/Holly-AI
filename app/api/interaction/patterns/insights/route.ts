/**
 * GET /api/interaction/patterns/insights
 * Get pattern insights and recommendations
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPatternInsights } from '@/lib/interaction/pattern-tracker';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const insights = await getPatternInsights(userId);

    return NextResponse.json({
      success: true,
      ...insights
    });
  } catch (error) {
    console.error('Error in get pattern insights API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
