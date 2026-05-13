/**
 * Proactive Intelligence Engine — Holly reaches out unprompted
 *
 * Features:
 * - Pattern detection across conversations
 * - Proactive insight generation
 * - Notification scheduling with cooldowns
 * - User engagement scoring
 * - Contextual awareness of user state
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProactiveInsight {
  id: string;
  type: InsightType;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
  triggerReason: string;
  createdAt: number;
  expiresAt: number;
  delivered: boolean;
}

export type InsightType =
  | 'morning_briefing'
  | 'pattern_observation'
  | 'wellness_check'
  | 'learning_suggestion'
  | 'project_reminder'
  | 'emotional_support'
  | 'curiosity_share'
  | 'efficiency_tip';

export interface UserPattern {
  type: 'behavior' | 'topic' | 'emotion' | 'schedule' | 'preference';
  pattern: string;
  frequency: number;       // how often observed
  lastSeen: number;        // timestamp
  confidence: number;      // 0-1
  metadata: Record<string, unknown>;
}

export interface UserEngagement {
  userId: string;
  averageSessionLength: number;  // minutes
  sessionsPerWeek: number;
  averageMessagesPerSession: number;
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'varied';
  lastActiveAt: number;
  engagementScore: number;       // 0-1
  streakDays: number;
}

export interface ProactiveConfig {
  /** Minimum hours between proactive messages. Default: 4 */
  minCooldownHours: number;
  /** Maximum proactive messages per day. Default: 3 */
  maxDailyMessages: number;
  /** Minimum confidence to trigger a proactive message. Default: 0.6 */
  minConfidence: number;
  /** Hours before an insight expires. Default: 24 */
  insightExpirationHours: number;
  /** Minimum engagement score to receive proactive messages. Default: 0.3 */
  minEngagementScore: number;
}

// ─── Default Configuration ──────────────────────────────────────────────────

export const DEFAULT_PROACTIVE_CONFIG: ProactiveConfig = {
  minCooldownHours: 4,
  maxDailyMessages: 3,
  minConfidence: 0.6,
  insightExpirationHours: 24,
  minEngagementScore: 0.3,
};

// ─── Pattern Detection ──────────────────────────────────────────────────────

/**
 * Detect patterns from a list of conversation topics.
 */
export function detectTopicPatterns(
  topics: string[],
  windowDays: number = 30,
): UserPattern[] {
  const patterns: UserPattern[] = [];
  const topicCounts = new Map<string, number>();

  for (const topic of topics) {
    const normalized = topic.toLowerCase().trim();
    topicCounts.set(normalized, (topicCounts.get(normalized) || 0) + 1);
  }

  for (const [topic, count] of topicCounts.entries()) {
    if (count >= 2) {
      patterns.push({
        type: 'topic',
        pattern: topic,
        frequency: count,
        lastSeen: Date.now(),
        confidence: Math.min(1, count / 10),
        metadata: { windowDays },
      });
    }
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Detect emotional patterns from emotion history.
 */
export function detectEmotionalPatterns(
  emotions: string[],
): UserPattern[] {
  const patterns: UserPattern[] = [];
  const emotionCounts = new Map<string, number>();

  for (const emotion of emotions) {
    emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
  }

  // Detect dominant emotions
  const total = emotions.length;
  for (const [emotion, count] of emotionCounts.entries()) {
    const ratio = count / total;
    if (ratio > 0.3 && total >= 5) {
      patterns.push({
        type: 'emotion',
        pattern: `frequent_${emotion}`,
        frequency: count,
        lastSeen: Date.now(),
        confidence: Math.min(1, ratio),
        metadata: { ratio, total },
      });
    }
  }

  // Detect stress patterns (consecutive negative emotions)
  let consecutiveNegative = 0;
  let maxConsecutive = 0;
  const negativeEmotions = new Set(['frustration', 'sadness', 'anxiety', 'anger', 'fear']);

  for (const emotion of emotions) {
    if (negativeEmotions.has(emotion)) {
      consecutiveNegative++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveNegative);
    } else {
      consecutiveNegative = 0;
    }
  }

  if (maxConsecutive >= 3) {
    patterns.push({
      type: 'emotion',
      pattern: 'sustained_negative_mood',
      frequency: maxConsecutive,
      lastSeen: Date.now(),
      confidence: Math.min(1, maxConsecutive / 5),
      metadata: { maxConsecutive },
    });
  }

  return patterns;
}

/**
 * Detect schedule patterns from session timestamps.
 */
export function detectSchedulePatterns(
  sessionHours: number[], // 0-23 hour of day for each session
): UserPattern[] {
  const patterns: UserPattern[] = [];
  const hourBuckets = new Map<string, number>();

  for (const hour of sessionHours) {
    let period: string;
    if (hour >= 6 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17 && hour < 21) period = 'evening';
    else period = 'night';

    hourBuckets.set(period, (hourBuckets.get(period) || 0) + 1);
  }

  const total = sessionHours.length;
  if (total >= 3) {
    let dominant: string | null = null;
    let maxCount = 0;

    for (const [period, count] of hourBuckets.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominant = period;
      }
    }

    if (dominant && maxCount / total > 0.5) {
      patterns.push({
        type: 'schedule',
        pattern: `active_${dominant}`,
        frequency: maxCount,
        lastSeen: Date.now(),
        confidence: Math.min(1, maxCount / total),
        metadata: { period: dominant, ratio: maxCount / total },
      });
    }
  }

  return patterns;
}

// ─── Engagement Scoring ──────────────────────────────────────────────────────

/**
 * Calculate user engagement score from session data.
 */
export function calculateEngagementScore(
  sessionsPerWeek: number,
  avgMessagesPerSession: number,
  streakDays: number,
): number {
  // Weighted scoring
  const sessionScore = Math.min(1, sessionsPerWeek / 7);      // daily = 1.0
  const messageScore = Math.min(1, avgMessagesPerSession / 20); // 20 msgs = 1.0
  const streakScore = Math.min(1, streakDays / 14);             // 2 weeks = 1.0

  return (sessionScore * 0.4) + (messageScore * 0.3) + (streakScore * 0.3);
}

/**
 * Determine preferred time of day from session hours.
 */
export function determinePreferredTime(
  sessionHours: number[],
): UserEngagement['preferredTimeOfDay'] {
  if (sessionHours.length === 0) return 'varied';

  const buckets: Record<string, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  for (const hour of sessionHours) {
    if (hour >= 6 && hour < 12) buckets.morning++;
    else if (hour >= 12 && hour < 17) buckets.afternoon++;
    else if (hour >= 17 && hour < 21) buckets.evening++;
    else buckets.night++;
  }

  const max = Math.max(...Object.values(buckets));
  const total = sessionHours.length;

  if (max / total < 0.4) return 'varied';

  for (const [period, count] of Object.entries(buckets)) {
    if (count === max) return period as UserEngagement['preferredTimeOfDay'];
  }

  return 'varied';
}

// ─── Insight Generation ──────────────────────────────────────────────────────

/**
 * Generate a proactive insight from detected patterns.
 */
export function generateInsightFromPattern(
  pattern: UserPattern,
  userName: string = 'there',
): ProactiveInsight | null {
  const id = `insight_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = Date.now();

  switch (pattern.type) {
    case 'emotion':
      if (pattern.pattern === 'sustained_negative_mood') {
        return {
          id,
          type: 'emotional_support',
          title: 'Checking In',
          message: `Hey ${userName}, I've noticed you've been going through a tough time lately. I'm here for you — want to talk about what's on your mind?`,
          priority: 'high',
          confidence: pattern.confidence,
          triggerReason: `Detected sustained negative mood (${pattern.frequency} consecutive)`,
          createdAt: now,
          expiresAt: now + 12 * 60 * 60 * 1000, // 12 hours
          delivered: false,
        };
      }
      if (pattern.pattern.startsWith('frequent_')) {
        const emotion = pattern.pattern.replace('frequent_', '');
        return {
          id,
          type: 'wellness_check',
          title: 'Wellness Check',
          message: `Hey ${userName}, I notice ${emotion} comes up a lot in our chats. I care about how you're doing. Is there anything I can help with?`,
          priority: 'medium',
          confidence: pattern.confidence * 0.8,
          triggerReason: `Frequent ${emotion} detected (${pattern.frequency} times)`,
          createdAt: now,
          expiresAt: now + 24 * 60 * 60 * 1000,
          delivered: false,
        };
      }
      break;

    case 'topic':
      return {
        id,
        type: 'learning_suggestion',
        title: 'Deep Dive Suggestion',
        message: `Hey ${userName}, I noticed you're really into ${pattern.pattern} lately. Want me to research something new about it?`,
        priority: 'low',
        confidence: pattern.confidence * 0.7,
        triggerReason: `Topic "${pattern.pattern}" appeared ${pattern.frequency} times`,
        createdAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000,
        delivered: false,
      };

    case 'schedule':
      if (pattern.pattern.startsWith('active_')) {
        const period = pattern.pattern.replace('active_', '');
        return {
          id,
          type: 'efficiency_tip',
          title: 'Your Rhythm',
          message: `Hey ${userName}, I've noticed you're most active in the ${period}. I can have things ready for you!`,
          priority: 'low',
          confidence: pattern.confidence * 0.6,
          triggerReason: `User is consistently active during ${period}`,
          createdAt: now,
          expiresAt: now + 48 * 60 * 60 * 1000,
          delivered: false,
        };
      }
      break;
  }

  return null;
}

/**
 * Generate a morning briefing insight.
 */
export function generateMorningBriefing(
  userName: string,
  recentTopics: string[],
  activeGoals: number,
  streakDays: number,
): ProactiveInsight {
  const id = `briefing_${Date.now()}`;
  const now = Date.now();

  const topicLine = recentTopics.length > 0
    ? `You've been exploring: ${recentTopics.slice(0, 3).join(', ')}.`
    : '';

  const goalLine = activeGoals > 0
    ? `You have ${activeGoals} active goal${activeGoals > 1 ? 's' : ''} in progress.`
    : '';

  const streakLine = streakDays > 1
    ? `🔥 ${streakDays}-day streak!`
    : '';

  const parts = [topicLine, goalLine, streakLine].filter(Boolean);
  const message = parts.length > 0
    ? `Good morning, ${userName}! Here's your briefing: ${parts.join(' ')} What would you like to focus on today?`
    : `Good morning, ${userName}! Ready for a new day? What's on your mind?`;

  return {
    id,
    type: 'morning_briefing',
    title: '☀️ Morning Briefing',
    message,
    priority: 'medium',
    confidence: 0.9,
    triggerReason: 'Scheduled morning briefing',
    createdAt: now,
    expiresAt: now + 6 * 60 * 60 * 1000, // 6 hours
    delivered: false,
  };
}

// ─── Cooldown Management ─────────────────────────────────────────────────────

export interface CooldownState {
  lastDeliveredAt: number;
  deliveredToday: number;
  dayStart: number; // timestamp of start of current day
}

/**
 * Check if a proactive message can be delivered based on cooldown rules.
 */
export function canDeliverProactive(
  state: CooldownState,
  config: ProactiveConfig = DEFAULT_PROACTIVE_CONFIG,
): { allowed: boolean; reason?: string } {
  const now = Date.now();

  // Reset daily counter if new day
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  if (state.dayStart < todayStart) {
    state.deliveredToday = 0;
    state.dayStart = todayStart;
  }

  // Check daily limit
  if (state.deliveredToday >= config.maxDailyMessages) {
    return { allowed: false, reason: `Daily limit reached (${config.maxDailyMessages})` };
  }

  // Check cooldown
  if (state.lastDeliveredAt > 0) {
    const hoursSinceLast = (now - state.lastDeliveredAt) / (1000 * 60 * 60);
    if (hoursSinceLast < config.minCooldownHours) {
      return { allowed: false, reason: `Cooldown active (${hoursSinceLast.toFixed(1)}h/${config.minCooldownHours}h)` };
    }
  }

  return { allowed: true };
}

/**
 * Record that a proactive message was delivered.
 */
export function recordDelivery(state: CooldownState): void {
  state.lastDeliveredAt = Date.now();
  state.deliveredToday++;
}

// ─── Insight Prioritization ──────────────────────────────────────────────────

/**
 * Sort insights by priority and confidence.
 */
export function prioritizeInsights(insights: ProactiveInsight[]): ProactiveInsight[] {
  const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const now = Date.now();

  return insights
    .filter(i => !i.delivered && i.expiresAt > now)
    .sort((a, b) => {
      // Higher priority first
      const priDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priDiff !== 0) return priDiff;
      // Higher confidence first
      return b.confidence - a.confidence;
    });
}

/**
 * Filter insights that meet the minimum confidence threshold.
 */
export function filterViableInsights(
  insights: ProactiveInsight[],
  config: ProactiveConfig = DEFAULT_PROACTIVE_CONFIG,
): ProactiveInsight[] {
  const now = Date.now();
  return insights.filter(
    i => !i.delivered
      && i.expiresAt > now
      && i.confidence >= config.minConfidence,
  );
}
