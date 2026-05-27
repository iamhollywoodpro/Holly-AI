/**
 * Daily Digest Plugin API Routes
 *
 * GET  /api/plugins/holly-daily-digest          — Get today's digest (generates if missing)
 * GET  /api/plugins/holly-daily-digest?history=7 — Get digest history
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { dailyDigestService } from '@/lib/plugins/implementations/holly-daily-digest';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const historyDays = parseInt(searchParams.get('history') || '0', 10);

    // History mode
    if (historyDays > 0) {
      const digests = await dailyDigestService.getDigestHistory(user.id, historyDays);
      return NextResponse.json({ digests });
    }

    // Generate or get today's digest
    const digest = await dailyDigestService.generateDigest({
      userId: user.id,
      timezone: searchParams.get('timezone') || undefined,
    });

    return NextResponse.json(digest);
  } catch (error) {
    console.error('[DailyDigest] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
