import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DEBUG ENDPOINT: Check auth state with Clerk
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    return NextResponse.json({
      authenticated: !!userId,
      userId: userId || null,
      message: userId ? 'User authenticated with Clerk' : 'Not authenticated'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Auth check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
