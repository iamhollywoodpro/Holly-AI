/**
 * Holly Daily Digest Plugin — Morning summary
 *
 * Generates a personalized daily digest with insights, reminders,
 * mood summary, learning progress, and proactive suggestions.
 * Can be triggered on-demand or scheduled for morning delivery.
 */

import { prisma } from '@/lib/prisma';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ============================================================================
// TYPES
// ============================================================================

export interface DailyDigest {
  id: string;
  userId: string;
  date: Date;
  greeting: string;
  moodSummary: string;
  topInsights: string[];
  reminders: string[];
  progressNote: string;
  suggestion: string;
  createdAt: Date;
}

export interface DigestInput {
  userId: string;
  timezone?: string;
}

// ============================================================================
// DAILY DIGEST SERVICE
// ============================================================================

export class DailyDigestService {
  /**
   * Generate a daily digest for a user.
   * Pulls together mood data, recent conversations, notes, and patterns.
   */
  async generateDigest(input: DigestInput): Promise<DailyDigest> {
    const { userId } = input;
    const today = new Date();

    // Gather data in parallel
    const [recentMoods, recentNotes, recentConversations, existingDigest] = await Promise.all([
      this.getRecentMoodData(userId),
      this.getRecentNotes(userId),
      this.getRecentConversationTopics(userId),
      this.getTodayDigest(userId),
    ]);

    // Don't regenerate if one exists today
    if (existingDigest) return existingDigest;

    // Build context for LLM
    const context = this.buildDigestContext(recentMoods, recentNotes, recentConversations);
    const greeting = this.getTimeAwareGreeting();

    // Generate digest content with LLM
    const digestContent = await this.generateDigestContent(context, greeting);

    // Store the digest
    const digest = await prisma.pluginDailyDigest.create({
      data: {
        userId,
        date: today,
        greeting: digestContent.greeting,
        moodSummary: digestContent.moodSummary,
        topInsights: digestContent.topInsights,
        reminders: digestContent.reminders,
        progressNote: digestContent.progressNote,
        suggestion: digestContent.suggestion,
      },
    });

    return digest as unknown as DailyDigest;
  }

  /**
   * Get today's digest if it exists.
   */
  async getTodayDigest(userId: string): Promise<DailyDigest | null> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const digest = await prisma.pluginDailyDigest.findFirst({
      where: {
        userId,
        date: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
    });

    return digest as unknown as DailyDigest | null;
  }

  /**
   * Get digest history.
   */
  async getDigestHistory(userId: string, days: number = 7): Promise<DailyDigest[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return prisma.pluginDailyDigest.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'desc' },
      take: days,
    }) as unknown as Promise<DailyDigest[]>;
  }

  // ── Data Gathering ──────────────────────────────────────────────────────

  private async getRecentMoodData(userId: string): Promise<string> {
    try {
      const entries = await prisma.pluginMoodEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (entries.length === 0) return 'No mood data yet.';
      const moods = entries.map(e => e.mood);
      const dominant = this.mostFrequent(moods);
      return `Recent moods: ${moods.join(', ')}. Dominant: ${dominant}.`;
    } catch {
      return 'Mood data unavailable.';
    }
  }

  private async getRecentNotes(userId: string): Promise<string> {
    try {
      const notes = await prisma.pluginNote.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { title: true, tags: true },
      });

      if (notes.length === 0) return 'No recent notes.';
      return `Recent notes: ${notes.map(n => `"${n.title}"`).join(', ')}.`;
    } catch {
      return 'Notes unavailable.';
    }
  }

  private async getRecentConversationTopics(userId: string): Promise<string> {
    try {
      const conversations = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { title: true },
      });

      if (conversations.length === 0) return 'No recent conversations.';
      const titles = conversations.map(c => c.title).filter(Boolean);
      return titles.length > 0 ? `Recent topics: ${titles.join(', ')}.` : 'Recent conversations had no titles.';
    } catch {
      return 'Conversation data unavailable.';
    }
  }

  // ── Digest Generation ──────────────────────────────────────────────────

  private buildDigestContext(moodData: string, notesData: string, topicData: string): string {
    return [
      `Mood data: ${moodData}`,
      `Notes: ${notesData}`,
      `Recent topics: ${topicData}`,
    ].join('\n');
  }

  private async generateDigestContent(
    context: string,
    greeting: string,
  ): Promise<{
    greeting: string;
    moodSummary: string;
    topInsights: string[];
    reminders: string[];
    progressNote: string;
    suggestion: string;
  }> {
    try {
      const prompt = `You are Holly generating a personalized daily digest. Based on this user data, create an encouraging, warm digest.

${context}

Generate a JSON object with:
{
  "greeting": "warm personalized greeting (1-2 sentences)",
  "moodSummary": "summary of their emotional patterns (1-2 sentences)",
  "topInsights": ["insight1", "insight2"],
  "reminders": ["reminder1"],
  "progressNote": "encouraging note about their growth (1 sentence)",
  "suggestion": "one actionable suggestion for today"
}

Be warm but not sycophantic. Be specific, not generic.`;

      const routing = await smartRoute(prompt, { taskHint: 'speed' });
      const { text } = await cascadeCollect(
        routing.waterfall,
        [{ role: 'user', content: prompt }],
        { temperature: 0.5, maxTokens: 400 },
      );

      const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          greeting: String(parsed.greeting || greeting),
          moodSummary: String(parsed.moodSummary || 'No mood data available.'),
          topInsights: Array.isArray(parsed.topInsights) ? parsed.topInsights.map(String) : [],
          reminders: Array.isArray(parsed.reminders) ? parsed.reminders.map(String) : [],
          progressNote: String(parsed.progressNote || ''),
          suggestion: String(parsed.suggestion || ''),
        };
      }
    } catch (err) {
      console.warn('[DailyDigest] LLM generation failed:', (err as Error).message);
    }

    // Fallback
    return {
      greeting,
      moodSummary: 'Mood tracking just started — check back in a few days for patterns.',
      topInsights: ['Start tracking your mood daily for personalized insights'],
      reminders: [],
      progressNote: 'Every day is a step forward.',
      suggestion: 'Take a moment to check in with how you\'re feeling today.',
    };
  }

  private getTimeAwareGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! ☀️';
    if (hour < 17) return 'Good afternoon! 🌤️';
    return 'Good evening! 🌙';
  }

  private mostFrequent(arr: string[]): string {
    const counts: Record<string, number> = {};
    for (const item of arr) counts[item] = (counts[item] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
  }
}

// Export singleton
export const dailyDigestService = new DailyDigestService();
