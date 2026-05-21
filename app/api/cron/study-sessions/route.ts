/**
 * POST /api/cron/study-sessions — Phase 14: Autonomous Study Loops
 *
 * Hourly cron that runs study sessions for all active users.
 * Holly picks each user's highest-priority learning gap and studies it.
 *
 * Schedule: 0 * * * * (every hour)
 * Security: CRON_SECRET required
 *
 * Flow:
 *   1. Find active users (chatted in last 7 days)
 *   2. For each user:
 *      a. Scan recent conversations for new knowledge gaps
 *      b. Pick highest-priority learning goal
 *      c. Run focused study session (web research + deep reasoning)
 *      d. Store results as KnowledgeEntry, update goal progress
 *   3. Return stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { runStudyLoop, type StudySchedulerStats } from '@/lib/study/study-scheduler';

export const runtime = 'nodejs';
export const dynamic  = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for multiple users

function validateCronSecret(req: NextRequest): NextResponse | null {
  const cronSecret   = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader   = req.headers.get('authorization');
  const provided     = authHeader?.replace('Bearer ', '') ?? headerSecret;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const authErr = validateCronSecret(req);
  if (authErr) return authErr;

  const body = await req.json().catch(() => ({}));
  const maxUsers = Math.min(body.maxUsers ?? 20, 50);
  const sessionsPerUser = Math.min(body.sessionsPerUser ?? 1, 3);

  console.log(`[Cron:study-sessions] Starting study loop (maxUsers: ${maxUsers}, sessions/user: ${sessionsPerUser})`);

  try {
    const stats: StudySchedulerStats = await runStudyLoop(maxUsers, sessionsPerUser);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      phase: 14,
      ...stats,
    });
  } catch (err) {
    console.error('[Cron:study-sessions] Fatal error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Study loop failed',
        details: (err as Error).message,
      },
      { status: 500 },
    );
  }
}

// GET for health checks and manual trigger
export async function GET(req: NextRequest) {
  const authErr = validateCronSecret(req);
  if (authErr) {
    // Unauthenticated GET just returns endpoint info
    return NextResponse.json({
      endpoint: 'study-sessions',
      phase: 14,
      description: 'Autonomous study loop — Holly studies user knowledge gaps hourly',
      schedule: '0 * * * * (every hour)',
      auth: 'CRON_SECRET required for POST',
    });
  }

  // Authenticated GET triggers a run (for manual testing)
  return POST(req);
}
