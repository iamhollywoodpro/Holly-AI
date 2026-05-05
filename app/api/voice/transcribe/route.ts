/**
 * POST /api/voice/transcribe
 *
 * Phase 4C: Real Whisper STT endpoint.
 * Free-only provider chain:
 *   1. Groq Whisper (whisper-large-v3-turbo — free, fast, no limits)
 * Browser Web Speech API removed — server-side Whisper only.
 *
 * Accepts multipart/form-data with:
 *   audio        File   — required, any Whisper-supported format
 *   language     string — optional ISO-639-1 code (en, es, fr, …)
 *   prompt       string — optional context hint
 *   segments     string — "true" to include timestamped segments
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { transcribeAudio, getSTTStatus } from '@/lib/ai/whisper-stt';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided. Send multipart/form-data with field "audio".' },
        { status: 400 }
      );
    }

    const language  = (formData.get('language')  as string | null) || undefined;
    const prompt    = (formData.get('prompt')    as string | null) || undefined;
    const segments  = formData.get('segments') === 'true';

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await transcribeAudio(buffer, audioFile.name || 'audio.webm', {
      language,
      prompt,
      includeSegments: segments,
    });

    // If Groq not configured or no speech detected, return a clear error.
    if (!result.text) {
      return NextResponse.json({
        success: false,
        error: 'No speech detected. Ensure GROQ_API_KEY is set in Coolify.',
        setup: getSTTStatus(),
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      text: result.text,
      language: result.language,
      provider: result.provider,
      durationMs: result.durationMs,
      ...(result.segments ? { segments: result.segments } : {}),
    });

  } catch (error: any) {
    console.error('[Voice Transcribe] Error:', error);

    // Return a structured error the frontend can handle
    return NextResponse.json(
      {
        error: error.message || 'Transcription failed',
        code: error.status || 500,
      },
      { status: error.status || 500 }
    );
  }
}

// GET: return STT status/health
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json(getSTTStatus());
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
