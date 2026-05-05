/**
 * POST /api/audio/holly-analyze — Phase 9B: HOLLY Audio Brain
 *
 * Professional audio analysis endpoint. HOLLY gives mix/master/production
 * feedback at the level of a seasoned audio engineer.
 *
 * Request:
 *   { audioUrl, fileName, userQuestion, analysisMode, transcript? }
 *
 * Response:
 *   { ok: true, analysis: AudioBrainResult }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeAudio, type AudioAnalysisMode } from '@/lib/audio/holly-audio-brain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      audioUrl,
      fileName    = 'audio-file',
      userQuestion = 'Analyze this audio track',
      analysisMode = 'full',
      transcript,
    } = body;

    const VALID_MODES: AudioAnalysisMode[] = ['full', 'mix', 'master', 'music_theory', 'production', 'compare', 'quick'];
    const mode: AudioAnalysisMode = VALID_MODES.includes(analysisMode) ? analysisMode : 'full';

    const analysis = await analyzeAudio({
      audioUrl,
      fileName,
      userQuestion,
      analysisMode: mode,
      transcript,
    });

    return NextResponse.json({ ok: true, analysis });

  } catch (error: unknown) {
    console.error('[Audio Brain] Error:', error);
    return NextResponse.json(
      { error: 'Audio analysis failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint:    'POST /api/audio/holly-analyze',
    phase:       '9B',
    description: "HOLLY's deep audio intelligence — professional mix, master, and music theory analysis",
    modes: {
      full:         'Complete analysis — music theory + mix + mastering + creative opinion',
      mix:          'Mixing focus — frequency balance, stereo field, dynamics, FX',
      master:       'Mastering focus — LUFS, peak, DR, streaming readiness',
      music_theory: 'Music theory — key, chords, tempo, arrangement, genre',
      production:   'Production focus — sound design, arrangement, creative choices',
      compare:      'Compare to professional reference standards',
      quick:        'Fast high-level summary',
    },
    request: {
      audioUrl:     'string — public URL to audio file (optional)',
      fileName:     'string — name of the file',
      userQuestion: 'string — what specifically do you want to know?',
      analysisMode: 'AudioAnalysisMode (default: full)',
      transcript:   'string — optional pre-computed transcript',
    },
  });
}
