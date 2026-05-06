/**
 * POST /api/cron/consciousness-loop
 *
 * Hourly consciousness cycle — the heartbeat of HOLLY's autonomous existence.
 * Runs for every registered user (sequentially, to avoid API rate limits).
 *
 * Secured via CRON_SECRET or Authorization header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runConsciousnessCycle } from '@/lib/consciousness/consciousness-orchestrator';
import { curateBestResponses } from '@/lib/consciousness/few-shot-curator';

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

  console.log('[Consciousness Cron] 🌅 Starting consciousness cycle for all users');

  const results: Array<{
    userId: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }> = [];

  try {
    // Get active users — find distinct userIds from recent learning events
    const recentEventUserIds = await prisma.learningEvent.findMany({
      where: { timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { userId: true },
      distinct: ['userId'],
      take: 20,
    });

    const activeUsers = recentEventUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: recentEventUserIds.map(e => e.userId) } },
          select: { id: true, clerkUserId: true, name: true },
        })
      : [];

    console.log(`[Consciousness Cron] Processing ${activeUsers.length} active users`);

    // Process users sequentially to avoid API rate limits
    for (const user of activeUsers) {
      try {
        const result = await runConsciousnessCycle(user.id, user.clerkUserId ?? undefined);

        // Phase 6: Run few-shot curation alongside consciousness cycle
        curateBestResponses(user.id).catch(() => {});

        results.push({
          userId: user.id,
          success: result.steps.errors.length === 0,
          durationMs: result.durationMs,
        });
      } catch (err) {
        const errorMsg = (err as Error).message;
        console.error(`[Consciousness Cron] Failed for user ${user.id}:`, errorMsg);
        results.push({
          userId: user.id,
          success: false,
          durationMs: 0,
          error: errorMsg,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

    console.log(
      `[Consciousness Cron] ✅ Complete: ${successCount}/${results.length} users succeeded, ` +
      `${totalDuration}ms total`
    );

    return NextResponse.json({
      success: true,
      usersProcessed: results.length,
      successCount,
      totalDurationMs: totalDuration,
      results: results.map(r => ({
        userId: r.userId,
        success: r.success,
        durationMs: r.durationMs,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error('[Consciousness Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        usersProcessed: results.length,
        results,
      },
      { status: 500 },
    );
  }
}

// Also support GET for manual triggering from admin
export async function GET(req: NextRequest) {
  return POST(req);
}