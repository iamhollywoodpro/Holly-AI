/**
 * POST /api/feedback — RLHF-style message feedback (Phase 6B)
 * GET  /api/feedback — return feedback stats for the current user
 *
 * Accepts thumbs_up / thumbs_down on any assistant message.
 * Persists to ResponseFeedback and immediately nudges TasteProfile:
 *   - thumbs_up  → gentle positive nudge on tone/verbosity/technical
 *   - thumbs_down → gentle negative nudge on those same dimensions
 *
 * This is the training-data collection layer: every ✅/❌ becomes a
 * labelled (prompt, response, label) pair that the Phase 6C pipeline
 * will export as fine-tune JSONL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      type,               // 'thumbs_up' | 'thumbs_down'
      messageId,          // front-end message id (string, not DB id)
      conversationId,
      hollyResponse,      // text of the assistant message being rated
      userMessage,        // the user turn that preceded it
      model,              // which model generated it
    } = body;

    if (!type || !['thumbs_up', 'thumbs_down'].includes(type)) {
      return NextResponse.json({ error: 'type must be thumbs_up or thumbs_down' }, { status: 400 });
    }

    const dbUser = await getOrCreateUser(userId);
    const uid = dbUser.id;

    const isPositive = type === 'thumbs_up';
    const sentiment  = isPositive ? 'positive' : 'negative';
    const score      = isPositive ? 0.8 : -0.8;

    // ── 1. Persist ResponseFeedback record ───────────────────────────────────
    const record = await prisma.responseFeedback.create({
      data: {
        userId:        uid,
        conversationId: conversationId || null,
        messageId:     messageId || null,
        feedbackType:  type,
        sentiment,
        sentimentScore: score,
        hollyResponse:  (hollyResponse || '').slice(0, 2000),
        context: {
          userMessage: (userMessage || '').slice(0, 500),
          model:       model || 'unknown',
          source:      'chat_ui_button',
        },
        lessonLearned: isPositive
          ? 'This response style worked well — reinforce it'
          : 'This response missed the mark — adjust style',
        applied: false,
      },
    });

    // ── 2. Nudge TasteProfile (small gradient step) ───────────────────────────
    // We only nudge if we have a response to analyse.
    // Direction: +0.04 toward detected style on thumbs_up, -0.04 on thumbs_down
    if (hollyResponse) {
      await nudgeTasteProfile(uid, hollyResponse, isPositive);
    }

    console.log(`[Feedback] ${isPositive ? '👍' : '👎'} user=${uid} | record=${record.id}`);

    return NextResponse.json({ ok: true, id: record.id, sentiment });
  } catch (err) {
    console.error('[Feedback POST]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(userId);

    const [total, positive, negative, recent] = await Promise.all([
      prisma.responseFeedback.count({ where: { userId: dbUser.id } }),
      prisma.responseFeedback.count({ where: { userId: dbUser.id, sentiment: 'positive' } }),
      prisma.responseFeedback.count({ where: { userId: dbUser.id, sentiment: 'negative' } }),
      prisma.responseFeedback.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true, feedbackType: true, sentiment: true,
          createdAt: true, lessonLearned: true,
        },
      }),
    ]);

    return NextResponse.json({
      total,
      positive,
      negative,
      approvalRate: total > 0 ? Math.round((positive / total) * 100) : null,
      recent,
    });
  } catch (err) {
    console.error('[Feedback GET]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ─── Taste nudge helper ───────────────────────────────────────────────────────

/**
 * Apply a small gradient step to TasteProfile based on response characteristics.
 * This is a simple heuristic — real RLHF would use a reward model, but this
 * directional nudge is far better than nothing and builds the right data loop.
 */
async function nudgeTasteProfile(
  userId: string,
  response: string,
  isPositive: boolean
): Promise<void> {
  try {
    const existing = await prisma.tasteProfile.findUnique({ where: { userId } });
    if (!existing) return; // No profile yet — will be created on first TasteSignal

    const step = isPositive ? 0.04 : -0.04;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));

    // Heuristic detection of response characteristics
    const wordCount   = response.split(/\s+/).length;
    const hasCode     = /```/.test(response);
    const hasEmoji    = /[\u{1F300}-\u{1FAFF}]/u.test(response);
    const isLong      = wordCount > 200;
    const hasBullets  = /^[\-\*•]/m.test(response);
    const isFormal    = /\b(therefore|furthermore|however|consequently)\b/i.test(response);

    const updates: Partial<{
      verbosity: number;
      technical: number;
      emoji: number;
      tone: number;
    }> = {};

    if (isLong)     updates.verbosity  = clamp(existing.verbosity  + step);
    if (hasCode)    updates.technical  = clamp(existing.technical  + step);
    if (hasEmoji)   updates.emoji      = clamp(existing.emoji      + step);
    if (isFormal)   updates.tone       = clamp(existing.tone       - step); // formal = lower tone score

    if (Object.keys(updates).length > 0) {
      await prisma.tasteProfile.update({
        where: { userId },
        data: {
          ...updates,
          signalCount: { increment: 1 },
          lastUpdated: new Date(),
        },
      });
    }
  } catch (err) {
    // Non-critical — log and continue
    console.warn('[Feedback] Taste nudge failed:', err);
  }
}
