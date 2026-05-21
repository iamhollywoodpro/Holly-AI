/**
 * Cron: Recalculate emotional resonance for active users
 * Runs every 6 hours to keep resonance profiles fresh
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recalculateResonance } from '@/lib/emotion/emotional-resonance';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find users with emotional states in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const activeUsers = await prisma.emotionalState.findMany({
      where: { timestamp: { gte: sevenDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    });

    let recalculated = 0;
    let errors = 0;

    for (const { userId } of activeUsers) {
      try {
        await recalculateResonance(userId);
        recalculated++;
      } catch (err) {
        console.error(`[Resonance Cron] Failed for user ${userId}:`, (err as Error).message);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      usersScanned: activeUsers.length,
      recalculated,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Resonance Cron] Fatal error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
