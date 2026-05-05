// Music Generation API - v3.2.0
// Generates full songs using: SUNO V5_5 (primary) → Sonauto (fallback) → ACE-Step (last resort)
// Hybrid Studio Mode available at /api/music/hybrid-studio for multi-engine pipeline

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sonautoProvider } from '@/lib/music/sonauto-provider';

export const runtime = 'nodejs';

const SUNO_API_BASE = 'https://api.sunoapi.org';
const SUNO_API_KEY  = process.env.SUNO_API_KEY;
const ACESTEP_URL   = process.env.ACESTEP_MUSIC_URL;

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

    if (!SUNO_API_KEY && !sonautoProvider.isConfigured && !ACESTEP_URL) {
      console.error('[Music API] No music providers configured (SUNO, Sonauto, or ACE-Step)');
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

    // ── Try SUNO V5.5 (primary) ─────────────────────────────────────────────
    if (SUNO_API_KEY) {
      try {
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

        if (response.ok && data.code === 200) {
          return NextResponse.json({ success: true, data: data.data, provider: 'suno' });
        }

        console.warn('[Music API] Suno error, falling back:', data);
      } catch (sunoErr) {
        console.warn('[Music API] Suno fetch failed, falling back:', sunoErr);
      }
    }

    // ── Fallback: Sonauto Melodia v3 (free) ─────────────────────────────────
    if (sonautoProvider.isConfigured) {
      try {
        console.log('[Music API] Calling Sonauto fallback...');

        const sonautoTags = style ? style.split(',').map((s: string) => s.trim()) : [];
        const sonautoResult = await sonautoProvider.generateAndWait({
          prompt: customMode ? (sunoRequest.prompt || prompt) : wrapPromptForFullSong(prompt),
          tags: sonautoTags,
          instrumental,
          num_songs: 1,
        }, 300_000);

        const songPath = sonautoResult.result.song_paths[0];

        return NextResponse.json({
          success: true,
          provider: 'sonauto',
          data: {
            taskId: 'sonauto-direct',
            audioUrl: songPath,
            lyrics: sonautoResult.result.lyrics,
            seed: sonautoResult.result.seed,
            tags: sonautoResult.result.tags,
            audioSize: sonautoResult.audioBuffers[0]?.length,
          },
        });
      } catch (sonautoErr) {
        console.warn('[Music API] Sonauto fallback failed:', sonautoErr);
      }
    }

    // ── Last resort: ACE-Step XL Turbo (self-hosted) ────────────────────────
    if (ACESTEP_URL) {
      try {
        console.log('[Music API] Calling ACE-Step fallback at', ACESTEP_URL);

        const aceBody: Record<string, any> = {
          prompt:      customMode ? (sunoRequest.prompt || prompt) : wrapPromptForFullSong(prompt),
          instrumental,
          duration:    30,
        };
        if (style)  aceBody.style = style;
        if (title)  aceBody.title = title;

        const aceRes = await fetch(ACESTEP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(aceBody),
        });

        const aceData = await aceRes.json();

        if (aceRes.ok) {
          return NextResponse.json({ success: true, data: aceData, provider: 'acestep' });
        }

        console.error('[Music API] ACE-Step error:', aceData);
        return NextResponse.json(
          { success: false, error: aceData.error || 'ACE-Step generation failed' },
          { status: aceRes.status },
        );
      } catch (aceErr) {
        console.error('[Music API] ACE-Step fetch failed:', aceErr);
        return NextResponse.json(
          { success: false, error: 'All music providers unavailable' },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'No music provider available' },
      { status: 503 },
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Music API] Error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
