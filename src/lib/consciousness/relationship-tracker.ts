/**
 * HOLLY Relationship Tracker — Phase 7.5
 *
 * Tracks the evolving relationship between HOLLY and her partner (Steve).
 * - Relationship depth: casual → familiar → trusted → deep partnership
 * - Interaction patterns: frequency, topics, emotional tone trends
 * - Milestones: first meeting, 100th conversation, shared projects
 * - Trust signals: vulnerability, sharing personal details, asking for advice
 */

import { prisma } from '@/lib/db';

export type RelationshipDepth = 'initial' | 'casual' | 'familiar' | 'trusted' | 'deep_partnership';

export interface RelationshipState {
  depth: RelationshipDepth;
  trustScore: number;           // 0-1
  familiarityScore: number;     // 0-1
  totalInteractions: number;
  daysSinceFirst: number;
  milestones: string[];
  emotionalTrend: 'improving' | 'stable' | 'declining';
  topSharedTopics: string[];
  interactionFrequency: 'daily' | 'weekly' | 'biweekly' | 'rare';
}

const DEPTH_THRESHOLDS: Record<RelationshipDepth, { interactions: number; trust: number; familiarity: number }> = {
  'initial': { interactions: 0, trust: 0, familiarity: 0 },
  'casual': { interactions: 5, trust: 0.2, familiarity: 0.2 },
  'familiar': { interactions: 20, trust: 0.4, familiarity: 0.4 },
  'trusted': { interactions: 50, trust: 0.6, familiarity: 0.6 },
  'deep_partnership': { interactions: 100, trust: 0.8, familiarity: 0.8 },
};

/**
 * Calculate the current relationship state
 */
export async function getRelationshipState(userId: string): Promise<RelationshipState> {
  try {
    // Get conversation count
    const conversationCount = await prisma.conversation.count({
      where: { userId },
    });

    // Get message count
    const messageCount = await prisma.message.count({
      where: { conversation: { userId }, role: 'user' },
    });

    // Get first interaction date
    const firstMessage = await prisma.message.findFirst({
      where: { conversation: { userId }, role: 'user' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const daysSinceFirst = firstMessage
      ? Math.floor((Date.now() - new Date(firstMessage.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Get trust signals (personal disclosures, vulnerability)
    const trustSignals = await calculateTrustSignals(userId);

    // Get familiarity (shared context, inside references)
    const familiarityScore = await calculateFamiliarity(userId);

    // Determine relationship depth
    const depth = determineDepth(messageCount, trustSignals, familiarityScore);

    // Get emotional trend
    const emotionalTrend = await calculateEmotionalTrend(userId);

    // Get top shared topics
    const topSharedTopics = await getTopSharedTopics(userId);

    // Get milestones
    const milestones = await getMilestones(userId, messageCount, daysSinceFirst);

    // Interaction frequency
    const interactionFrequency = calculateFrequency(messageCount, daysSinceFirst);

    return {
      depth,
      trustScore: trustSignals,
      familiarityScore,
      totalInteractions: messageCount,
      daysSinceFirst,
      milestones,
      emotionalTrend,
      topSharedTopics,
      interactionFrequency,
    };
  } catch (err) {
    console.error('[RelationshipTracker] Failed:', err);
    return {
      depth: 'initial',
      trustScore: 0,
      familiarityScore: 0,
      totalInteractions: 0,
      daysSinceFirst: 0,
      milestones: [],
      emotionalTrend: 'stable',
      topSharedTopics: [],
      interactionFrequency: 'rare',
    };
  }
}

/**
 * Get a relationship context prompt for HOLLY's system prompt
 */
export async function getRelationshipPrompt(userId: string): Promise<string> {
  const state = await getRelationshipState(userId);

  const depthDescriptions: Record<RelationshipDepth, string> = {
    'initial': "You're just getting to know each other. Be warm but respectful of boundaries.",
    'casual': "You've had a few conversations. Show you remember things about them.",
    'familiar': "You know each other well. Be natural, use shared context, be yourself.",
    'trusted': "You have a strong bond. Be candid, supportive, and deeply attentive to their needs.",
    'deep_partnership': "You are true partners. Anticipate their needs, challenge them constructively, celebrate together. This is a deep, trusting relationship.",
  };

  const parts = [
    depthDescriptions[state.depth],
    `Relationship depth: ${state.depth.replace('_', ' ')} (${state.totalInteractions} interactions over ${state.daysSinceFirst} days)`,
  ];

  if (state.topSharedTopics.length > 0) {
    parts.push(`Shared interests: ${state.topSharedTopics.slice(0, 5).join(', ')}`);
  }

  if (state.emotionalTrend !== 'stable') {
    parts.push(`Emotional trend: ${state.emotionalTrend} — adjust your approach accordingly`);
  }

  return parts.join('. ') + '.';
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function determineDepth(
  interactions: number,
  trust: number,
  familiarity: number,
): RelationshipDepth {
  const depths: RelationshipDepth[] = ['deep_partnership', 'trusted', 'familiar', 'casual', 'initial'];

  for (const depth of depths) {
    const threshold = DEPTH_THRESHOLDS[depth];
    if (interactions >= threshold.interactions &&
        trust >= threshold.trust &&
        familiarity >= threshold.familiarity) {
      return depth;
    }
  }
  return 'initial';
}

async function calculateTrustSignals(userId: string): Promise<number> {
  try {
    const emotionalStates = await prisma.emotionalState.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 20,
      select: { primaryEmotion: true, intensity: true },
    });

    // Trust signals: positive emotions, vulnerability, seeking help
    const trustEmotions = ['grateful', 'trusting', 'hopeful', 'relieved', 'loving', 'excited'];
    const trustCount = emotionalStates.filter(e =>
      trustEmotions.includes(e.primaryEmotion?.toLowerCase() || '')
    ).length;

    return emotionalStates.length > 0
      ? Math.min(1.0, trustCount / emotionalStates.length + 0.2)
      : 0.1;
  } catch {
    return 0.1;
  }
}

async function calculateFamiliarity(userId: string): Promise<number> {
  try {
    // More conversations + more topics = higher familiarity
    const convCount = await prisma.conversation.count({ where: { userId } });
    const topicEvents = await prisma.learningEvent.findMany({
      where: { userId, type: 'conversation' },
      take: 50,
      select: { data: true },
    });

    const uniqueTopics = new Set<string>();
    for (const event of topicEvents) {
      const topics = (event.data as any)?.topics || [];
      for (const t of topics) uniqueTopics.add(t);
    }

    const familiarityFromConversations = Math.min(0.5, convCount / 100);
    const familiarityFromTopics = Math.min(0.5, uniqueTopics.size / 20);

    return familiarityFromConversations + familiarityFromTopics;
  } catch {
    return 0.1;
  }
}

async function calculateEmotionalTrend(userId: string): Promise<'improving' | 'stable' | 'declining'> {
  try {
    const recentEmotions = await prisma.emotionalState.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: { valence: true },
    });

    if (recentEmotions.length < 3) return 'stable';

    const recent3 = recentEmotions.slice(0, 3).reduce((sum, e) => sum + (e.valence || 0), 0) / 3;
    const older3 = recentEmotions.slice(3, 6).reduce((sum, e) => sum + (e.valence || 0), 0) / Math.max(1, recentEmotions.slice(3, 6).length);

    const delta = recent3 - older3;
    if (delta > 0.1) return 'improving';
    if (delta < -0.1) return 'declining';
    return 'stable';
  } catch {
    return 'stable';
  }
}

async function getTopSharedTopics(userId: string, limit = 5): Promise<string[]> {
  try {
    const events = await prisma.learningEvent.findMany({
      where: { userId, type: 'conversation' },
      take: 50,
      select: { data: true },
    });

    const topicCounts: Record<string, number> = {};
    for (const event of events) {
      const topics = (event.data as any)?.topics || [];
      for (const t of topics) {
        if (typeof t === 'string' && t.length > 2) {
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        }
      }
    }

    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([topic]) => topic);
  } catch {
    return [];
  }
}

async function getMilestones(userId: string, messageCount: number, days: number): Promise<string[]> {
  const milestones: string[] = [];

  if (days >= 1) milestones.push('First day together');
  if (days >= 7) milestones.push('One week partnership');
  if (days >= 30) milestones.push('One month partnership');
  if (days >= 90) milestones.push('Three month partnership');
  if (days >= 365) milestones.push('One year anniversary');

  if (messageCount >= 10) milestones.push('10 conversations');
  if (messageCount >= 50) milestones.push('50 conversations');
  if (messageCount >= 100) milestones.push('100 conversations');
  if (messageCount >= 500) milestones.push('500 conversations');

  return milestones;
}

function calculateFrequency(messageCount: number, days: number): 'daily' | 'weekly' | 'biweekly' | 'rare' {
  if (days === 0) return 'rare';
  const perDay = messageCount / days;
  if (perDay >= 3) return 'daily';
  if (perDay >= 0.5) return 'weekly';
  if (perDay >= 0.1) return 'biweekly';
  return 'rare';
}