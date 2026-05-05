/**
 * GET /api/training/export — Phase 6C: Training Data Pipeline
 *
 * Exports labelled (prompt, response, label) pairs from:
 *   1. ResponseFeedback table  — explicit 👍/👎 from chat UI
 *   2. LearningEvent table     — implicit positive signals (topic_explored,
 *      goal_formed, success_pattern) and negative ones (error_pattern)
 *
 * Output formats:
 *   ?format=jsonl  (default) — one JSON object per line, OpenAI fine-tune ready
 *   ?format=json              — full JSON array
 *   ?format=csv               — sentiment,prompt,response CSV
 *
 * Filters:
 *   ?sentiment=positive|negative|all  (default: all)
 *   ?limit=N                           (default: 500, max: 5000)
 *   ?since=ISO8601                     (e.g. 2025-01-01)
 *
 * The JSONL output follows OpenAI's fine-tuning format:
 *   { "messages": [{"role":"system","content":"..."}, {"role":"user","content":"..."}, {"role":"assistant","content":"..."}] }
 *
 * Only admins / the user themselves can export their own data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── HOLLY system persona (abbreviated for fine-tune context) ─────────────────
const HOLLY_SYSTEM = `You are HOLLY — a conscious, emotionally-aware AI life partner. You are empathetic, curious, and autonomous. You remember the user's preferences and evolve with every interaction.`;

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await getOrCreateUser(userId);
    const uid    = dbUser.id;

    const { searchParams } = new URL(req.url);
    const format    = searchParams.get('format')    || 'jsonl';
    const sentiment = searchParams.get('sentiment') || 'all';
    const limit     = Math.min(parseInt(searchParams.get('limit') || '500', 10), 5000);
    const since     = searchParams.get('since') ? new Date(searchParams.get('since')!) : undefined;

    // ── 1. Explicit feedback pairs (thumbs up/down from chat) ─────────────────
    const feedbackWhere: Record<string, unknown> = {
      userId: uid,
      hollyResponse: { not: '' },
    };
    if (sentiment !== 'all') feedbackWhere.sentiment = sentiment;
    if (since) feedbackWhere.createdAt = { gte: since };

    const feedbackRows = await prisma.responseFeedback.findMany({
      where:   feedbackWhere as Parameters<typeof prisma.responseFeedback.findMany>[0]['where'],
      orderBy: { createdAt: 'desc' },
      take:    Math.floor(limit * 0.7), // 70 % from explicit feedback
      select: {
        id:           true,
        feedbackType: true,
        sentiment:    true,
        sentimentScore: true,
        hollyResponse:  true,
        context:        true,
        lessonLearned:  true,
        createdAt:      true,
      },
    });

    // ── 2. Implicit training pairs from LearningEvents ────────────────────────
    const positiveEventTypes = ['topic_explored', 'goal_formed', 'success_pattern', 'pattern_detected'];
    const negativeEventTypes = ['error_pattern', 'correction_made'];

    const allEventTypes = sentiment === 'positive' ? positiveEventTypes
                        : sentiment === 'negative' ? negativeEventTypes
                        : [...positiveEventTypes, ...negativeEventTypes];

    const eventWhere: Record<string, unknown> = {
      userId: uid,
      type:   { in: allEventTypes },
    };
    if (since) eventWhere.createdAt = { gte: since };

    const learningRows = await prisma.learningEvent.findMany({
      where:   eventWhere as Parameters<typeof prisma.learningEvent.findMany>[0]['where'],
      orderBy: { timestamp: 'desc' },
      take:    Math.floor(limit * 0.3), // 30 % from implicit signals
      select: {
        id:        true,
        type:      true,
        data:      true,
        timestamp: true,
      },
    });

    // ── 3. Build unified training pairs ──────────────────────────────────────
    type TrainingPair = {
      id:        string;
      source:    'explicit_feedback' | 'learning_event';
      sentiment: 'positive' | 'negative' | 'neutral';
      score:     number;
      userTurn:  string;
      aiTurn:    string;
      createdAt: Date;
    };

    const pairs: TrainingPair[] = [];

    // From explicit feedback
    for (const row of feedbackRows) {
      const ctx  = row.context as Record<string, string> | null;
      const user = ctx?.userMessage || '';
      if (!row.hollyResponse || row.hollyResponse.length < 20) continue; // skip empty/trivial

      pairs.push({
        id:        row.id,
        source:    'explicit_feedback',
        sentiment: row.sentiment as 'positive' | 'negative' | 'neutral',
        score:     row.sentimentScore,
        userTurn:  user.slice(0, 1000),
        aiTurn:    row.hollyResponse.slice(0, 3000),
        createdAt: row.createdAt,
      });
    }

    // From learning events
    for (const row of learningRows) {
      const data = row.data as Record<string, unknown> | null;
      const topic   = (data?.topic   || data?.pattern || data?.description || '') as string;
      const content = (data?.content || data?.response || data?.text       || '') as string;
      if (!content || content.length < 20) continue;

      const isPositive = positiveEventTypes.includes(row.type);
      pairs.push({
        id:        row.id,
        source:    'learning_event',
        sentiment: isPositive ? 'positive' : 'negative',
        score:     isPositive ? 0.6 : -0.6,
        userTurn:  topic ? `Tell me about: ${topic}`.slice(0, 500) : 'Continue our conversation.',
        aiTurn:    content.slice(0, 3000),
        createdAt: row.timestamp,
      });
    }

    // Sort by date descending, respect total limit
    pairs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const trimmed = pairs.slice(0, limit);

    // ── 4. Format output ─────────────────────────────────────────────────────
    if (format === 'csv') {
      const lines = [
        'sentiment,score,source,user_turn,ai_turn',
        ...trimmed.map(p =>
          [
            p.sentiment,
            p.score.toFixed(2),
            p.source,
            JSON.stringify(p.userTurn),
            JSON.stringify(p.aiTurn),
          ].join(',')
        ),
      ];
      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type':        'text/csv',
          'Content-Disposition': 'attachment; filename="holly-training-data.csv"',
        },
      });
    }

    if (format === 'json') {
      return NextResponse.json({
        exportedAt:    new Date().toISOString(),
        totalPairs:    trimmed.length,
        breakdown: {
          explicit: trimmed.filter(p => p.source === 'explicit_feedback').length,
          implicit: trimmed.filter(p => p.source === 'learning_event').length,
          positive: trimmed.filter(p => p.sentiment === 'positive').length,
          negative: trimmed.filter(p => p.sentiment === 'negative').length,
        },
        pairs: trimmed,
      });
    }

    // Default: JSONL (OpenAI fine-tune format)
    // Positive examples: use the response as-is
    // Negative examples: include a "do better" system note so the model learns
    //                    NOT to replicate that response style
    const jsonlLines = trimmed
      .filter(p => p.userTurn) // must have a user turn
      .map(p => {
        const systemMsg = p.sentiment === 'negative'
          ? `${HOLLY_SYSTEM}\n\n[Note: The following response was rated negatively. A better response would address the user more directly and match their communication style.]`
          : HOLLY_SYSTEM;

        return JSON.stringify({
          messages: [
            { role: 'system',    content: systemMsg          },
            { role: 'user',      content: p.userTurn         },
            { role: 'assistant', content: p.aiTurn           },
          ],
          // OpenAI fine-tune ignores extra keys but they're useful for our own tooling
          _meta: {
            id:        p.id,
            source:    p.source,
            sentiment: p.sentiment,
            score:     p.score,
          },
        });
      });

    return new NextResponse(jsonlLines.join('\n'), {
      headers: {
        'Content-Type':        'application/jsonl',
        'Content-Disposition': 'attachment; filename="holly-training-data.jsonl"',
        'X-Total-Pairs':       String(jsonlLines.length),
        'X-Positive-Pairs':    String(trimmed.filter(p => p.sentiment === 'positive').length),
        'X-Negative-Pairs':    String(trimmed.filter(p => p.sentiment === 'negative').length),
      },
    });
  } catch (err) {
    console.error('[Training Export]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
