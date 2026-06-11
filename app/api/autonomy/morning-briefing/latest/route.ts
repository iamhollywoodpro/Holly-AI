import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let clerkUserId: string | null = null;
    try {
      const authResult = await auth();
      clerkUserId = authResult.userId;
    } catch {}

    if (!clerkUserId && process.env.NODE_ENV === 'development') {
      clerkUserId = 'local-dev-user';
    }

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let latestBriefing = null;
    try {
      latestBriefing = await prisma.notification.findFirst({
        where: {
          clerkUserId,
          type: 'morning_briefing'
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          message: true,
          actionData: true,
          createdAt: true,
        }
      });
    } catch (err) {
      console.error('[MorningBriefing Latest API] Prisma query error:', err);
    }

    if (!latestBriefing) {
      return NextResponse.json({ briefing: null });
    }

    // Only return if it's from the last 24 hours
    const isRecent = new Date(latestBriefing.createdAt.getTime() + 24 * 60 * 60 * 1000) > new Date();

    return NextResponse.json({ 
      briefing: isRecent ? latestBriefing : null 
    });
  } catch (error) {
    console.error('[MorningBriefing Latest API] GET error:', error);
    return NextResponse.json({ briefing: null });
  }
}
