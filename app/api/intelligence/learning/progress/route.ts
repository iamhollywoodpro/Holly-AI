/**
 * GET /api/intelligence/learning/progress
 * Get learning progress metrics
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getLearningProgress } from '@/lib/intelligence/learning-engine';

export const runtime = 'nodejs';


export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const progress = await getLearningProgress();

    return NextResponse.json({
      success: true,
      ...progress
    });
  } catch (error) {
    console.error('Error in learning progress API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
