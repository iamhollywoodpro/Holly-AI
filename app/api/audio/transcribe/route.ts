/**
 * POST /api/audio/transcribe
 *
 * Phase 4C: Whisper STT — URL-based transcription variant.
 * Accepts JSON body with { audioUrl, language?, prompt?, segments? }
 * or multipart/form-data with { audio: File, ... }
 *
 * Provider chain: Groq Whisper (free). Browser Web Speech API removed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { transcribeAudio, transcribeFromUrl, getSTTStatus } from '@/lib/ai/whisper-stt';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // ── multipart/form-data (file upload) ─────────────────────────────────────
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File | null;

      if (!audioFile) {
        return NextResponse.json({ error: 'No audio file in form data' }, { status: 400 });
      }

      const language       = (formData.get('language')  as string | null) || undefined;
      const prompt         = (formData.get('prompt')    as string | null) || undefined;
      const includeSegs    = formData.get('segments') === 'true';

      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const result = await transcribeAudio(buffer, audioFile.name || 'audio.webm', {
        language, prompt, includeSegments: includeSegs,
      });

      if (!result.text) {
        return NextResponse.json({ success: false, error: 'No speech detected. Ensure GROQ_API_KEY is set in Coolify.', setup: getSTTStatus() }, { status: 503 });
      }

      return NextResponse.json({
        success: true,
        transcription: {
          text: result.text,
          language: result.language,
          confidence: 0.95,
          provider: result.provider,
          durationMs: result.durationMs,
          ...(result.segments ? { segments: result.segments } : {}),
        },
      });
    }

    // ── JSON body (URL-based) ─────────────────────────────────────────────────
    const body = await request.json() as {
      audioUrl?: string;
      language?: string;
      prompt?: string;
      segments?: boolean;
    };

    const { audioUrl, language, prompt, segments } = body;

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'audioUrl is required in JSON body, or send multipart/form-data with "audio" field' },
        { status: 400 }
      );
    }

    const result = await transcribeFromUrl(audioUrl, undefined, {
      language, prompt, includeSegments: segments,
    });

    if (!result.text) {
      return NextResponse.json({ success: false, error: 'No speech detected. Ensure GROQ_API_KEY is set in Coolify.', setup: getSTTStatus() }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      transcription: {
        text: result.text,
        language: result.language,
        confidence: 0.95,
        provider: result.provider,
        durationMs: result.durationMs,
        ...(result.segments ? { segments: result.segments } : {}),
      },
    });

  } catch (error: any) {
    console.error('[Audio Transcribe] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Transcription failed' },
      { status: error.status || 500 }
    );
  }
}

// GET: status
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json(getSTTStatus());
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
