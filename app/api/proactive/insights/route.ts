// ─────────────────────────────────────────────────────────────────────────────
// Proactive Intelligence API — Holly's proactive insights & pattern detection
// Rewritten for Phase 10 proactive engine
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  generateProactiveInsights,
  generateDailyBriefing,
  getProactiveInsightsForChat,
  getPatternContextForChat,
} from '@/lib/proactive/proactive-engine';

export const dynamic = 'force-dynamic';

// ─── GET /api/proactive/insights ──────────────────────────────────────────────
// Returns pending proactive insights for the authenticated user
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'insights';

    // Look up internal user ID
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'briefing') {
      const briefing = await generateDailyBriefing(user.id);
      return NextResponse.json({ briefing });
    }

    if (action === 'patterns') {
      const patternContext = await getPatternContextForChat(user.id);
      return NextResponse.json({ patterns: patternContext });
    }

    // Default: return pending proactive insights from database
    const insights = await prisma.proactiveInsight.findMany({
      where: {
        userId: user.id,
        status: 'pending',
      },
      orderBy: [
        { urgency: 'desc' },
        { confidence: 'desc' },
      ],
      take: 10,
    });

    return NextResponse.json({
      insights,
      total: insights.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[ProactiveInsights] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights', details: error.message },
      { status: 500 },
    );
  }
}

// ─── POST /api/proactive/insights ─────────────────────────────────────────────
// Trigger insight generation or manage insight states
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action, insightIds } = body;

    if (action === 'generate') {
      const count = await generateProactiveInsights(user.id);
      return NextResponse.json({ generated: count });
    }

    if (action === 'dismiss' && Array.isArray(insightIds)) {
      await prisma.proactiveInsight.updateMany({
        where: { id: { in: insightIds }, userId: user.id },
        data: { status: 'dismissed' },
      });
      return NextResponse.json({ dismissed: insightIds.length });
    }

    if (action === 'act' && Array.isArray(insightIds)) {
      await prisma.proactiveInsight.updateMany({
        where: { id: { in: insightIds }, userId: user.id },
        data: { status: 'acted_on', actedAt: new Date() },
      });
      return NextResponse.json({ acted: insightIds.length });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: generate, dismiss, or act' },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('[ProactiveInsights] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to process proactive action', details: error.message },
      { status: 500 },
    );
  }
}
