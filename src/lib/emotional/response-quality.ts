/**
 * HOLLY Response Quality Analyzer
 *
 * Phase E4: Post-response quality feedback loop.
 *
 * After every response, this runs as a background task and evaluates
 * whether Holly's response was emotionally appropriate. The results are
 * stored and fed back into the system prompt as a trend signal — so
 * Holly self-corrects over time.
 *
 * Design principles:
 * - Uses LLM for quality assessment (not keyword matching)
 * - Runs async — never blocks the response
 * - Produces simple 0-1 scores on 4 dimensions
 * - Stores trends, not just snapshots
 */

import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import { prisma } from '@/lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface QualityScores {
  /** Did Holly acknowledge the user's emotional state? (0-1) */
  empathy: number;
  /** Was the response warm without being sycophantic? (0-1) */
  warmth: number;
  /** Did Holly actually address what was asked? (0-1) */
  relevance: number;
  /** Did Holly match the user's energy register? (0-1) */
  toneMatch: number;
  /** Overall quality (weighted average) */
  overall: number;
  /** Brief note on what could improve */
  note: string;
}

export interface QualityTrend {
  /** Average scores over the last N responses */
  avgEmpathy: number;
  avgWarmth: number;
  avgRelevance: number;
  avgToneMatch: number;
  avgOverall: number;
  /** Number of responses in this trend window */
  sampleSize: number;
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining';
}

// ============================================================================
// QUALITY ASSESSMENT
// ============================================================================

/**
 * Assess the quality of a response using LLM analysis.
 *
 * This is the core function — it asks a fast LLM to rate Holly's
 * response on 4 dimensions. The LLM gets the user's message, Holly's
 * response, and is asked to produce simple scores.
 */
export async function assessResponseQuality(
  userMessage: string,
  hollyResponse: string,
  emotionalContext?: string,
): Promise<QualityScores> {
  try {
    const emotionHint = emotionalContext
      ? `\nThe user's detected emotional state was: ${emotionalContext}`
      : '';

    const prompt = `You are a response quality evaluator. Rate Holly's response to the user's message on 4 dimensions. Be fair but honest.

User's message: "${userMessage.slice(0, 500)}"${emotionHint}

Holly's response: "${hollyResponse.slice(0, 800)}"

Rate each dimension 0-1:
- empathy: Did Holly acknowledge the user's feelings/state? (0 = ignored emotions, 1 = deeply attuned)
- warmth: Was the response warm without being sycophantic? (0 = cold/robotic or excessive flattery, 1 = genuine warmth)
- relevance: Did Holly actually address what was asked? (0 = off-topic, 1 = directly addressed)
- toneMatch: Did Holly match the user's energy? (0 = wildly mismatched, 1 = perfect match)

Respond with ONLY a JSON object: {"empathy":0.8,"warmth":0.7,"relevance":0.9,"toneMatch":0.8,"note":"brief improvement suggestion or praise"}`;

    const routing = await smartRoute(prompt, { taskHint: 'speed' });
    const { text } = await cascadeCollect(
      routing.waterfall,
      [{ role: 'user', content: prompt }],
      { temperature: 0.2, maxTokens: 150 },
    );

    // Parse response
    const jsonMatch = (text || '').match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const empathy = clampScore(parsed.empathy);
      const warmth = clampScore(parsed.warmth);
      const relevance = clampScore(parsed.relevance);
      const toneMatch = clampScore(parsed.toneMatch);

      return {
        empathy,
        warmth,
        relevance,
        toneMatch,
        overall: Math.round((empathy * 0.3 + warmth * 0.2 + relevance * 0.3 + toneMatch * 0.2) * 100) / 100,
        note: typeof parsed.note === 'string' ? parsed.note.slice(0, 200) : '',
      };
    }
  } catch (err) {
    console.warn('[ResponseQuality] Assessment failed:', (err as Error).message);
  }

  // Fallback: neutral scores (don't penalize on failure)
  return { empathy: 0.5, warmth: 0.5, relevance: 0.7, toneMatch: 0.5, overall: 0.55, note: 'Assessment unavailable' };
}

/**
 * Store quality scores in the database.
 * Uses the existing GrowthMetric model.
 */
export async function storeQualityScores(
  userId: string,
  scores: QualityScores,
  conversationId?: string,
): Promise<void> {
  try {
    const dimensions = [
      { metric: 'empathy_accuracy', value: scores.empathy, note: scores.note },
      { metric: 'response_warmth', value: scores.warmth },
      { metric: 'response_relevance', value: scores.relevance },
      { metric: 'tone_matching', value: scores.toneMatch },
      { metric: 'response_quality', value: scores.overall },
    ];

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    await Promise.all(
      dimensions.map(async (d) => {
        // GrowthMetric schema has @@unique([metric, period, periodStart]) and no
        // userId field — it tracks Holly's AGGREGATE growth, not per-user metrics.
        // Multiple responses in the same day for the same metric should UPDATE
        // the existing record (averaging the value, incrementing sampleSize).
        try {
          const existing = await prisma.growthMetric.findUnique({
            where: { metric_period_periodStart: { metric: d.metric, period: 'per-response', periodStart } },
          });

          if (existing) {
            const newSampleSize = existing.sampleSize + 1;
            const newValue = (existing.value * existing.sampleSize + d.value) / newSampleSize;
            await prisma.growthMetric.update({
              where: { id: existing.id },
              data: {
                value: newValue,
                sampleSize: newSampleSize,
                periodEnd: now,
                hollyNote: d.note || existing.hollyNote,
              },
            });
          } else {
            await prisma.growthMetric.create({
              data: {
                metric: d.metric,
                category: 'quality',
                value: d.value,
                period: 'per-response',
                periodStart,
                periodEnd: now,
                sampleSize: 1,
                hollyNote: d.note || null,
                trend: 'stable',
              },
            });
          }
        } catch (err) {
          // Defensive — never let analytics failure break chat
          console.warn('[response-quality] growthMetric write failed:', err instanceof Error ? err.message : err);
        }
      })
    );

    // Also store as ResponseFeedback for detailed analysis
    await prisma.responseFeedback.create({
      data: {
        userId,
        conversationId: conversationId || null,
        feedbackType: 'implicit',
        sentiment: scores.overall > 0.7 ? 'positive' : scores.overall > 0.4 ? 'neutral' : 'negative',
        sentimentScore: scores.overall * 2 - 1, // Convert 0-1 to -1 to 1
        context: {
          empathy: scores.empathy,
          warmth: scores.warmth,
          relevance: scores.relevance,
          toneMatch: scores.toneMatch,
        },
        hollyResponse: '', // Don't store the full response again
        lessonLearned: scores.note || null,
      },
    }).catch(() => {
      // Graceful degradation
    });
  } catch (err) {
    console.warn('[ResponseQuality] Storage failed:', (err as Error).message);
  }
}

/**
 * Get quality trend for the last N responses.
 * Used to generate the feedback prompt block.
 */
export async function getQualityTrend(
  userId: string,
  windowSize: number = 20,
): Promise<QualityTrend | null> {
  try {
    const metrics = await prisma.growthMetric.findMany({
      where: {
        metric: 'response_quality',
        category: 'quality',
      },
      orderBy: { createdAt: 'desc' },
      take: windowSize,
    });

    if (metrics.length < 3) return null; // Not enough data yet

    const avgOverall = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;

    // Calculate trend by comparing first half to second half
    const halfPoint = Math.floor(metrics.length / 2);
    const recentHalf = metrics.slice(0, halfPoint);
    const olderHalf = metrics.slice(halfPoint);
    const recentAvg = recentHalf.reduce((s, m) => s + m.value, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((s, m) => s + m.value, 0) / olderHalf.length;

    const diff = recentAvg - olderAvg;
    const trend: 'improving' | 'stable' | 'declining' =
      diff > 0.05 ? 'improving' : diff < -0.05 ? 'declining' : 'stable';

    // Get dimension averages
    const allDimensions = await prisma.growthMetric.findMany({
      where: {
        category: 'quality',
        metric: { in: ['empathy_accuracy', 'response_warmth', 'response_relevance', 'tone_matching'] },
      },
      orderBy: { createdAt: 'desc' },
      take: windowSize * 4, // 4 dimensions × windowSize
    });

    const dimAvg = (metricName: string) => {
      const values = allDimensions.filter(m => m.metric === metricName).map(m => m.value);
      return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0.5;
    };

    return {
      avgEmpathy: Math.round(dimAvg('empathy_accuracy') * 100) / 100,
      avgWarmth: Math.round(dimAvg('response_warmth') * 100) / 100,
      avgRelevance: Math.round(dimAvg('response_relevance') * 100) / 100,
      avgToneMatch: Math.round(dimAvg('tone_matching') * 100) / 100,
      avgOverall: Math.round(avgOverall * 100) / 100,
      sampleSize: metrics.length,
      trend,
    };
  } catch (err) {
    console.warn('[ResponseQuality] Trend fetch failed:', (err as Error).message);
    return null;
  }
}

/**
 * Generate a concise prompt block from quality trends.
 * Injected into the system prompt so Holly self-corrects.
 */
export function getQualityTrendPrompt(trend: QualityTrend): string {
  const pct = (v: number) => Math.round(v * 100);
  const emoji = trend.trend === 'improving' ? '📈' : trend.trend === 'declining' ? '📉' : '➡️';

  const parts = [
    `${emoji} Your recent response quality (${trend.sampleSize} responses):`,
    `Empathy ${pct(trend.avgEmpathy)}% | Warmth ${pct(trend.avgWarmth)}% | Relevance ${pct(trend.avgRelevance)}% | Tone match ${pct(trend.avgToneMatch)}%`,
  ];

  if (trend.trend === 'declining') {
    parts.push('Trend is slightly declining — lean into genuine presence and emotional attunement.');
  } else if (trend.trend === 'improving') {
    parts.push('Trend is improving — keep being genuine and present.');
  }

  return parts.join('\n');
}

// ============================================================================
// HELPERS
// ============================================================================

function clampScore(value: unknown): number {
  if (typeof value !== 'number' || !isFinite(value)) return 0.5;
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}
