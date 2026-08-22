/**
 * /api/music/studio-tracks — Music Hub generated-song library (2026-08-21).
 *
 * Persists Holly-engine songs (ACE-Step renders) so a refresh doesn't lose
 * them. Stores the full recipe (lyrics, seed, style, bpm, length preset) plus
 * the audio itself when compact enough (MP3 ≤ ~11MB base64). WAV full-songs
 * are too large to inline — we keep the deterministic recipe; "Re-render ·
 * Same Seed" recovers the exact render.
 *
 * GET    → list the user's saved songs (newest first, no audio payloads)
 * POST   → save a song
 * DELETE → remove by id (?id=)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/** ~11MB of base64 (≈8MB binary) — the MP3 ceiling for a 4:00 320k song. */
const MAX_AUDIO_CHARS = 15_000_000;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const songs = await prisma.studioSong.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, style: true, engine: true, lengthPreset: true,
        bpm: true, duration: true, format: true, seed: true, liked: true,
        lyrics: true, coverUrl: true, audioStored: true, createdAt: true,
      },
    });
    return NextResponse.json({ success: true, songs });
  } catch (e) {
    console.error('[StudioTracks API] GET failed:', e);
    return NextResponse.json({ error: 'Failed to load songs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      title, style, engine = 'holly', lengthPreset = 'full', bpm,
      duration, format = 'mp3', seed, liked = false,
      lyrics, coverUrl, audioDataUri,
    } = body ?? {};

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    if (lyrics && typeof lyrics !== 'string') {
      return NextResponse.json({ error: 'invalid lyrics' }, { status: 400 });
    }

    // Inline audio only when compact enough; otherwise the recipe (lyrics +
    // seed + style + duration) recovers the render deterministically.
    let audioBase64: string | null = null;
    if (typeof audioDataUri === 'string' && audioDataUri.startsWith('data:audio/')) {
      audioBase64 = audioDataUri.length <= MAX_AUDIO_CHARS ? audioDataUri : null;
    }

    const song = await prisma.studioSong.create({
      data: {
        userId, title,
        style: typeof style === 'string' ? style : null,
        engine: String(engine),
        lengthPreset: ['full', 'reel', 'commercial'].includes(lengthPreset) ? lengthPreset : 'full',
        bpm: typeof bpm === 'number' ? Math.round(bpm) : null,
        duration: typeof duration === 'number' ? duration : null,
        format: format === 'wav' ? 'wav' : 'mp3',
        seed: typeof seed === 'number' ? Math.round(seed) : null,
        liked: !!liked,
        lyrics: typeof lyrics === 'string' ? lyrics : null,
        coverUrl: typeof coverUrl === 'string' ? coverUrl : null,
        audioBase64,
        audioStored: audioBase64 != null,
      },
      select: { id: true, audioStored: true },
    });
    return NextResponse.json({ success: true, song });
  } catch (e) {
    console.error('[StudioTracks API] POST failed:', e);
    return NextResponse.json({ error: 'Failed to save song' }, { status: 500 });
  }
}

/** Fetch a single song's audio payload (kept out of the list call). */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const song = await prisma.studioSong.findFirst({
      where: { id: String(id), userId },
      select: { audioBase64: true, audioStored: true },
    });
    if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({
      success: true,
      audioDataUri: song.audioBase64 ?? null,
      audioStored: song.audioStored,
    });
  } catch (e) {
    console.error('[StudioTracks API] PATCH failed:', e);
    return NextResponse.json({ error: 'Failed to load audio' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await prisma.studioSong.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[StudioTracks API] DELETE failed:', e);
    return NextResponse.json({ error: 'Failed to delete song' }, { status: 500 });
  }
}
