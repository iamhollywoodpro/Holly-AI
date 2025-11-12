import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Music video generation API - Stub (TODO: Implement with Prisma storage)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { songId, style } = body;

    if (!songId) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    // TODO: Implement music video generation
    // TODO: Save to Prisma database

    return NextResponse.json({
      success: false,
      message: 'Music video generation temporarily disabled during migration',
      error: 'Feature being migrated to new infrastructure'
    }, { status: 503 });

  } catch (error) {
    console.error('Music video generation error:', error);
    return NextResponse.json(
      { error: 'Music video generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
