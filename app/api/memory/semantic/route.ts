import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get('search') ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20', 10), 100);

    const searchFilter = search
      ? { contains: search, mode: 'insensitive' as const }
      : undefined;

    const [learningInsights, identity, adaptationStrategies, supportStrategies] =
      await Promise.all([
        prisma.learningInsight.findMany({
          where: search
            ? {
                OR: [
                  { title: searchFilter },
                  { description: searchFilter },
                  { category: searchFilter },
                  { insightType: searchFilter },
                ],
              }
            : {},
          orderBy: { learnedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            category: true,
            insightType: true,
            title: true,
            description: true,
            confidence: true,
            actionable: true,
            applied: true,
            priority: true,
            impact: true,
            tags: true,
            learnedAt: true,
            appliedAt: true,
          },
        }),

        prisma.hollyIdentity.findUnique({
          where: { userId: user.id },
          select: {
            id: true,
            coreValues: true,
            personalityTraits: true,
            interests: true,
            strengths: true,
            growthAreas: true,
            skillSet: true,
            confidenceLevel: true,
            purpose: true,
            updatedAt: true,
          },
        }),

        prisma.adaptationStrategy.findMany({
          where: {
            userId: user.id,
            active: true,
            ...(search ? { strategyName: searchFilter } : {}),
          },
          orderBy: { successRate: 'desc' },
          take: 15,
          select: {
            id: true,
            strategyName: true,
            description: true,
            context: true,
            successRate: true,
            timesApplied: true,
            timesSuccessful: true,
            lastApplied: true,
            createdAt: true,
          },
        }),

        prisma.supportStrategy.findMany({
          where: {
            userId: user.id,
            active: true,
            ...(search
              ? {
                  OR: [
                    { strategyName: searchFilter },
                    { emotionContext: searchFilter },
                  ],
                }
              : {}),
          },
          orderBy: { effectivenessScore: 'desc' },
          take: 15,
          select: {
            id: true,
            strategyName: true,
            emotionContext: true,
            description: true,
            effectivenessScore: true,
            timesUsed: true,
            timesEffective: true,
            lastUsed: true,
            createdAt: true,
          },
        }),
      ]);

    const memories: any[] = [];

    for (const li of learningInsights) {
      memories.push({
        id: `insight_${li.id}`,
        rawId: li.id,
        type: 'semantic',
        subtype: 'learning_insight',
        content: `${li.title}: ${li.description}`,
        category: li.category,
        insightType: li.insightType,
        confidence: li.confidence,
        priority: li.priority,
        tags: li.tags,
        applied: li.applied,
        createdAt: li.learnedAt,
        updatedAt: li.appliedAt || li.learnedAt,
        relevanceScore: li.confidence,
      });
    }

    for (const as_ of adaptationStrategies) {
      memories.push({
        id: `adapt_${as_.id}`,
        rawId: as_.id,
        type: 'semantic',
        subtype: 'adaptation_strategy',
        content: `${as_.strategyName}: ${as_.description}`,
        context: as_.context,
        successRate: as_.successRate,
        timesApplied: as_.timesApplied,
        createdAt: as_.createdAt,
        updatedAt: as_.lastApplied || as_.createdAt,
        relevanceScore: as_.successRate,
      });
    }

    for (const ss of supportStrategies) {
      memories.push({
        id: `support_${ss.id}`,
        rawId: ss.id,
        type: 'semantic',
        subtype: 'support_strategy',
        content: `${ss.strategyName} (${ss.emotionContext}): ${ss.description}`,
        emotionContext: ss.emotionContext,
        effectivenessScore: ss.effectivenessScore,
        timesUsed: ss.timesUsed,
        createdAt: ss.createdAt,
        updatedAt: ss.lastUsed || ss.createdAt,
        relevanceScore: ss.effectivenessScore,
      });
    }

    if (identity) {
      memories.push({
        id: `identity_${identity.id}`,
        rawId: identity.id,
        type: 'semantic',
        subtype: 'holly_identity',
        content: `HOLLY Identity — Purpose: ${identity.purpose} | Confidence: ${(identity.confidenceLevel * 100).toFixed(0)}%`,
        coreValues: identity.coreValues,
        personalityTraits: identity.personalityTraits,
        interests: identity.interests,
        strengths: identity.strengths,
        growthAreas: identity.growthAreas,
        confidenceLevel: identity.confidenceLevel,
        createdAt: identity.updatedAt,
        updatedAt: identity.updatedAt,
        relevanceScore: identity.confidenceLevel,
      });
    }

    memories.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({
      memories,
      total: memories.length,
      breakdown: {
        learningInsights: learningInsights.length,
        adaptationStrategies: adaptationStrategies.length,
        supportStrategies: supportStrategies.length,
        identity: identity ? 1 : 0,
      },
    });
  } catch (error: any) {
    console.error('[Memory Semantic API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load semantic memory data', message: error.message },
      { status: 500 },
    );
  }
}
