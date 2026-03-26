/**
 * GET /api/evolution/dashboard
 *
 * Aggregates all HOLLY growth data for the Evolution Dashboard:
 *  - HollyIdentity (confidence level, traits, values)
 *  - Recent EmotionalState history (last 30)
 *  - LearningPatterns (top patterns by confidence)
 *  - EvolutionProposals (recent proposals)
 *  - LearningEvent counts (by type, last 7 days)
 *  - TasteProfile (style preferences)
 *  - Active HollyGoals
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(userId);
    const uid = dbUser.id;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      identity,
      emotions,
      patterns,
      proposals,
      recentEvents,
      taste,
      goals,
      totalEvents,
    ] = await Promise.all([
      // Identity
      prisma.hollyIdentity.findFirst({
        where: { userId: uid },
        select: {
          personalityTraits: true,
          coreValues: true,
          strengths: true,
          interests: true,
          confidenceLevel: true,
          purpose: true,
          lastEvolved: true,
          growthAreas: true,
        },
      }),

      // Emotion history last 30
      prisma.emotionalState.findMany({
        where: { userId: uid },
        orderBy: { timestamp: 'desc' },
        take: 30,
        select: {
          primaryEmotion: true,
          intensity: true,
          valence: true,
          arousal: true,
          timestamp: true,
        },
      }),

      // Top learning patterns
      prisma.learningPattern.findMany({
        orderBy: { confidence: 'desc' },
        take: 10,
        select: {
          pattern: true,
          category: true,
          frequency: true,
          confidence: true,
          lastSeen: true,
        },
      }),

      // Recent evolution proposals
      prisma.evolutionProposal.findMany({
        orderBy: { proposedAt: 'desc' },
        take: 8,
        select: {
          title: true,
          type: true,
          impact: true,
          risk: true,
          status: true,
          proposedAt: true,
          rationale: true,
        },
      }),

      // Learning events last 7 days — group by type
      prisma.learningEvent.groupBy({
        by: ['type'],
        where: { userId: uid, timestamp: { gte: sevenDaysAgo } },
        _count: { id: true },
      }),

      // Taste profile
      prisma.tasteProfile.findFirst({
        where: { userId: uid },
        select: {
          tone: true,
          verbosity: true,
          humor: true,
          technical: true,
          emoji: true,
          topTopics: true,
          formats: true,
          signalCount: true,
          lastUpdated: true,
        },
      }),

      // Active goals
      prisma.hollyGoal.findMany({
        where: { userId: uid, status: 'active' },
        take: 6,
        select: { title: true, category: true, priority: true, createdAt: true },
        orderBy: { priority: 'desc' },
      }),

      // Total learning events all time
      prisma.learningEvent.count({ where: { userId: uid } }),
    ]);

    // Compute emotion trend (last 7 vs previous 7 valence average)
    const recent7 = emotions.slice(0, 7);
    const prev7 = emotions.slice(7, 14);
    const avgValence = (arr: typeof emotions) =>
      arr.length ? arr.reduce((s, e) => s + (e.valence || 0), 0) / arr.length : 0;
    const emotionTrend = avgValence(recent7) - avgValence(prev7);

    // Emotion frequency map
    const emotionFreq: Record<string, number> = {};
    for (const e of emotions) {
      emotionFreq[e.primaryEmotion] = (emotionFreq[e.primaryEmotion] || 0) + 1;
    }
    const topEmotions = Object.entries(emotionFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, pct: Math.round(count / emotions.length * 100) }));

    // Event type counts
    const eventsByType: Record<string, number> = {};
    for (const row of recentEvents) {
      eventsByType[row.type] = row._count.id;
    }

    return NextResponse.json({
      identity: identity
        ? {
            traits: (identity.personalityTraits as string[]) || [],
            values: (identity.coreValues as string[]) || [],
            strengths: (identity.strengths as string[]) || [],
            interests: (identity.interests as string[]) || [],
            growthAreas: (identity.growthAreas as string[]) || [],
            confidence: identity.confidenceLevel || 0.5,
            purpose: identity.purpose || '',
            lastEvolved: identity.lastEvolved,
          }
        : null,

      emotions: {
        history: emotions.slice(0, 20).map(e => ({
          emotion: e.primaryEmotion,
          intensity: e.intensity,
          valence: e.valence,
          arousal: e.arousal,
          ts: e.timestamp,
        })),
        topEmotions,
        trend: emotionTrend,
        totalSampled: emotions.length,
      },

      patterns: patterns.map(p => ({
        pattern: p.pattern.slice(0, 80),
        category: p.category,
        frequency: p.frequency,
        confidence: p.confidence,
        lastSeen: p.lastSeen,
      })),

      proposals: proposals.map(p => ({
        title: p.title,
        type: p.type,
        impact: p.impact,
        risk: p.risk,
        status: p.status,
        proposedAt: p.proposedAt,
        rationale: (p.rationale as string || '').slice(0, 120),
      })),

      learning: {
        totalEvents,
        last7Days: eventsByType,
        totalLast7: Object.values(eventsByType).reduce((s, n) => s + n, 0),
      },

      taste: taste
        ? {
            tone: taste.tone,
            verbosity: taste.verbosity,
            humor: taste.humor,
            technical: taste.technical,
            emoji: taste.emoji,
            topTopics: taste.topTopics,
            formats: taste.formats,
            signalCount: taste.signalCount,
            lastUpdated: taste.lastUpdated,
          }
        : null,

      goals: goals.map(g => ({ title: g.title, category: g.category, priority: g.priority })),
    });
  } catch (error) {
    console.error('[Evolution Dashboard] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
