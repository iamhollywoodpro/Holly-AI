/**
 * HOLLY Feedback Analyzer Worker — Phase 6
 *
 * Periodically analyzes feedback patterns:
 *  - Computes per-user satisfaction trends
 *  - Identifies Holly's weak areas (modes with most negative feedback)
 *  - Generates improvement suggestions as learning events
 *  - Runs every 2 hours
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CYCLE_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

async function analyzeFeedback() {
  console.log(`[FeedbackAnalyzer] 📊 Starting feedback analysis — ${new Date().toISOString()}`);

  try {
    // Get all users with recent feedback
    const recentFeedback = await prisma.responseFeedback.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: {
        userId: true,
        sentiment: true,
        sentimentScore: true,
        feedbackType: true,
        lessonLearned: true,
        context: true,
      },
    });

    if (recentFeedback.length === 0) {
      console.log('[FeedbackAnalyzer] No recent feedback — skipping');
      return;
    }

    // Group by user
    const byUser = new Map<string, typeof recentFeedback>();
    for (const fb of recentFeedback) {
      if (!byUser.has(fb.userId)) byUser.set(fb.userId, []);
      byUser.get(fb.userId)!.push(fb);
    }

    for (const [userId, feedbacks] of byUser) {
      const positive = feedbacks.filter(f => f.sentiment === 'positive').length;
      const negative = feedbacks.filter(f => f.sentiment === 'negative').length;
      const total = feedbacks.length;
      const ratio = positive / Math.max(total, 1);
      const avgScore = feedbacks.reduce((s, f) => s + (f.sentimentScore || 0), 0) / total;

      // Extract weak modes
      const modeStats = new Map<string, { pos: number; neg: number }>();
      for (const fb of feedbacks) {
        const ctx = fb.context as any;
        const mode = ctx?.mode || 'default';
        const stat = modeStats.get(mode) || { pos: 0, neg: 0 };
        if (fb.sentiment === 'positive') stat.pos++;
        else if (fb.sentiment === 'negative') stat.neg++;
        modeStats.set(mode, stat);
      }

      // Find weakest modes
      const weakModes = [...modeStats.entries()]
        .filter(([, s]) => s.neg > s.pos)
        .map(([mode, s]) => ({ mode, neg: s.neg, pos: s.pos }))
        .sort((a, b) => b.neg - a.neg)
        .slice(0, 3);

      // Extract top lessons
      const lessons = feedbacks
        .filter(f => f.lessonLearned && f.sentiment === 'negative')
        .slice(0, 5)
        .map(f => f.lessonLearned);

      // Store as learning event
      await prisma.learningEvent.create({
        data: {
          type: 'feedback_analysis',
          userId,
          data: {
            positive,
            negative,
            total,
            ratio: Math.round(ratio * 100) / 100,
            avgScore: Math.round(avgScore * 100) / 100,
            weakModes,
            lessons,
            period: '7d',
            analyzedAt: new Date().toISOString(),
          },
          processed: false,
        },
      });
    }

    console.log(`[FeedbackAnalyzer] ✅ Analyzed feedback for ${byUser.size} users (${recentFeedback.length} total feedbacks)`);
  } catch (err) {
    console.error('[FeedbackAnalyzer] Fatal:', err);
  }
}

async function main() {
  console.log('[FeedbackAnalyzer] 📊 Starting feedback analyzer worker...');
  await analyzeFeedback();
  setInterval(analyzeFeedback, CYCLE_INTERVAL);
  console.log('[FeedbackAnalyzer] ✅ Running every 2 hours.');
}

main().catch(console.error);