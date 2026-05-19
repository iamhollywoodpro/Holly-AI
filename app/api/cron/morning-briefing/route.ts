/**
 * POST /api/cron/morning-briefing
 *
 * Standalone morning briefing cron — runs independently of the consciousness loop.
 * Should be scheduled for 7:00 AM daily (user's timezone).
 *
 * Generates a personalized LLM-powered morning briefing and persists it as a notification.
 * The SovereignBriefing component on the frontend picks up unread morning_briefing notifications.
 *
 * Secured via CRON_SECRET or Authorization header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateMorningBriefing, persistBriefingNotification } from '@/lib/autonomy/morning-briefing';

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

  console.log('[MorningBriefing Cron] Starting morning briefing generation for all users');

  const results: Array<{
    userId: string;
    success: boolean;
    error?: string;
  }> = [];

  try {
    // Get all users who have been active in the last 7 days
    const recentEventUserIds = await prisma.learningEvent.findMany({
      where: { timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { userId: true },
      distinct: ['userId'],
      take: 50,
    });

    const activeUsers = recentEventUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: recentEventUserIds.map(e => e.userId) } },
          select: { id: true, clerkUserId: true, name: true },
        })
      : [];

    console.log(`[MorningBriefing Cron] Processing ${activeUsers.length} active users`);

    for (const user of activeUsers) {
      try {
        // Check if a morning briefing was already generated today for this user
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const existingBriefing = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: 'morning_briefing',
            createdAt: { gte: todayStart },
          },
        });

        if (existingBriefing) {
          console.log(`[MorningBriefing Cron] User ${user.id} already has a briefing today, skipping`);
          continue;
        }

        // Generate the LLM-powered morning briefing
        const briefing = await generateMorningBriefing(user.id);

        // Persist as a notification (the SovereignBriefing component reads these)
        await persistBriefingNotification(
          user.clerkUserId ?? '',
          user.id,
          briefing,
        );

        results.push({ userId: user.id, success: true });
        console.log(`[MorningBriefing Cron] Briefing generated for user ${user.id}: ${briefing.overallStatus}`);
      } catch (err) {
        const errorMsg = (err as Error).message;
        console.error(`[MorningBriefing Cron] Failed for user ${user.id}:`, errorMsg);
        results.push({ userId: user.id, success: false, error: errorMsg });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[MorningBriefing Cron] Complete: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      results,
    });
  } catch (error) {
    console.error('[MorningBriefing Cron] Fatal error:', error);
    return NextResponse.json(
      { error: 'Morning briefing cron failed', details: (error as Error).message },
      { status: 500 },
    );
  }
}

// Support GET for health checks
export async function GET() {
  return NextResponse.json({
    endpoint: 'morning-briefing',
    status: 'active',
    description: 'Generates personalized LLM-powered morning briefings for all active users',
    schedule: 'Daily at 7:00 AM (configure in Coolify cron or external scheduler)',
    auth: 'CRON_SECRET required',
  });
}
