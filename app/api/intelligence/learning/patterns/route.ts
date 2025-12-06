/**
 * GET /api/intelligence/learning/patterns
 * Get learned patterns
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getLearnedPatterns } from '@/lib/intelligence/learning-engine';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const type = searchParams.get('type') || undefined;
    const minConfidence = searchParams.get('minConfidence')
      ? parseFloat(searchParams.get('minConfidence')!)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : undefined;

    const patterns = await getLearnedPatterns({
      category,
      type,
      minConfidence,
      limit
    });

    return NextResponse.json({
      success: true,
      patterns,
      count: patterns.length
    });
  } catch (error) {
    console.error('Error in learning patterns API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
