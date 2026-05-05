/**
 * POST /api/interaction/pattern
 * Record user pattern
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { recordPattern } from '@/lib/interaction/pattern-tracker';

export const runtime = 'nodejs';


export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { patternType, pattern, context } = body;

    if (!patternType || !pattern) {
      return NextResponse.json(
        { error: 'patternType and pattern are required' },
        { status: 400 }
      );
    }

    const result = await recordPattern(
      userId,
      patternType,
      pattern,
      context || {}
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to record pattern' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      patternId: result.patternId
    });
  } catch (error) {
    console.error('Error in record pattern API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
