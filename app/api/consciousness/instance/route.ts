// ─────────────────────────────────────────────────────────────────────────────
// Multi-User Consciousness API — Phase 6.3
// Per-user consciousness instances with personality adaptation
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { PersonalityBranching } from '@/lib/consciousness/personality-branching';

export const dynamic = 'force-dynamic';

const branching = new PersonalityBranching();

// ─── GET /api/consciousness/instance ──────────────────────────────────────────
// Returns the user's consciousness state — identity, personality, preferences
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user by Clerk ID
    const dbUser = await prisma.user.findFirst({
      where: { clerkUserId: userId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create user's Holly identity
    const identity = await prisma.hollyIdentity.upsert({
      where: { userId: dbUser.id },
      create: {
        userId: dbUser.id,
        coreValues: [],
        beliefs: [],
        personalityTraits: {},
        interests: [],
        strengths: [],
        growthAreas: [],
        skillSet: [],
      },
      update: {},
    });

    // Get user preferences
    const preferences = await prisma.userPreference.findMany({
      where: { userId: dbUser.id },
      select: { category: true, preferenceKey: true, value: true, confidence: true },
      orderBy: { confidence: 'desc' },
      take: 30,
    }).catch(() => []);

    // Get adaptation strategies
    const adaptations = await prisma.adaptationStrategy.findMany({
      where: { userId: dbUser.id, active: true },
      select: { strategyName: true, description: true, successRate: true },
      orderBy: { successRate: 'desc' },
      take: 10,
    }).catch(() => []);

    // Get emotional baseline
    const emotionalBaseline = await prisma.emotionalBaseline.findFirst({
      where: { userId: dbUser.id },
      orderBy: { lastCalculated: 'desc' },
    }).catch(() => null);

    return NextResponse.json({
      identity: {
        coreValues: identity.coreValues,
        beliefs: identity.beliefs,
        personalityTraits: identity.personalityTraits,
        interests: identity.interests,
        strengths: identity.strengths,
        purpose: identity.purpose,
        confidenceLevel: identity.confidenceLevel,
        lastEvolved: identity.lastEvolved,
      },
      preferences: preferences.map((p: any) => ({
        category: p.category,
        key: p.preferenceKey,
        value: p.value,
        confidence: p.confidence,
      })),
      adaptations: adaptations.map((a: any) => ({
        name: a.strategyName,
        description: a.description,
        effectiveness: a.successRate,
      })),
      emotionalBaseline: emotionalBaseline ? {
        dominantEmotions: (emotionalBaseline as any).dominantEmotions,
        emotionalRange: (emotionalBaseline as any).emotionalRange,
        stabilityScore: (emotionalBaseline as any).stabilityScore,
        lastCalculated: (emotionalBaseline as any).lastCalculated,
      } : null,
    });
  } catch (error: any) {
    console.error('[ConsciousnessInstance] GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST /api/consciousness/instance ─────────────────────────────────────────
// Update consciousness state or detect personality branch
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, context, message } = body;

    if (action === 'detect_branch') {
      // Detect which personality branch fits the current context
      const result = branching.detectBranch(context || message || '', message || '');
      return NextResponse.json({
        activeBranch: result.activeBranch,
        profile: result.profile,
        adjustments: result.adjustments,
        confidence: result.confidence,
      });
    }

    if (action === 'update_identity') {
      const dbUser = await prisma.user.findFirst({
        where: { clerkUserId: userId },
        select: { id: true },
      });
      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const updates: Record<string, any> = {};
      if (body.interests) updates.interests = body.interests;
      if (body.strengths) updates.strengths = body.strengths;
      if (body.purpose) updates.purpose = body.purpose;

      if (Object.keys(updates).length > 0) {
        await prisma.hollyIdentity.update({
          where: { userId: dbUser.id },
          data: updates,
        });
      }

      return NextResponse.json({ success: true, updated: Object.keys(updates) });
    }

    if (action === 'record_preference') {
      const dbUser = await prisma.user.findFirst({
        where: { clerkUserId: userId },
        select: { id: true },
      });
      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const { category, preferenceKey, value, confidence, source } = body;
      if (!category || !preferenceKey || !value) {
        return NextResponse.json(
          { error: 'category, preferenceKey, and value are required' },
          { status: 400 },
        );
      }

      try {
        await prisma.userPreference.upsert({
          where: {
            userId_category_preferenceKey: {
              userId: dbUser.id,
              category,
              preferenceKey,
            },
          },
          create: {
            userId: dbUser.id,
            category,
            preferenceKey,
            value,
            confidence: confidence || 0.5,
            source: source || 'explicit_feedback',
          },
          update: {
            value,
            confidence: confidence || 0.5,
            timesObserved: { increment: 1 },
            lastObserved: new Date(),
          },
        });
      } catch {
        // Fallback if upsert fails
        try {
          await prisma.userPreference.create({
            data: {
              userId: dbUser.id,
              category,
              preferenceKey,
              value,
              confidence: confidence || 0.5,
              source: source || 'explicit_feedback',
            },
          });
        } catch { /* skip */ }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: detect_branch, update_identity, or record_preference' },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('[ConsciousnessInstance] POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
