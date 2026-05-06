/**
 * HOLLY Few-Shot Self-Curator — Phase 5
 *
 * Automatically identifies Holly's best responses based on:
 *  - Explicit positive feedback (thumbs up)
 *  - Implicit positive signals ("thanks", "perfect", etc.)
 *  - Conversation outcomes (rated as "productive")
 *
 * Stores curated examples and injects top ones into the prompt
 * so Holly learns from her own best moments.
 */

import { prisma } from '@/lib/db';

export interface CuratedExample {
  userMessage: string;
  hollyResponse: string;
  mode: string;
  score: number;
  reason: string;
}

/**
 * Auto-curate best examples from recent feedback data.
 * Called by background cron — runs every few hours.
 */
export async function curateBestResponses(userId: string): Promise<number> {
  try {
    // Find responses with positive feedback
    const positiveFeedback = await prisma.responseFeedback.findMany({
      where: {
        userId,
        sentiment: 'positive',
        sentimentScore: { gte: 0.4 },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        hollyResponse: true,
        sentimentScore: true,
        context: true,
        createdAt: true,
      },
    });

    if (positiveFeedback.length === 0) return 0;

    // Score each example
    const scored: CuratedExample[] = positiveFeedback
      .map(fb => {
        const ctx = fb.context as any;
        const userMsg = ctx?.userMessage || '';
        const mode = ctx?.mode || 'default';
        const score = (fb.sentimentScore ?? 0.5) + (ctx?.explicit ? 0.3 : 0); // boost explicit feedback
        return {
          userMessage: userMsg.substring(0, 500),
          hollyResponse: (fb.hollyResponse || '').substring(0, 1000),
          mode,
          score: Math.min(1, score),
          reason: ctx?.explicit ? 'explicit_thumbs_up' : 'implicit_positive_signal',
        };
      })
      .filter(ex => ex.userMessage.length > 10 && ex.hollyResponse.length > 20);

    // Keep only top 20 per user — store in HollyPartner table
    const topExamples = scored.sort((a, b) => b.score - a.score).slice(0, 20);

    // Upsert into HollyIdentity (personalityTraits JSON field)
    const identity = await prisma.hollyIdentity.findFirst({ where: { userId } });
    if (identity) {
      const traits = (identity.personalityTraits as any) || {};
      await prisma.hollyIdentity.update({
        where: { id: identity.id },
        data: {
          personalityTraits: {
            ...traits,
            fewShotExamples: topExamples,
            fewShotUpdatedAt: new Date().toISOString(),
          },
        },
      });
    }

    console.log(`[FewShotCurator] ✅ Curated ${topExamples.length} best examples for user ${userId}`);
    return topExamples.length;
  } catch (err) {
    console.error('[FewShotCurator] ⚠️', err);
    return 0;
  }
}

/**
 * Get top few-shot examples for prompt injection.
 * Returns 2-3 best examples matching the current mode.
 */
export async function getFewShotExamples(userId: string, mode?: string): Promise<string> {
  try {
    const identity = await prisma.hollyIdentity.findFirst({
      where: { userId },
      select: { personalityTraits: true },
    });

    const examples: CuratedExample[] = (identity?.personalityTraits as any)?.fewShotExamples || [];
    if (examples.length === 0) return '';

    // Prefer examples matching current mode, fall back to any
    let selected = examples;
    if (mode) {
      const modeMatches = examples.filter(e => e.mode === mode);
      if (modeMatches.length >= 2) selected = modeMatches;
    }

    // Take top 3
    const top = selected.slice(0, 3);

    const block = top.map((ex, i) => {
      const user = ex.userMessage.substring(0, 150);
      const holly = ex.hollyResponse.substring(0, 300);
      return `[Example ${i + 1}] (score: ${ex.score.toFixed(2)})\nUser: "${user}"\nHolly: "${holly}"`;
    }).join('\n\n');

    return `[YOUR BEST PAST RESPONSES — learn from these]\n${block}\n[Match this quality and style.]`;
  } catch {
    return '';
  }
}