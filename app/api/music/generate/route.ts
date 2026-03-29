// Music Generation API - v3.1.0
// Always generates full songs using Suno V5_5 (latest model, voice-customised).
// Extend endpoint remains available for adding more sections if desired.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const runtime = 'nodejs';

const SUNO_API_BASE = 'https://api.sunoapi.org';
const SUNO_API_KEY  = process.env.SUNO_API_KEY;

// Default model — V5_5: Suno's newest and best model (as of 2025).
// Voice-customised, superior quality, full song generation.
// Users can override via body.model if desired.
const DEFAULT_MODEL = 'V5_5';

/**
 * Wraps a non-custom prompt into a full-song structure hint so Suno
 * generates a complete track with intro, verse, chorus, bridge, outro.
 */
function wrapPromptForFullSong(prompt: string): string {
  const lower = prompt.toLowerCase();
  // Already has structure tags — don't double-wrap
  if (lower.includes('[verse') || lower.includes('[chorus') || lower.includes('[intro')) {
    return prompt;
  }
  return `${prompt}\n\n[Structure: full song with intro, verse, chorus, bridge, outro]`;
}

/**
 * Wraps user-provided lyrics to ensure they cover a full song structure.
 * If the user didn't include any section tags, we add guidance tags.
 */
function ensureLyricsHaveStructure(lyrics: string): string {
  const lower = lyrics.toLowerCase();
  if (lower.includes('[verse') || lower.includes('[chorus') || lower.includes('[intro')) {
    return lyrics; // Already structured
  }
  // Minimal fallback: treat whole text as verse + chorus repeat
  return `[Verse 1]\n${lyrics}\n\n[Chorus]\n${lyrics}`;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!SUNO_API_KEY) {
      console.error('[Music API] SUNO_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Music generation service not configured' },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      prompt,
      style,
      title,
      instrumental   = false,
      customMode     = false,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      model          = DEFAULT_MODEL,
      negativeTags,
    } = body;

    console.log('[Music API] Generation request:', { prompt: prompt?.slice(0, 80), style, title, instrumental, customMode, model });

    if (!prompt && !customMode) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }
    if (customMode && !instrumental && !prompt) {
      return NextResponse.json({ success: false, error: 'Lyrics/prompt required in custom mode' }, { status: 400 });
    }
    if (customMode && instrumental && (!style || !title)) {
      return NextResponse.json({ success: false, error: 'Style and title are required for instrumental custom mode' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'https://holly.nexamusicgroup.com';

    // ── Build Suno request ──────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sunoRequest: Record<string, any> = {
      instrumental,
      model,
      callBackUrl: `${baseUrl}/api/music/callback`,
    };

    if (customMode) {
      // Custom mode: prompt is used as exact lyrics, style & title required for vocal tracks
      sunoRequest.customMode = true;

      if (style)  sunoRequest.style = style;
      if (title)  sunoRequest.title = title;

      // When user provides lyrics, ensure they have full-song structure
      if (prompt && !instrumental) {
        sunoRequest.prompt = ensureLyricsHaveStructure(prompt);
      }

      if (vocalGender)           sunoRequest.vocalGender           = vocalGender;
      if (styleWeight != null)   sunoRequest.styleWeight           = styleWeight;
      if (weirdnessConstraint != null) sunoRequest.weirdnessConstraint = weirdnessConstraint;
      if (negativeTags)          sunoRequest.negativeTags          = negativeTags;
    } else {
      // Non-custom mode: Suno auto-generates lyrics from the prompt.
      // We wrap the prompt with a full-song structure instruction so Suno
      // produces a complete track (intro → verse → chorus → bridge → outro).
      sunoRequest.customMode = false;
      sunoRequest.prompt     = wrapPromptForFullSong(prompt);
    }

    console.log('[Music API] Calling Suno API:', { ...sunoRequest, prompt: sunoRequest.prompt?.slice(0, 100) });

    const response = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(sunoRequest),
    });

    const data = await response.json();
    console.log('[Music API] Suno response:', data);

    if (!response.ok || data.code !== 200) {
      console.error('[Music API] Suno error:', data);
      return NextResponse.json(
        { success: false, error: data.msg || 'Failed to generate music' },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true, data: data.data });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Music API] Error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
