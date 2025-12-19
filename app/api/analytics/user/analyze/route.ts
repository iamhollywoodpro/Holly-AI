// PHASE 1: REAL User Behavior Analytics
// Analyzes actual user activity from database
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { userId, timeframe = '30d' } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }

    // Calculate date range
    const now = new Date();
    const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeframe] || 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Query real user data
    const [user, conversations, messages, musicTracks, projects] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, createdAt: true }
      }),
      prisma.conversation.findMany({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        select: { id: true, createdAt: true, updatedAt: true }
      }),
      prisma.message.findMany({
        where: {
          conversation: { userId },
          createdAt: { gte: startDate }
        },
        select: { id: true, role: true, createdAt: true }
      }),
      prisma.musicTrack.findMany({
        where: {
          userId,
          uploadedAt: { gte: startDate }
        },
        select: { id: true, uploadedAt: true }
      }),
      prisma.project.findMany({
        where: {
          userId,
          createdAt: { gte: startDate }
        },
        select: { id: true, createdAt: true }
      })
    ]);

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Calculate metrics
    const totalConversations = conversations.length;
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;

    // Calculate session patterns
    const sessions = conversations.map(c => ({
      start: c.createdAt,
      end: c.updatedAt,
      duration: (c.updatedAt.getTime() - c.createdAt.getTime()) / 1000 / 60 // minutes
    }));

    const avgSessionDuration = sessions.length > 0
      ? Math.round(sessions.reduce((acc, s) => acc + s.duration, 0) / sessions.length)
      : 0;

    // Determine top features
    const featureUsage: Record<string, number> = {
      chat: totalMessages,
      music_generation: musicTracks.length,
      projects: projects.length
    };

    const topFeatures = Object.entries(featureUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    // Engagement level
    const engagementScore = Math.min(100, (totalMessages / days) * 10);
    let engagement = 'low';
    if (engagementScore > 70) engagement = 'high';
    else if (engagementScore > 30) engagement = 'medium';

    const result = {
      success: true,
      userId: user.id,
      userName: user.name,
      timeframe,
      analysis: {
        totalSessions: totalConversations,
        totalMessages,
        userMessages,
        assistantMessages,
        avgSessionDuration: `${avgSessionDuration}m`,
        topFeatures,
        engagement,
        engagementScore: Math.round(engagementScore),
        creativeOutputs: {
          musicTracks: musicTracks.length,
          projects: projects.length
        },
        activityTrend: totalMessages > 0 ? 'active' : 'inactive'
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('User behavior analysis error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
