/**
 * POST /api/study/trigger — Phase 14: On-demand study session
 *
 * Lets users manually trigger a study session, either on a specific topic
 * or auto-picked from their learning goals.
 *
 * GET  /api/study/trigger       → user's study stats
 * POST /api/study/trigger       → auto-pick and study highest-priority gap
 * POST /api/study/trigger       → study specific topic { topic, domain }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { studyForUser, getStudyStats } from '@/lib/study/study-scheduler';
import type { LearningDomain } from '@/lib/background-learning/holly-learns';

export const runtime = 'nodejs';
export const dynamic  = 'force-dynamic';

// ─── GET: study stats ─────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get DB user ID from clerk ID
    const { prisma } = await import('@/lib/db');
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stats = await getStudyStats(user.id);
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─── POST: trigger study ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');
    const user = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const topic  = body.topic  as string | undefined;
    const domain = body.domain as LearningDomain | undefined;

    const result = await studyForUser(user.id, topic, domain);

    return NextResponse.json({
      ok: true,
      phase: 14,
      message: result.success
        ? `Studied "${result.topic}" — ${result.insights.length} insights gained (confidence: ${(result.confidence * 100).toFixed(0)}%)`
        : `Study failed: ${result.error}`,
      result,
    });
  } catch (err) {
    console.error('[Study:trigger] Error:', err);
    return NextResponse.json(
      { error: 'Study session failed', details: (err as Error).message },
      { status: 500 },
    );
  }
}
