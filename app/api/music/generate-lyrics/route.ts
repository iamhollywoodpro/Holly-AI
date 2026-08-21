import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdult } from '@/lib/auth/require-adult';
import { writeLyrics, LANGUAGE_CONFIGS } from '@/lib/music/lyric-brain';

/**
 * POST /api/music/generate-lyrics
 *
 * Multi-language Lyrics Generation — free cascade (Groq Llama 3.3 primary).
 * The writing logic lives in src/lib/music/lyric-brain.ts so the MCP music
 * hub can call it in-process (no HTTP auth round-trip).
 *
 * Body: { theme, style?, mood?, language? }
 */

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // A6: explicit lyrics/content possible — same age gate as chat and images
    const adultGate = await requireAdult();
    if (adultGate instanceof NextResponse) return adultGate;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { theme, style, mood, language = 'english' } = body;

    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme is required' }, { status: 400 });
    }

    console.log(`[Lyrics API] Generating lyrics for theme: "${theme}"`);

    const result = await writeLyrics({ theme, style, mood, language });

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('[Lyrics API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET — return supported languages list
export async function GET() {
  const languages = Object.entries(LANGUAGE_CONFIGS).map(([key, cfg]) => ({
    code: key,
    name: cfg.name,
    nativeName: cfg.nativeName,
  }));

  return NextResponse.json({ success: true, languages });
}
