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
    console.log('[Experiences API] GET request started');
    
    const { userId: clerkUserId } = await auth();
    console.log('[Experiences API] Clerk userId:', clerkUserId || 'NONE');
    
    if (!clerkUserId) {
      console.error('[Experiences API] No Clerk userId - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in database
    console.log('[Experiences API] Calling ensureUserExists...');
    const user = await ensureUserExists();
    console.log('[Experiences API] ensureUserExists result:', user ? `User ${user.id}` : 'NULL');

    if (!user) {
      console.error('[Experiences API] User not found after ensureUserExists');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    console.log('[Experiences API] Fetching experiences with limit:', limit);

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

    console.log('[Experiences API] ✅ Found', experiences.length, 'experiences');
    return NextResponse.json({
      success: true,
      experiences,
      count: experiences.length,
    });

  } catch (error) {
    console.error('[Experiences API] ❌ CRITICAL ERROR:');
    console.error('[Experiences API] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[Experiences API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Experiences API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
