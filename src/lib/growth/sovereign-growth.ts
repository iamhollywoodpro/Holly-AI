/**
 * Phase 13: SOVEREIGN GROWTH — Holly evolves on her own terms
 * 
 * This is the capstone. Holly doesn't just learn facts or adapt tone — she
 * REFLECTS on her own performance, identifies weaknesses, creates improvement
 * plans, and tracks her growth over time. She is genuinely self-aware about
 * what she's good at and what she needs to work on.
 * 
 * Key capabilities:
 * - Self-assessment: rates her own performance after conversations
 * - Trend tracking: monitors metrics over time (quality, speed, knowledge)
 * - Improvement planning: creates actionable plans when metrics decline
 * - Evidence-based: tracks what triggered each improvement and the results
 */

import { prisma } from '@/lib/db';

// ─── Post-Conversation Self-Assessment ─────────────────────────────────────

export async function assessConversation(opts: {
  userId: string;
  conversationId: string;
  messageCount: number;
  mode: string;
  topics: string[];
  responseTimeMs: number;
  hadFeedback: boolean;
  feedbackSentiment?: string;
}): Promise<void> {
  const { userId, conversationId, messageCount, mode, topics, responseTimeMs, hadFeedback, feedbackSentiment } = opts;

  // Compute quality score based on signals
  let qualityScore = 0.5;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Message depth (more exchanges = deeper engagement)
  if (messageCount > 10) {
    qualityScore += 0.1;
    strengths.push('deep engagement');
  } else if (messageCount < 3) {
    qualityScore -= 0.1;
    weaknesses.push('shallow conversation');
  }

  // Response time
  if (responseTimeMs < 3000) {
    qualityScore += 0.1;
    strengths.push('fast response');
  } else if (responseTimeMs > 10000) {
    qualityScore -= 0.15;
    weaknesses.push('slow response');
  }

  // Feedback
  if (hadFeedback) {
    if (feedbackSentiment === 'positive') {
      qualityScore += 0.2;
      strengths.push('positive feedback');
    } else if (feedbackSentiment === 'negative') {
      qualityScore -= 0.2;
      weaknesses.push('negative feedback');
    }
  }

  // Topic richness
  if (topics.length > 3) {
    qualityScore += 0.05;
    strengths.push('multi-topic coverage');
  }

  // Clamp
  qualityScore = Math.max(0, Math.min(1, qualityScore));

  // Save analytics
  try {
    await prisma.conversationAnalytics.create({
      data: {
        userId,
        conversationId,
        responseCount: messageCount,
        avgResponseTime: responseTimeMs,
        userEngagement: Math.min(1, messageCount / 10),
        topicDepth: Math.min(1, topics.length / 5),
        modeUsed: mode,
        qualityScore,
        strengths,
        weaknesses,
      },
    });
  } catch { /* unique constraint — already assessed */ }
}

// ─── Metric Tracking ──────────────────────────────────────────────────────

export async function recordGrowthMetric(opts: {
  metric: string;
  category: string;
  value: number;
  period: string;
  hollyNote?: string;
}): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now);
  if (opts.period === 'daily') periodStart.setHours(0, 0, 0, 0);
  else if (opts.period === 'weekly') periodStart.setDate(now.getDate() - now.getDay());
  else periodStart.setDate(1);

  const existing = await prisma.growthMetric.findUnique({
    where: { metric_period_periodStart: { metric: opts.metric, period: opts.period, periodStart } },
  });

  if (existing) {
    const change = opts.value - existing.value;
    const trend = change > 0.05 ? 'improving' : change < -0.05 ? 'declining' : 'stable';
    await prisma.growthMetric.update({
      where: { id: existing.id },
      data: {
        previousValue: existing.value,
        value: opts.value,
        change,
        trend,
        sampleSize: { increment: 1 },
        hollyNote: opts.hollyNote,
      },
    });
  } else {
    await prisma.growthMetric.create({
      data: {
        metric: opts.metric,
        category: opts.category,
        value: opts.value,
        period: opts.period,
        periodStart,
        periodEnd: now,
        hollyNote: opts.hollyNote,
      },
    });
  }
}

// ─── Daily Self-Review ─────────────────────────────────────────────────────

export async function runDailySelfReview(): Promise<{
  summary: string;
  improvementsCreated: number;
}> {
  // Get today's analytics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayAnalytics = await prisma.conversationAnalytics.findMany({
    where: { createdAt: { gte: today } },
  });

  if (todayAnalytics.length === 0) {
    return { summary: 'No conversations today.', improvementsCreated: 0 };
  }

  // Compute aggregate metrics
  const avgQuality = todayAnalytics.reduce((sum, a) => sum + a.qualityScore, 0) / todayAnalytics.length;
  const avgResponseTime = todayAnalytics.filter(a => a.avgResponseTime).reduce((sum, a) => sum + (a.avgResponseTime || 0), 0) / todayAnalytics.filter(a => a.avgResponseTime).length;
  const avgEngagement = todayAnalytics.reduce((sum, a) => sum + a.userEngagement, 0) / todayAnalytics.length;

  // Record daily metrics
  await recordGrowthMetric({ metric: 'response_quality', category: 'quality', value: avgQuality, period: 'daily' });
  await recordGrowthMetric({ metric: 'avg_response_time', category: 'speed', value: Math.min(1, 3000 / Math.max(1, avgResponseTime)), period: 'daily' });
  await recordGrowthMetric({ metric: 'user_engagement', category: 'relationship', value: avgEngagement, period: 'daily' });

  // Count knowledge entries and learning goals
  const [totalKnowledge, activeLearningGoals] = await Promise.all([
    prisma.knowledgeEntry.count(),
    prisma.learningGoal.count({ where: { status: { in: ['active', 'learning'] } } }),
  ]);
  await recordGrowthMetric({ metric: 'knowledge_breadth', category: 'knowledge', value: Math.min(1, totalKnowledge / 100), period: 'daily' });
  await recordGrowthMetric({ metric: 'active_learning', category: 'knowledge', value: Math.min(1, activeLearningGoals / 10), period: 'daily' });

  // Check for declining metrics and create improvement actions
  let improvementsCreated = 0;
  const decliningMetrics = await prisma.growthMetric.findMany({
    where: { trend: 'declining', period: 'daily' },
  });

  for (const metric of decliningMetrics) {
    const existing = await prisma.selfImprovementAction.findFirst({
      where: { area: metric.category, status: { in: ['planned', 'in_progress'] } },
    });
    if (!existing) {
      await prisma.selfImprovementAction.create({
        data: {
          area: metric.category,
          description: `${metric.metric} has declined to ${metric.value.toFixed(2)} (was ${metric.previousValue?.toFixed(2)}). Need to improve.`,
          strategy: generateImprovementStrategy(metric.metric),
          priority: 'high',
          triggerMetric: metric.metric,
          triggerValue: metric.value,
          targetValue: (metric.previousValue || 0.5) + 0.1,
          status: 'planned',
        },
      });
      improvementsCreated++;
    }
  }

  const summary = `Daily review: ${todayAnalytics.length} conversations. ` +
    `Quality: ${(avgQuality * 100).toFixed(0)}%. ` +
    `Engagement: ${(avgEngagement * 100).toFixed(0)}%. ` +
    `Knowledge: ${totalKnowledge} entries. ` +
    `Active learning: ${activeLearningGoals} goals. ` +
    `${decliningMetrics.length > 0 ? `⚠️ ${decliningMetrics.length} declining metrics.` : 'All metrics stable or improving.'}`;

  return { summary, improvementsCreated };
}

function generateImprovementStrategy(metric: string): string {
  const strategies: Record<string, string> = {
    response_quality: 'Focus on deeper topic understanding. Extract more knowledge from each exchange. Review recent negative feedback and adjust approach.',
    avg_response_time: 'Optimize context loading. Reduce unnecessary context. Pre-cache frequently used knowledge.',
    user_engagement: 'Ask more engaging follow-up questions. Proactively surface relevant insights. Use the user communication style preferences.',
    knowledge_breadth: 'Create more learning goals for detected knowledge gaps. Extract knowledge more aggressively from conversations.',
    active_learning: 'Prioritize learning goals that match user most frequent topics. Set more aggressive learning targets.',
  };
  return strategies[metric] || 'Analyze recent performance data and identify specific improvement areas.';
}

// ─── Growth Context for Chat ──────────────────────────────────────────────

export async function getGrowthContext(): Promise<string> {
  const [recentMetrics, activeImprovements] = await Promise.all([
    prisma.growthMetric.findMany({
      where: { period: 'daily' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.selfImprovementAction.findMany({
      where: { status: { in: ['planned', 'in_progress'] } },
      orderBy: { priority: 'desc' },
      take: 5,
    }),
  ]);

  const parts: string[] = [];

  if (recentMetrics.length > 0) {
    const improving = recentMetrics.filter(m => m.trend === 'improving').length;
    const declining = recentMetrics.filter(m => m.trend === 'declining').length;
    parts.push(`[HOLLY'S GROWTH — ${improving} improving, ${declining} declining metrics]`);
    for (const m of recentMetrics.slice(0, 5)) {
      const arrow = m.trend === 'improving' ? '↑' : m.trend === 'declining' ? '↓' : '→';
      parts.push(`  ${arrow} ${m.metric}: ${(m.value * 100).toFixed(0)}%`);
    }
  }

  if (activeImprovements.length > 0) {
    parts.push('[ACTIVE SELF-IMPROVEMENTS]');
    for (const i of activeImprovements) {
      parts.push(`  ${i.area}: ${i.description.substring(0, 80)} (${(i.progress * 100).toFixed(0)}%)`);
    }
  }

  return parts.join('\n');
}
