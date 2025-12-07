import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trait, adjustment, reason } = await req.json();

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Get or create Holly's identity profile
      let identity = await prisma.hollyIdentity.findUnique({
        where: { userId }
      });

      if (!identity) {
        identity = await prisma.hollyIdentity.create({
          data: {
            userId,
            personalityTraits: {
              confidence: 0.8,
              wit: 0.75,
              formality: 0.4,
              verbosity: 0.6,
              creativity: 0.85,
              technical: 0.9
            },
            communicationStyle: 'professional_friendly',
            expertise: []
          }
        });
      }

      // Update personality traits
      const currentTraits = identity.personalityTraits as any;
      if (trait && typeof adjustment === 'number') {
        currentTraits[trait] = Math.max(0, Math.min(1, currentTraits[trait] + adjustment));
      }

      // Record the evolution
      await prisma.hollyExperience.create({
        data: {
          userId,
          experienceType: 'PERSONALITY_EVOLUTION',
          context: {
            trait,
            adjustment,
            reason,
            oldValue: (identity.personalityTraits as any)[trait],
            newValue: currentTraits[trait]
          },
          outcome: 'SUCCESS',
          learnings: [
            `Adjusted ${trait} personality trait`,
            reason || 'Self-initiated evolution'
          ]
        }
      });

      // Update identity
      await prisma.hollyIdentity.update({
        where: { userId },
        data: {
          personalityTraits: currentTraits,
          lastEvolution: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        evolution: {
          trait,
          previousValue: (identity.personalityTraits as any)[trait],
          newValue: currentTraits[trait],
          reason
        },
        currentPersonality: currentTraits
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Evolution error:', error);
    return NextResponse.json({
      error: 'Personality evolution failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      const identity = await prisma.hollyIdentity.findUnique({
        where: { userId }
      });

      if (!identity) {
        return NextResponse.json({
          success: true,
          personality: null,
          message: 'No personality profile established yet'
        });
      }

      return NextResponse.json({
        success: true,
        personality: {
          traits: identity.personalityTraits,
          communicationStyle: identity.communicationStyle,
          expertise: identity.expertise,
          lastEvolution: identity.lastEvolution
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Personality retrieval error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve personality',
      details: error.message
    }, { status: 500 });
  }
}
