/**
 * Phase 11: Autonomous Learning API
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { detectKnowledgeGaps, getRelevantKnowledge, getLearningStatusContext } from '@/lib/learning/autonomous-learning';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId: clerkId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const url = new URL(req.url);
    const section = url.searchParams.get('section');

    if (section === 'goals') {
      const goals = await prisma.learningGoal.findMany({
        where: { userId: user.id },
        orderBy: [{ priority: 'desc' }, { progress: 'asc' }],
      });
      return NextResponse.json({ goals });
    }

    if (section === 'knowledge') {
      const topic = url.searchParams.get('topic');
      const knowledge = topic
        ? await getRelevantKnowledge([topic], user.id)
        : await prisma.knowledgeEntry.findMany({
            orderBy: { confidence: 'desc' },
            take: 50,
          });
      return NextResponse.json({ knowledge });
    }

    if (section === 'status') {
      const [status, totalEntries, totalGoals] = await Promise.all([
        getLearningStatusContext(user.id),
        prisma.knowledgeEntry.count(),
        prisma.learningGoal.count({ where: { status: { in: ['active', 'learning'] } } }),
      ]);
      return NextResponse.json({ status, totalEntries, activeGoals: totalGoals });
    }

    // Default: overview
    const [goals, recentKnowledge, stats] = await Promise.all([
      prisma.learningGoal.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, take: 20 }),
      prisma.knowledgeEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      getLearningStatusContext(user.id),
    ]);

    return NextResponse.json({ goals, recentKnowledge, stats });
  } catch (error) {
    console.error('[Learning API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
