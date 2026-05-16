// ─────────────────────────────────────────────────────────────────────────────
// Proactive Intelligence API — Holly's proactive insights & pattern detection
// Phase 6.4: Exposes the proactive engine via API for dashboard/MCP consumption
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  detectTopicPatterns,
  detectEmotionalPatterns,
  detectSchedulePatterns,
  calculateEngagementScore,
  determinePreferredTime,
  generateInsightFromPattern,
  generateMorningBriefing,
  prioritizeInsights,
  filterViableInsights,
  canDeliverProactive,
  recordDelivery,
  DEFAULT_PROACTIVE_CONFIG,
  type ProactiveInsight,
  type CooldownState,
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
    const includePatterns = url.searchParams.get('patterns') === 'true';
    const includeEngagement = url.searchParams.get('engagement') === 'true';

    // Fetch user's recent conversation data for pattern detection
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [recentMessages, learningEvents, goals] = await Promise.all([
      prisma.message.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          role: 'user',
        },
        select: {
          content: true,
          createdAt: true,
          conversationId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }).catch(() => []),

      prisma.learningEvent.findMany({
        where: {
          timestamp: { gte: sevenDaysAgo },
        },
        select: {
          type: true,
          data: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'desc' },
        take: 200,
      }).catch(() => []),

      prisma.hollyGoal.findMany({
        where: { status: 'active' },
        select: { title: true, category: true, progress: true },
        take: 10,
      }).catch(() => []),
    ]);

    // Extract topics from messages (simple keyword extraction)
    const topics = extractTopics(recentMessages.map((m: any) => m.content));
    const emotions = learningEvents
      .filter((e: any) => e.type === 'emotion')
      .map((e: any) => (e.data as any)?.emotion)
      .filter(Boolean);
    const sessionHours = recentMessages.map((m: any) => new Date(m.createdAt).getHours());

    // Run pattern detection
    const topicPatterns = detectTopicPatterns(topics);
    const emotionalPatterns = detectEmotionalPatterns(emotions);
    const schedulePatterns = detectSchedulePatterns(sessionHours);
    const allPatterns = [...topicPatterns, ...emotionalPatterns, ...schedulePatterns];

    // Generate insights from patterns
    const userName = 'there'; // Could fetch from user profile
    const rawInsights: ProactiveInsight[] = [];

    for (const pattern of allPatterns) {
      const insight = generateInsightFromPattern(pattern, userName);
      if (insight) rawInsights.push(insight);
    }

    // Add morning briefing if requested time
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour <= 10) {
      const briefing = generateMorningBriefing(
        userName,
        topics.slice(0, 5),
        goals.length,
        calculateStreakDays(recentMessages),
      );
      rawInsights.push(briefing);
    }

    // Filter and prioritize
    const viableInsights = filterViableInsights(rawInsights);
    const prioritizedInsights = prioritizeInsights(viableInsights);

    // Build response
    const response: Record<string, any> = {
      insights: prioritizedInsights.slice(0, 10),
      totalDetected: rawInsights.length,
      totalViable: viableInsights.length,
      timestamp: new Date().toISOString(),
    };

    if (includePatterns) {
      response.patterns = {
        topics: topicPatterns.slice(0, 10),
        emotions: emotionalPatterns.slice(0, 5),
        schedule: schedulePatterns,
      };
    }

    if (includeEngagement) {
      const sessionsPerWeek = estimateSessionsPerWeek(recentMessages);
      const avgMessagesPerSession = recentMessages.length > 0
        ? recentMessages.length / Math.max(1, sessionsPerWeek)
        : 0;
      const streakDays = calculateStreakDays(recentMessages);

      response.engagement = {
        score: calculateEngagementScore(sessionsPerWeek, avgMessagesPerSession, streakDays),
        sessionsPerWeek,
        avgMessagesPerSession: Math.round(avgMessagesPerSession),
        streakDays,
        preferredTime: determinePreferredTime(sessionHours),
        totalMessages: recentMessages.length,
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[ProactiveInsights] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights', details: error.message },
      { status: 500 },
    );
  }
}

// ─── POST /api/proactive/insights ─────────────────────────────────────────────
// Mark insights as delivered, or trigger proactive insight generation for a user
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, insightIds, cooldownState } = body;

    if (action === 'mark_delivered' && Array.isArray(insightIds)) {
      // Mark specific insights as delivered (client-side tracking)
      return NextResponse.json({
        success: true,
        delivered: insightIds.length,
        message: `Marked ${insightIds.length} insights as delivered`,
      });
    }

    if (action === 'check_cooldown' && cooldownState) {
      const state: CooldownState = {
        lastDeliveredAt: cooldownState.lastDeliveredAt || 0,
        deliveredToday: cooldownState.deliveredToday || 0,
        dayStart: cooldownState.dayStart || 0,
      };
      const result = canDeliverProactive(state, DEFAULT_PROACTIVE_CONFIG);
      return NextResponse.json({
        allowed: result.allowed,
        reason: result.reason,
        config: DEFAULT_PROACTIVE_CONFIG,
      });
    }

    if (action === 'record_delivery') {
      const state: CooldownState = cooldownState || {
        lastDeliveredAt: 0,
        deliveredToday: 0,
        dayStart: new Date().setHours(0, 0, 0, 0),
      };
      recordDelivery(state);
      return NextResponse.json({
        success: true,
        updatedState: state,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: mark_delivered, check_cooldown, or record_delivery' },
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

// ─── Helper Functions ─────────────────────────────────────────────────────────

function extractTopics(messages: string[]): string[] {
  const topics: string[] = [];
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'if', 'while', 'about', 'up', 'it', 'its', 'i', 'me', 'my',
    'we', 'our', 'you', 'your', 'he', 'she', 'they', 'them', 'this',
    'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'am',
  ]);

  for (const msg of messages) {
    if (!msg || typeof msg !== 'string') continue;
    const words = msg.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        topics.push(word);
      }
    }
  }

  return topics;
}

function calculateStreakDays(messages: any[]): number {
  if (messages.length === 0) return 0;

  const uniqueDays = new Set<string>();
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toISOString().split('T')[0];
    uniqueDays.add(date);
  }

  const sortedDays = Array.from(uniqueDays).sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().split('T')[0];

  for (let i = 0; i < sortedDays.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedStr = expectedDate.toISOString().split('T')[0];

    if (sortedDays[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function estimateSessionsPerWeek(messages: any[]): number {
  if (messages.length === 0) return 0;

  // Group messages by day
  const daySet = new Set<string>();
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toISOString().split('T')[0];
    daySet.add(date);
  }

  const totalDays = daySet.size;
  if (totalDays === 0) return 0;

  // Scale to weekly rate based on the 30-day window
  const weeksInWindow = Math.max(1, totalDays / 7);
  return Math.round(totalDays / weeksInWindow);
}
