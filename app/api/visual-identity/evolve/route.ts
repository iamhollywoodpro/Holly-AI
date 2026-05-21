import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { evolveVisualIdentity } from '@/lib/visual/visual-identity-engine';

/**
 * POST /api/visual-identity/evolve
 * Trigger a visual identity evolution. Called by background tasks
 * after conversations to keep Holly's visual state current.
 */
export async function POST(req: NextRequest) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { dominantEmotion, energyLevel, warmthLevel, playfulnessLevel,
    assertivenessLevel, trajectory, relationshipDepth, trustScore,
    collaborationCount, personalityStyle, learningProgress } = body;

  const result = await evolveVisualIdentity(user.id, {
    dominantEmotion,
    energyLevel,
    warmthLevel,
    playfulnessLevel,
    assertivenessLevel,
    trajectory,
    relationshipDepth,
    trustScore,
    collaborationCount,
    personalityStyle,
    learningProgress,
  });

  return NextResponse.json({
    state: result.state,
    evolution: {
      trigger: result.evolution.trigger,
      significance: result.evolution.significance,
      timestamp: result.evolution.timestamp,
    },
  });
}
