/**
 * GET /api/interaction/patterns
 * Get user patterns
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserPatterns } from '@/lib/interaction/pattern-tracker';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patternType = searchParams.get('patternType') || undefined;

    const patterns = await getUserPatterns(userId, patternType);

    return NextResponse.json({
      success: true,
      patterns,
      count: patterns.length
    });
  } catch (error) {
    console.error('Error in get patterns API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
