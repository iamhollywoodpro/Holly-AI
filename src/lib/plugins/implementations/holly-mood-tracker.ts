/**
 * Holly Mood Tracker Plugin — Emotional pattern tracking
 *
 * Tracks the user's mood over time and surfaces patterns, trends,
 * and insights. Mood entries are created from conversation signals
 * or manual check-ins. Provides weekly/monthly analysis.
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface MoodEntry {
  id: string;
  userId: string;
  mood: string;          // happy, sad, anxious, angry, calm, excited, neutral
  intensity: number;     // 0-1
  source: 'checkin' | 'conversation' | 'detected';
  note: string | null;
  tags: string[];
  createdAt: Date;
}

export interface MoodTrend {
  period: string;
  dominantMood: string;
  averageIntensity: number;
  moodDistribution: Record<string, number>;
  trend: 'improving' | 'stable' | 'declining';
  insight: string;
}

export interface MoodSummary {
  totalEntries: number;
  currentStreak: number;     // consecutive days with entries
  dominantMood: string;
  averageIntensity: number;
  recentTrend: MoodTrend;
}

// ============================================================================
// MOOD TRACKER SERVICE
// ============================================================================

export class MoodTrackerService {
  private static VALID_MOODS = ['happy', 'sad', 'anxious', 'angry', 'calm', 'excited', 'frustrated', 'neutral'];

  /**
   * Log a mood entry for a user.
   */
  async logMood(
    userId: string,
    mood: string,
    intensity: number,
    source: 'checkin' | 'conversation' | 'detected' = 'checkin',
    note?: string,
    tags?: string[],
  ): Promise<MoodEntry> {
    const normalizedMood = this.normalizeMood(mood);
    const clampedIntensity = Math.min(1, Math.max(0, intensity));

    return prisma.pluginMoodEntry.create({
      data: {
        userId,
        mood: normalizedMood,
        intensity: clampedIntensity,
        source,
        note: note || null,
        tags: tags || [],
      },
    }) as Promise<MoodEntry>;
  }

  /**
   * Get recent mood entries.
   */
  async getRecentMoods(userId: string, days: number = 7): Promise<MoodEntry[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return prisma.pluginMoodEntry.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<MoodEntry[]>;
  }

  /**
   * Analyze mood trends over a time period.
   */
  async analyzeTrend(userId: string, days: number = 30): Promise<MoodTrend | null> {
    const entries = await this.getRecentMoods(userId, days);
    if (entries.length < 3) return null;

    // Mood distribution
    const distribution: Record<string, number> = {};
    let totalIntensity = 0;

    for (const entry of entries) {
      distribution[entry.mood] = (distribution[entry.mood] || 0) + 1;
      totalIntensity += entry.intensity;
    }

    const dominantMood = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])[0][0];
    const averageIntensity = totalIntensity / entries.length;

    // Calculate trend by comparing first half to second half
    const halfPoint = Math.floor(entries.length / 2);
    const olderEntries = entries.slice(halfPoint);
    const newerEntries = entries.slice(0, halfPoint);

    const olderAvg = this.moodScore(olderEntries);
    const newerAvg = this.moodScore(newerEntries);
    const diff = newerAvg - olderAvg;

    const trend: 'improving' | 'stable' | 'declining' =
      diff > 0.1 ? 'improving' : diff < -0.1 ? 'declining' : 'stable';

    const insight = this.generateInsight(dominantMood, trend, averageIntensity, days);

    return {
      period: `${days} days`,
      dominantMood,
      averageIntensity: Math.round(averageIntensity * 100) / 100,
      moodDistribution: distribution,
      trend,
      insight,
    };
  }

  /**
   * Get a full mood summary for the user.
   */
  async getSummary(userId: string): Promise<MoodSummary | null> {
    const totalEntries = await prisma.pluginMoodEntry.count({
      where: { userId },
    });

    if (totalEntries === 0) return null;

    const recentEntries = await this.getRecentMoods(userId, 30);
    const recentTrend = await this.analyzeTrend(userId, 30);

    // Calculate streak (consecutive days with entries)
    const currentStreak = await this.calculateStreak(userId);

    // Dominant mood from recent entries
    const distribution: Record<string, number> = {};
    for (const entry of recentEntries) {
      distribution[entry.mood] = (distribution[entry.mood] || 0) + 1;
    }
    const dominantMood = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    const averageIntensity = recentEntries.length > 0
      ? recentEntries.reduce((sum, e) => sum + e.intensity, 0) / recentEntries.length
      : 0.5;

    return {
      totalEntries,
      currentStreak,
      dominantMood,
      averageIntensity: Math.round(averageIntensity * 100) / 100,
      recentTrend: recentTrend || {
        period: '30 days',
        dominantMood,
        averageIntensity,
        moodDistribution: distribution,
        trend: 'stable' as const,
        insight: 'Not enough data for trend analysis yet.',
      },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private normalizeMood(mood: string): string {
    const lower = mood.toLowerCase();
    if (MoodTrackerService.VALID_MOODS.includes(lower)) return lower;

    const aliases: Record<string, string> = {
      good: 'happy', great: 'excited', bad: 'sad', down: 'sad',
      worried: 'anxious', stressed: 'anxious', mad: 'angry',
      upset: 'frustrated', okay: 'neutral', fine: 'neutral',
      peaceful: 'calm', relaxed: 'calm', thrilled: 'excited',
    };
    return aliases[lower] || 'neutral';
  }

  /**
   * Score a set of entries on a -1 to +1 scale.
   * Positive moods score higher, negative moods score lower.
   */
  private moodScore(entries: MoodEntry[]): number {
    if (entries.length === 0) return 0;

    const moodValence: Record<string, number> = {
      happy: 1, excited: 0.9, calm: 0.6, neutral: 0,
      frustrated: -0.4, anxious: -0.5, angry: -0.7, sad: -0.8,
    };

    let total = 0;
    for (const entry of entries) {
      const valence = moodValence[entry.mood] ?? 0;
      total += valence * entry.intensity;
    }

    return total / entries.length;
  }

  private generateInsight(
    dominantMood: string,
    trend: string,
    avgIntensity: number,
    days: number,
  ): string {
    const parts: string[] = [];

    if (trend === 'improving') {
      parts.push(`Your mood has been trending upward over the past ${days} days.`);
    } else if (trend === 'declining') {
      parts.push(`Your mood has been dipping over the past ${days} days.`);
    } else {
      parts.push(`Your mood has been relatively stable over the past ${days} days.`);
    }

    parts.push(`Your dominant mood was "${dominantMood}" with an average intensity of ${Math.round(avgIntensity * 100)}%.`);

    if (dominantMood === 'sad' || dominantMood === 'anxious' || dominantMood === 'frustrated') {
      parts.push('Consider checking in with someone you trust, or taking some time for self-care.');
    }

    return parts.join(' ');
  }

  private async calculateStreak(userId: string): Promise<number> {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await prisma.pluginMoodEntry.count({
        where: {
          userId,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      if (count > 0) {
        streak++;
      } else if (i > 0) {
        // Allow today to be missing (day not over yet)
        break;
      }
    }

    return streak;
  }
}

// Export singleton
export const moodTrackerService = new MoodTrackerService();
