import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { ensureUserExists } from '@/lib/auth/ensure-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/experiences?limit=10
 * Get recent experiences for the consciousness system
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in database
    const user = await ensureUserExists();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent experiences from memory stream
    const experiences = await prisma.hollyExperience.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        primaryEmotion: true,
        emotionalImpact: true,
        timestamp: true,
        type: true,
      },
    });

    return NextResponse.json({
      success: true,
      experiences,
      count: experiences.length,
    });

  } catch (error) {
    console.error('Experiences API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
