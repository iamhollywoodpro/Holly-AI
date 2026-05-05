/**
 * HOLLY Emotional Memory Trajectory — V3.0
 *
 * Tracks emotional arcs ACROSS conversations, not just per-message.
 * Detects sustained patterns: "Steve has been frustrated for 3 sessions"
 * HOLLY adjusts her approach based on trajectories, not snapshots.
 *
 * Phase 3.4 — Real Emotional Intelligence
 */

import { prisma } from '@/lib/db';

export interface EmotionalTrajectory {
  userId: string;
  /** Dominant emotion over recent sessions */
  dominantEmotion: string;
  /** Is the trend improving, declining, or stable? */
  trend: 'improving' | 'declining' | 'stable';
  /** How many consecutive sessions with this pattern */
  sessionStreak: number;
  /** Average valence over recent sessions (-1 to +1) */
  averageValence: number;
  /** Average arousal over recent sessions (0 to 1) */
  averageArousal: number;
  /** Recommended behavior adjustment */
  recommendation: string;
  /** Summary for prompt injection */
  trajectorySummary: string;
}

/**
 * Compute the emotional trajectory for a user across recent sessions.
 * Looks at the last 7 days of emotional data.
 */
export async function computeEmotionalTrajectory(userId: string): Promise<EmotionalTrajectory> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Get recent emotional states
    const recentEmotions = await prisma.emotionalState.findMany({
      where: {
        userId,
        timestamp: { gte: sevenDaysAgo },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        primaryEmotion: true,
        intensity: true,
        valence: true,
        arousal: true,
        timestamp: true,
      },
    });

    if (recentEmotions.length === 0) {
      return buildDefaultTrajectory(userId);
    }

    // Count emotion frequencies
    const emotionCounts: Record<string, number> = {};
    let totalValence = 0;
    let totalArousal = 0;

    for (const emo of recentEmotions) {
      const e = emo.primaryEmotion || 'neutral';
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
      totalValence += emo.valence || 0;
      totalArousal += emo.arousal || 0;
    }

    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral';

    const avgValence = totalValence / recentEmotions.length;
    const avgArousal = totalArousal / recentEmotions.length;

    // Determine trend by comparing first half vs second half valence
    const half = Math.floor(recentEmotions.length / 2);
    const recent = recentEmotions.slice(0, half);
    const older = recentEmotions.slice(half);
    const recentValence = recent.reduce((s, e) => s + (e.valence || 0), 0) / (recent.length || 1);
    const olderValence = older.reduce((s, e) => s + (e.valence || 0), 0) / (older.length || 1);

    const valenceDiff = recentValence - olderValence;
    const trend: 'improving' | 'declining' | 'stable' =
      valenceDiff > 0.15 ? 'improving' :
      valenceDiff < -0.15 ? 'declining' : 'stable';

    // Count consecutive sessions with dominant emotion
    const sessionStreak = countStreak(recentEmotions, dominantEmotion);

    // Generate recommendation based on trajectory
    const recommendation = generateRecommendation(dominantEmotion, trend, sessionStreak, avgValence);

    // Build summary for prompt injection
    const trajectorySummary = buildTrajectorySummary(dominantEmotion, trend, sessionStreak, avgValence, recentEmotions.length);

    return {
      userId,
      dominantEmotion,
      trend,
      sessionStreak,
      averageValence: avgValence,
      averageArousal: avgArousal,
      recommendation,
      trajectorySummary,
    };
  } catch (err) {
    console.warn('[EmotionTrajectory] Failed:', (err as Error).message);
    return buildDefaultTrajectory(userId);
  }
}

function countStreak(emotions: Array<{ primaryEmotion: string | null }>, dominant: string): number {
  let streak = 0;
  for (const e of emotions) {
    if ((e.primaryEmotion || 'neutral') === dominant) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function generateRecommendation(
  dominant: string,
  trend: string,
  streak: number,
  avgValence: number,
): string {
  // Sustained negative patterns need attention
  if (streak >= 3 && avgValence < -0.3) {
    return 'BE_EXTRA_CAREFUL: User has shown sustained negative emotions. Be gentle, validate feelings, don\'t rush to solutions.';
  }

  if (dominant === 'sadness' && trend === 'declining') {
    return 'EMPATHY_PRIORITY: Emotional state is declining. Focus on being present and supportive. Avoid being overly cheerful.';
  }

  if (dominant === 'frustration' || dominant === 'anger') {
    return 'SIMPLIFY_APPROACH: User seems frustrated. Offer simpler solutions, break tasks into steps, be patient.';
  }

  if (dominant === 'joy' && trend === 'improving') {
    return 'MATCH_ENERGY: User is in a great mood! Be enthusiastic, suggest creative ideas, ride the wave.';
  }

  if (dominant === 'curiosity') {
    return 'ENCOURAGE_EXPLORATION: User is curious. Provide depth, make connections, suggest related topics.';
  }

  if (trend === 'improving') {
    return 'POSITIVE_MOMENTUM: User\'s mood is improving. Be warm and encouraging.';
  }

  return 'BALANCED: No strong emotional trajectory detected. Be natural and present.';
}

function buildTrajectorySummary(
  dominant: string,
  trend: string,
  streak: number,
  avgValence: number,
  dataPoints: number,
): string {
  const moodWord = avgValence > 0.3 ? 'positive' : avgValence < -0.3 ? 'difficult' : 'balanced';
  const trendWord = trend === 'improving' ? 'improving' : trend === 'declining' ? 'concerning' : 'stable';

  let summary = `[EMOTIONAL TRAJECTORY — ${dataPoints} data points over 7 days] `;
  summary += `Dominant emotion: ${dominant}. Overall mood: ${moodWord} (trend: ${trendWord}). `;

  if (streak >= 3) {
    summary += `This pattern has persisted for ${streak} consecutive interactions — it's meaningful, not random. `;
  }

  summary += `Let this context inform your approach naturally.`;

  return summary;
}

function buildDefaultTrajectory(userId: string): EmotionalTrajectory {
  return {
    userId,
    dominantEmotion: 'neutral',
    trend: 'stable',
    sessionStreak: 0,
    averageValence: 0,
    averageArousal: 0.3,
    recommendation: 'BALANCED: No emotional history yet. Be natural and attentive.',
    trajectorySummary: '',
  };
}