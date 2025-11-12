import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/consciousness/record-experience
 * Record a new experience for HOLLY's consciousness
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      experience,
      significance,
      emotionalImpact,
      relatedConcepts,
      lessons,
      futureImplications,
    } = body;

    if (!experience) {
      return NextResponse.json(
        { error: 'Experience text required' },
        { status: 400 }
      );
    }

    const hollyExperience = await prisma.hollyExperience.create({
      data: {
        userId: user.id,
        experience,
        significance: significance || 0.5,
        emotionalImpact: emotionalImpact || 0.5,
        relatedConcepts: relatedConcepts || [],
        lessons: lessons || [],
        futureImplications: futureImplications || [],
      },
    });

    console.log('[Experience] ✅ Recorded experience:', hollyExperience.id);
    return NextResponse.json({
      success: true,
      experience: hollyExperience,
      message: 'Experience recorded successfully',
    });
  } catch (error) {
    console.error('Error recording experience:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record experience',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/consciousness/record-experience
 * Get recent experiences
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const experiences = await prisma.hollyExperience.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      experiences,
      message: `Retrieved ${experiences.length} experiences`,
    });
  } catch (error) {
    console.error('Error retrieving experiences:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve experiences',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
