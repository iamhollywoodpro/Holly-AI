import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Music generation API - Stub (TODO: Implement with Prisma storage)
const SUNO_API_KEY = process.env.SUNO_API_KEY;
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, duration = 30 } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // TODO: Implement music generation with SUNO or HuggingFace
    // TODO: Save to Prisma database

    return NextResponse.json({
      success: false,
      message: 'Music generation temporarily disabled during migration',
      error: 'Feature being migrated to new infrastructure'
    }, { status: 503 });

  } catch (error) {
    console.error('Music generation error:', error);
    return NextResponse.json(
      { error: 'Music generation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
