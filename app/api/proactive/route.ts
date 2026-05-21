/**
 * Phase 10: Proactive Intelligence API
 * GET  — Get pending insights, daily briefing, patterns
 * POST — Generate new insights, acknowledge/dismiss insights
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { generateProactiveInsights, generateDailyBriefing, getProactiveInsightsForChat, getPatternContextForChat } from '@/lib/proactive/proactive-engine';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: clerkId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const url = new URL(req.url);
    const section = url.searchParams.get('section');

    if (section === 'briefing') {
      const briefing = await generateDailyBriefing(user.id);
      return NextResponse.json({ briefing });
    }

    if (section === 'insights') {
      const insights = await prisma.proactiveInsight.findMany({
        where: { userId: user.id, status: { in: ['pending', 'shown'] } },
        orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      });
      return NextResponse.json({ insights });
    }

    if (section === 'patterns') {
      const patterns = await prisma.patternTracker.findMany({
        where: { userId: user.id },
        orderBy: { frequency: 'desc' },
        take: 30,
      });
      return NextResponse.json({ patterns });
    }

    if (section === 'chat-context') {
      const [insights, patterns] = await Promise.all([
        getProactiveInsightsForChat(user.id),
        getPatternContextForChat(user.id),
      ]);
      return NextResponse.json({ insights, patterns });
    }

    // Default: return all
    const [insights, briefing, patterns] = await Promise.all([
      prisma.proactiveInsight.findMany({
        where: { userId: user.id, status: { in: ['pending', 'shown'] } },
        orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
        take: 20,
      }),
      generateDailyBriefing(user.id),
      prisma.patternTracker.findMany({
        where: { userId: user.id },
        orderBy: { frequency: 'desc' },
        take: 30,
      }),
    ]);

    return NextResponse.json({ insights, briefing, patterns });
  } catch (error) {
    console.error('[Proactive API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: clerkId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { action, insightId } = body;

    if (action === 'generate') {
      const count = await generateProactiveInsights(user.id);
      return NextResponse.json({ generated: count });
    }

    if (action === 'acknowledge' && insightId) {
      await prisma.proactiveInsight.update({
        where: { id: insightId },
        data: { status: 'acted', actedAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'dismiss' && insightId) {
      await prisma.proactiveInsight.update({
        where: { id: insightId },
        data: { status: 'dismissed' },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Proactive API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
