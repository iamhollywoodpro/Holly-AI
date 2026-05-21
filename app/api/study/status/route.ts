/**
 * GET /api/study/status — Phase 14: Study loop status and history
 *
 * Returns:
 *   - Active learning goals with progress
 *   - Recent study sessions
 *   - Knowledge base coverage by domain
 *   - Upcoming study priorities
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getStudyStats } from '@/lib/study/study-scheduler';

export const runtime = 'nodejs';
export const dynamic  = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parallel fetch everything
    const [stats, activeGoals, recentEntries, recentInsights] = await Promise.all([
      getStudyStats(user.id),
      prisma.learningGoal.findMany({
        where: { userId: user.id, status: { in: ['active', 'learning'] } },
        orderBy: [{ priority: 'desc' }, { progress: 'asc' }],
        take: 10,
        select: {
          id: true,
          domain: true,
          topic: true,
          description: true,
          priority: true,
          progress: true,
          status: true,
          source: true,
          createdAt: true,
        },
      }),
      prisma.knowledgeEntry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          domain: true,
          topic: true,
          title: true,
          confidence: true,
          source: true,
          timesUsed: true,
          createdAt: true,
        },
      }),
      prisma.learningInsight.findMany({
        where: { insightType: 'background_learning' },
        orderBy: { learnedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          category: true,
          title: true,
          confidence: true,
          tags: true,
          learnedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      phase: 14,
      description: 'Holly studies while you sleep — autonomous knowledge growth',
      stats,
      activeGoals,
      recentKnowledge: recentEntries,
      recentStudySessions: recentInsights,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
