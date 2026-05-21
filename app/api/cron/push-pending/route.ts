/**
 * POST /api/cron/push-pending — Phase 15: Real-Time Proactive Notifications
 *
 * Runs every 15 minutes. Finds undelivered proactive insights for users
 * who are currently online (pushes via SSE immediately) or queues them
 * for the daily email digest.
 *
 * Schedule: every 15 minutes
 * Security: CRON_SECRET required
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notificationDispatcher } from '@/lib/notifications/notification-dispatcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const headerSecret = req.headers.get('x-cron-secret');
  const authHeader = req.headers.get('authorization');
  const provided = authHeader?.replace('Bearer ', '') ?? headerSecret;

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron:push-pending] Scanning for undelivered insights');

  try {
    // Find all proactive insights that haven't been shown yet
    const pendingInsights = await prisma.proactiveInsight.findMany({
      where: {
        status: 'pending',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      take: 100,
      orderBy: { confidence: 'desc' },
    });

    if (pendingInsights.length === 0) {
      return NextResponse.json({
        success: true,
        dispatched: 0,
        message: 'No pending insights',
      });
    }

    // Group by user
    const byUser = new Map<string, typeof pendingInsights>();
    for (const insight of pendingInsights) {
      const uid = insight.userId;
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid)!.push(insight);
    }

    let dispatched = 0;
    let failed = 0;

    for (const [userId, insights] of byUser) {
      try {
        // Try to push via SSE (if user is online)
        await notificationDispatcher.dispatchPendingInsights(userId);
        dispatched += insights.length;
      } catch (err) {
        console.error(`[Cron:push-pending] Failed for user ${userId}:`, err);
        failed += insights.length;
      }
    }

    console.log(`[Cron:push-pending] Complete: ${dispatched} dispatched, ${failed} failed`);

    return NextResponse.json({
      success: true,
      totalPending: pendingInsights.length,
      dispatched,
      failed,
      usersProcessed: byUser.size,
    });
  } catch (err) {
    console.error('[Cron:push-pending] Fatal error:', err);
    return NextResponse.json(
      { error: 'Push pending failed', details: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'push-pending',
    phase: 15,
    description: 'Pushes undelivered insights to online users via SSE, queues for email digest',
    schedule: '*/15 * * * * (every 15 minutes)',
    auth: 'CRON_SECRET required for POST',
  });
}
