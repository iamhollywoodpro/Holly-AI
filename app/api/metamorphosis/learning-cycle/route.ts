/**
 * PHASE 3: Learning Cycle API
 * Trigger and monitor the learning loop
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { learningLoop } from '@/lib/metamorphosis/learning-loop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET: Get learning progress and insights
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'progress') {
      // Get progress summary
      const progress = await learningLoop.getProgressSummary();
      return NextResponse.json({
        success: true,
        progress
      });
    } else if (action === 'suggestions') {
      // Get next action suggestions
      const suggestions = await learningLoop.suggestNextActions();
      return NextResponse.json({
        success: true,
        suggestions
      });
    } else {
      // Get both
      const progress = await learningLoop.getProgressSummary();
      const suggestions = await learningLoop.suggestNextActions();
      
      return NextResponse.json({
        success: true,
        progress,
        suggestions
      });
    }
  } catch (error: any) {
    console.error('[Learning Cycle API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Run a learning cycle
 */
export async function POST(request: Request) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, hypothesisId, wasSuccessful, details } = body;

    if (action === 'run-cycle') {
      // Run full learning cycle
      console.log('[Learning Cycle API] Running learning cycle...');
      const result = await learningLoop.runCycle();
      
      return NextResponse.json({
        success: true,
        result
      });
    } else if (action === 'record-outcome') {
      // Record outcome of implementing a hypothesis
      if (!hypothesisId || wasSuccessful === undefined) {
        return NextResponse.json(
          { error: 'hypothesisId and wasSuccessful are required' },
          { status: 400 }
        );
      }

      await learningLoop.recordHypothesisOutcome(
        hypothesisId,
        wasSuccessful,
        details || {}
      );

      return NextResponse.json({
        success: true,
        message: 'Outcome recorded'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "run-cycle" or "record-outcome"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Learning Cycle API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
