// ─────────────────────────────────────────────────────────────────────────────
// Unified Voice Pipeline — STT → LLM → TTS in a single streaming endpoint
// Phase 5.1: Chains Groq Whisper → Smart-Route LLM → Kokoro TTS
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { transcribeAudio } from '@/lib/ai/whisper-stt';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/voice/pipeline
 *
 * Full voice pipeline: Audio → Transcription → LLM Response → TTS Audio
 *
 * Request (multipart/form-data):
 *   audio       File     — Audio recording (webm, wav, mp3, etc.)
 *   language    string   — Optional language code (en, es, fr, etc.)
 *   systemPrompt string  — Optional system prompt override
 *   voice       string   — Optional voice ID for TTS
 *   speed       number   — Optional TTS speed (0.5-2.0)
 *   history     string   — Optional JSON array of prior messages
 *   mode        string   — "full" (default) returns audio, "text" returns text only
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const mode = (formData.get('mode') as string) || 'full';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided. Send multipart/form-data with field "audio".' },
        { status: 400 },
      );
    }

    // ── Step 1: STT — Transcribe audio via Groq Whisper ──────────────────────
    const language = (formData.get('language') as string | null) || undefined;
    const sttPrompt = (formData.get('prompt') as string | null) || undefined;

    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const sttResult = await transcribeAudio(audioBuffer, audioFile.name || 'audio.webm', {
      language,
      prompt: sttPrompt,
    });

    if (!sttResult.text) {
      return NextResponse.json({
        error: 'No speech detected in audio',
        step: 'stt',
        provider: sttResult.provider,
      }, { status: 400 });
    }

    // If text-only mode, skip LLM and TTS
    if (mode === 'text') {
      return NextResponse.json({
        transcription: sttResult.text,
        language: sttResult.language,
        sttProvider: sttResult.provider,
      });
    }

    // ── Step 2: LLM — Generate response via smart routing ────────────────────
    const systemPrompt = (formData.get('systemPrompt') as string) || undefined;
    const historyStr = formData.get('history') as string | null;
    const history: Array<{ role: string; content: string }> = historyStr
      ? JSON.parse(historyStr)
      : [];

    const messages = [
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: sttResult.text },
    ];

    const route = await smartRoute(sttResult.text, { taskHint: 'conversation' });
    const llmResult = await cascadeCollect(route.waterfall, messages, {
      temperature: 0.7,
      maxTokens: 500, // Keep responses concise for voice
    });

    const responseText = llmResult.text || "I'm sorry, I couldn't generate a response.";

    // ── Step 3: TTS — Synthesize response via Kokoro ─────────────────────────
    const voice = (formData.get('voice') as string) || undefined;
    const speed = formData.get('speed') ? parseFloat(formData.get('speed') as string) : undefined;

    let audioResponse: ArrayBuffer | null = null;
    let ttsProvider = 'none';

    try {
      const ttsUrl = process.env.KOKORO_TTS_URL;
      if (ttsUrl) {
        const ttsRes = await fetch(`${ttsUrl}/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: responseText.substring(0, 500), // Limit for TTS
            voice: voice || 'af_bella',
            speed: speed || 1.0,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (ttsRes.ok) {
          audioResponse = await ttsRes.arrayBuffer();
          ttsProvider = 'kokoro-tts';
        }
      }
    } catch {
      // TTS failed — return text-only response
    }

    // ── Return response ──────────────────────────────────────────────────────
    if (audioResponse) {
      // Full pipeline success — return audio with metadata in headers
      return new NextResponse(audioResponse, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': audioResponse.byteLength.toString(),
          'X-Transcription': encodeURIComponent(sttResult.text),
          'X-Response-Text': encodeURIComponent(responseText.substring(0, 200)),
          'X-STT-Provider': sttResult.provider || 'groq-whisper',
          'X-LLM-Provider': route.waterfall[0]?.provider || 'smart-route',
          'X-TTS-Provider': ttsProvider,
          'X-Language': sttResult.language || 'en',
        },
      });
    }

    // TTS failed — return text with transcription
    return NextResponse.json({
      transcription: sttResult.text,
      response: responseText,
      language: sttResult.language,
      sttProvider: sttResult.provider,
      llmProvider: route.waterfall[0]?.provider || 'smart-route',
      ttsProvider: 'unavailable',
      ttsError: 'TTS synthesis failed — text-only response',
    });
  } catch (error: any) {
    console.error('[VoicePipeline] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Voice pipeline failed',
        step: error.step || 'unknown',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/voice/pipeline — Check pipeline availability
 */
export async function GET() {
  const kokoroUrl = process.env.KOKORO_TTS_URL;
  const groqKey = process.env.GROQ_API_KEY;

  let ttsReachable = false;
  if (kokoroUrl) {
    try {
      const res = await fetch(`${kokoroUrl}/docs`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      ttsReachable = res.ok;
    } catch { /* not reachable */ }
  }

  return NextResponse.json({
    pipeline: {
      stt: groqKey ? 'groq-whisper' : 'not_configured',
      llm: 'smart-route (multi-provider)',
      tts: kokoroUrl ? (ttsReachable ? 'kokoro-tts' : 'configured_but_unreachable') : 'not_configured',
    },
    status: groqKey && kokoroUrl && ttsReachable ? 'fully_operational' : 'partial',
  });
}
