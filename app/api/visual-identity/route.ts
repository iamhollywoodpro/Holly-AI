import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/visual-identity
 * Get Holly's current visual identity for the authenticated user.
 * Returns both the raw state and a rendering context for the frontend.
 */
export async function GET() {
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

  const identity = await prisma.visualIdentity.findUnique({
    where: { userId: user.id },
  });

  if (!identity) {
    return NextResponse.json({
      initialized: false,
      message: 'Visual identity will be created on first interaction',
    });
  }

  return NextResponse.json({
    initialized: true,
    state: {
      primary: { h: identity.primaryHue, s: identity.primarySaturation, l: identity.primaryLightness },
      secondary: { h: identity.secondaryHue, s: identity.secondarySaturation, l: identity.secondaryLightness },
      accent: { h: identity.accentHue, s: 0.8, l: 0.65 },
      style: identity.style,
      complexity: identity.complexity,
      animationSpeed: identity.animationSpeed,
      symmetry: identity.symmetry,
      expressiveness: identity.expressiveness,
      glowIntensity: identity.glowIntensity,
      particleDensity: identity.particleDensity,
      formRigidity: identity.formRigidity,
      relationshipDepth: identity.relationshipDepth,
      trustGlow: identity.trustGlow,
      collaborationMarks: identity.collaborationMarks,
    },
    generationCount: identity.generationCount,
    lastEvolutionEvent: identity.lastEvolutionEvent,
    lastEvolvedAt: identity.lastEvolvedAt,
  });
}
