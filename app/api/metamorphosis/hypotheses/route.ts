/**
 * PHASE 3: Hypotheses API
 * Get and generate solution hypotheses
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { HypothesisGenerator, getHypotheses } from '@/lib/metamorphosis/hypothesis-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const problemId = searchParams.get('problemId') || undefined;

    const hypotheses = await getHypotheses(problemId);

    return NextResponse.json({
      success: true,
      count: hypotheses.length,
      hypotheses
    });
  } catch (error: any) {
    console.error('[Hypotheses API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { problemId } = body;

    if (!problemId) {
      return NextResponse.json(
        { error: 'problemId is required' },
        { status: 400 }
      );
    }

    // Generate hypotheses
    const generator = new HypothesisGenerator();
    const hypotheses = await generator.generateHypotheses(problemId);

    return NextResponse.json({
      success: true,
      count: hypotheses.length,
      hypotheses
    });
  } catch (error: any) {
    console.error('[Hypotheses API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
