/**
 * HOLLY Memory API — Phase 9C+
 *
 * Returns all memory data for the authenticated user:
 * - Recent conversations (with summaries)
 * - Taste profile (tone, verbosity, humor, etc.)
 * - Taste signals (learning data points)
 * - Holly experiences (consciousness stream)
 * - Holly goals
 * - Learning patterns
 * - Holly identity snapshot
 * - Emotion log
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find DB user
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, clerkUserId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(req.url);
    const section = url.searchParams.get('section') ?? 'all';
    const searchQuery = url.searchParams.get('q') ?? '';
    const limit = parseInt(url.searchParams.get('limit') ?? '20');

    // ── Conversations ───────────────────────────────────────────────────────
    let conversations: any[] = [];
    if (section === 'all' || section === 'conversations') {
      conversations = await prisma.conversation.findMany({
        where: {
          userId: user.id,
          ...(searchQuery
            ? {
                OR: [
                  { title: { contains: searchQuery, mode: 'insensitive' } },
                  { lastMessagePreview: { contains: searchQuery, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          messageCount: true,
          lastMessagePreview: true,
          pinned: true,
          createdAt: true,
          updatedAt: true,
          summary: {
            select: {
              summary: true,
              keyTopics: true,
              keyPoints: true,
              actionItems: true,
              outcome: true,
            },
          },
        },
      });
    }

    // ── Taste Profile ───────────────────────────────────────────────────────
    let tasteProfile: any = null;
    if (section === 'all' || section === 'taste') {
      tasteProfile = await prisma.tasteProfile.findUnique({
        where: { userId: user.id },
      });
    }

    // ── Taste Signals (recent learning data) ───────────────────────────────
    let tasteSignals: any[] = [];
    if (section === 'all' || section === 'taste') {
      tasteSignals = await prisma.tasteSignal.findMany({
        where: {
          userId: user.id,
          ...(searchQuery
            ? { item: { contains: searchQuery, mode: 'insensitive' } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          category: true,
          item: true,
          signal: true,
          context: true,
          weight: true,
          source: true,
          createdAt: true,
        },
      });
    }

    // ── Experiences (consciousness stream) ──────────────────────────────────
    let experiences: any[] = [];
    if (section === 'all' || section === 'experiences') {
      experiences = await prisma.hollyExperience.findMany({
        where: {
          userId: user.id,
          ...(searchQuery
            ? {
                OR: [
                  { primaryEmotion: { contains: searchQuery, mode: 'insensitive' } },
                  { relatedConcepts: { has: searchQuery } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          significance: true,
          primaryEmotion: true,
          secondaryEmotions: true,
          relatedConcepts: true,
          lessons: true,
          skillsGained: true,
          createdAt: true,
          content: true,
        },
      });
    }

    // ── Goals ───────────────────────────────────────────────────────────────
    let goals: any[] = [];
    if (section === 'all' || section === 'goals') {
      goals = await prisma.hollyGoal.findMany({
        where: { userId: user.id },
        orderBy: [{ status: 'asc' }, { priority: 'desc' }],
        take: 20,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          status: true,
          priority: true,
          targetDate: true,
          createdAt: true,
          completedAt: true,
        },
      });
    }

    // ── Learning Patterns ───────────────────────────────────────────────────
    let learningPatterns: any[] = [];
    if (section === 'all' || section === 'learning') {
      learningPatterns = await prisma.learningPattern.findMany({
        where: searchQuery
          ? { pattern: { contains: searchQuery, mode: 'insensitive' } }
          : {},
        orderBy: { frequency: 'desc' },
        take: 20,
        select: {
          id: true,
          pattern: true,
          category: true,
          frequency: true,
          lastSeen: true,
          confidence: true,
          action: true,
        },
      });
    }

    // ── Holly Identity ──────────────────────────────────────────────────────
    let identity: any = null;
    if (section === 'all' || section === 'identity') {
      identity = await prisma.hollyIdentity.findUnique({
        where: { userId: user.id },
        select: {
          coreValues: true,
          personalityTraits: true,
          interests: true,
          strengths: true,
          growthAreas: true,
          confidenceLevel: true,
          purpose: true,
          updatedAt: true,
        },
      });
    }

    // ── Emotion Log (recent) ────────────────────────────────────────────────
    let emotions: any[] = [];
    if (section === 'all' || section === 'emotions') {
      emotions = await prisma.emotionLog.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
        take: 20,
        select: {
          id: true,
          emotion: true,
          intensity: true,
          trigger: true,
          notes: true,
          timestamp: true,
        },
      });
    }

    // ── Stats ───────────────────────────────────────────────────────────────
    const [totalConversations, totalMessages] = await Promise.all([
      prisma.conversation.count({ where: { userId: user.id } }),
      prisma.message.count({ where: { userId: user.id } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalConversations,
        totalMessages,
        experienceCount: experiences.length,
        goalCount: goals.filter((g) => g.status === 'active').length,
        tasteSignalCount: tasteSignals.length,
      },
      conversations,
      tasteProfile,
      tasteSignals,
      experiences,
      goals,
      learningPatterns,
      identity,
      emotions,
    });
  } catch (error: any) {
    console.error('[Memory API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load memory data', message: error.message },
      { status: 500 },
    );
  }
}
