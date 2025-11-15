import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { ensureUserExists } from '@/lib/auth/ensure-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Consciousness API - Migrated to Clerk + Prisma
 * TODO: Implement full functionality
 */
export async function GET() {
  try {
    console.log('[Identity API] GET request started');
    
    const { userId: clerkUserId } = await auth();
    console.log('[Identity API] Clerk userId:', clerkUserId || 'NONE');
    
    if (!clerkUserId) {
      console.error('[Identity API] No Clerk userId - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in database (fallback for webhook delays)
    console.log('[Identity API] Calling ensureUserExists...');
    const user = await ensureUserExists();
    console.log('[Identity API] ensureUserExists result:', user ? `User ${user.id}` : 'NULL');

    if (!user) {
      console.error('[Identity API] User not found after ensureUserExists');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[Identity API] ✅ Success - returning user data');
    return NextResponse.json({
      success: true,
      message: 'Consciousness system operational',
      user_id: user.id,
    });

  } catch (error) {
    console.error('[Identity API] ❌ CRITICAL ERROR:');
    console.error('[Identity API] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[Identity API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[Identity API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user exists in database (fallback for webhook delays)
    const user = await ensureUserExists();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    return NextResponse.json({
      success: true,
      message: 'Request processed',
      user_id: user.id,
    });

  } catch (error) {
    console.error('Consciousness API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
