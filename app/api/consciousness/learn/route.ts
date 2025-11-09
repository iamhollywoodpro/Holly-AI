import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { UnsupervisedLearningSystem } from '@/lib/consciousness/unsupervised-learning';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/learn
 * Get learning statistics and recent sessions
 */
export async function GET() {
  try {
    const learningSystem = new UnsupervisedLearningSystem(supabaseAdmin!);

    const [recentSessions, stats, loops] = await Promise.all([
      learningSystem.getRecentSessions(10),
      learningSystem.getLearningStats(),
      Promise.resolve(learningSystem.getBackgroundLoops())
    ]);

    return NextResponse.json({
      success: true,
      recent_sessions: recentSessions,
      statistics: stats,
      background_loops: loops,
      message: `Found ${recentSessions.length} recent learning sessions`
    });

  } catch (error) {
    console.error('Error retrieving learning data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve learning data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consciousness/learn
 * Execute background learning loops
 */
export async function POST() {
  try {
    const learningSystem = new UnsupervisedLearningSystem(supabaseAdmin!);

    const result = await learningSystem.executeBackgroundLoops();

    return NextResponse.json({
      success: true,
      loops_executed: result.loops_executed,
      sessions: result.sessions_created,
      message: `Executed ${result.loops_executed} learning loops`
    });

  } catch (error) {
    console.error('Error executing learning loops:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute learning loops',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
