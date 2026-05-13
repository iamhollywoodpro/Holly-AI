/**
 * POST /api/goals/evaluate
 *
 * Cron endpoint — evaluates pending autonomous goals and triggers execution.
 * Called every 3 hours by holly-cron.
 *
 * Secured via CRON_SECRET or Authorization header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createLogger } from '@/lib/logging/structured-logger';
import { prioritizeGoals, type Goal } from '@/lib/autonomy/goal-prioritization';
import { executeGoal } from '@/lib/autonomy/goal-execution';

const logger = createLogger('api-goals-evaluate');

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization');
  const provided = authHeader?.replace('Bearer ', '') ?? headerSecret;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Goal evaluation cron started');

  try {
    // Fetch all pending goals that are ready to execute
    const pendingGoals = await prisma.$queryRaw<Array<{
      id: string;
      title: string;
      category: string;
      priority: number;
      status: string;
      progress: number;
      actions: string;
      user_id: string | null;
      depends_on: string;
    }>>`
      SELECT id, title, category, priority, status, progress, actions, user_id, depends_on
      FROM goals
      WHERE status IN ('pending', 'in_progress')
      ORDER BY priority DESC, created_at ASC
      LIMIT 10
    `;

    if (!pendingGoals || pendingGoals.length === 0) {
      logger.info('No pending goals to evaluate');
      return NextResponse.json({ success: true, evaluated: 0, executed: 0 });
    }

    logger.info(`Evaluating ${pendingGoals.length} pending goals`);

    // Prioritize goals using the autonomy engine
    const goals: Goal[] = (pendingGoals as any[]).map((g: any) => ({
      id: g.id,
      title: g.title || 'Untitled',
      description: g.description || '',
      category: g.category || 'improvement',
      priority: g.priority || 50,
      impact: g.impact || 0.5,
      effort: g.effort || 0.5,
      status: g.status || 'proposed',
      createdAt: g.createdAt ? new Date(g.createdAt).getTime() : Date.now(),
      relatedCapabilities: [],
    }));
    const prioritized = prioritizeGoals(goals);
    const executable = prioritized.filter(g => g.status === 'proposed' || g.status === 'accepted');

    let executed = 0;
    let errors = 0;

    // Execute top-priority goals (max 3 per cycle to avoid resource exhaustion)
    for (const goal of executable.slice(0, 3)) {
      try {
        await executeGoal(goal.id);
        executed++;

        // Mark goal as in_progress
        await prisma.$executeRaw`
          UPDATE goals SET status = 'in_progress', updated_at = NOW() WHERE id = ${goal.id}
        `;

        logger.info(`Goal executed: ${goal.id} - ${goal.title}`);
      } catch (err) {
        errors++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error(`Goal execution failed: ${goal.id}`, { error: errorMsg });

        // Mark goal as failed but don't crash the cron
        await prisma.$executeRaw`
          UPDATE goals SET status = 'failed', updated_at = NOW() WHERE id = ${goal.id}
        `;
      }
    }

    logger.info(`Goal evaluation complete: ${executed} executed, ${errors} errors`);

    return NextResponse.json({
      success: true,
      evaluated: pendingGoals.length,
      executed,
      errors,
      goalIds: executable.slice(0, 3).map(g => g.id),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Goal evaluation cron failed', { error: errorMsg });
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 },
    );
  }
}

// Also support GET for manual triggering
export async function GET(req: NextRequest) {
  return POST(req);
}