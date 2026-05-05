// User Behavior Analytics — uses Clerk auth (no userId in body needed)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Accept optional body params but don't require userId in body
    let timeframe = '30d';
    try {
      const body = await req.json();
      if (body?.timeframe) timeframe = body.timeframe;
    } catch { /* no body is fine */ }

    // ── Date range ────────────────────────────────────────────────────────────
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeframe] || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ── Query DB — all wrapped in try/catch so a missing table never 500s ─────
    let conversations: { id: string; createdAt: Date; updatedAt: Date }[] = [];
    let messages: { id: string; role: string; createdAt: Date }[] = [];
    let musicTracks: { id: string }[] = [];
    let projects:    { id: string }[] = [];

    try {
      [conversations, messages, musicTracks, projects] = await Promise.all([
        prisma.conversation.findMany({
          where: { userId, createdAt: { gte: startDate } },
          select: { id: true, createdAt: true, updatedAt: true },
        }),
        prisma.message.findMany({
          where: { conversation: { userId }, createdAt: { gte: startDate } },
          select: { id: true, role: true, createdAt: true },
        }),
        prisma.musicTrack.findMany({
          where: { userId, uploadedAt: { gte: startDate } },
          select: { id: true },
        }).catch(() => []),
        prisma.project.findMany({
          where: { userId, createdAt: { gte: startDate } },
          select: { id: true },
        }).catch(() => []),
      ]);
    } catch (dbErr: any) {
      console.warn('[Analytics] DB query partial failure:', dbErr?.message);
      // Return graceful defaults rather than a 500
    }

    // ── Metrics ───────────────────────────────────────────────────────────────
    const totalMessages      = messages.length;
    const userMessages       = messages.filter(m => m.role === 'user').length;
    const assistantMessages  = messages.filter(m => m.role === 'assistant').length;

    const sessions = conversations.map(c => ({
      duration: (c.updatedAt.getTime() - c.createdAt.getTime()) / 1000 / 60,
    }));
    const avgSessionDuration = sessions.length > 0
      ? Math.round(sessions.reduce((a, s) => a + s.duration, 0) / sessions.length)
      : 0;

    const engagementScore = Math.min(100, (totalMessages / days) * 10);
    const engagement = engagementScore > 70 ? 'high' : engagementScore > 30 ? 'medium' : 'low';

    const featureUsage: Record<string, number> = {
      chat:             totalMessages,
      music_generation: musicTracks.length,
      projects:         projects.length,
    };
    const topFeatures = Object.entries(featureUsage)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);

    return NextResponse.json({
      success:       true,
      userId,
      timeframe,
      // Top-level shortcuts the chat interface reads directly
      totalMessages,
      messageCount:  totalMessages,
      streak:        0,
      currentStreak: 0,
      memoriesCount: 0,
      // Full analysis object
      analysis: {
        totalSessions: conversations.length,
        totalMessages,
        userMessages,
        assistantMessages,
        avgSessionDuration: `${avgSessionDuration}m`,
        topFeatures,
        engagement,
        engagementScore: Math.round(engagementScore),
        creativeOutputs: {
          musicTracks: musicTracks.length,
          projects:    projects.length,
        },
        activityTrend: totalMessages > 0 ? 'active' : 'inactive',
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    // Always return 200 with empty data — this is non-critical UI stats
    return NextResponse.json({
      success:      true,
      totalMessages: 0,
      messageCount:  0,
      streak:        0,
      memoriesCount: 0,
    });
  }
}
