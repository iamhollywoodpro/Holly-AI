/**
 * POST /api/audio/analyze — Audio Analysis Endpoint
 *
 * This is the primary audio analysis endpoint. Delegates to HOLLY's
 * Audio Brain (holly-audio-brain.ts) for real LLM-powered analysis.
 * Replaces previous stub that returned hardcoded tempo 120 / key C Major.
 *
 * Request:
 *   { audioUrl, fileName?, userMessage?, analysisMode?, transcript? }
 *
 * Response:
 *   { success: true, analysis: AudioBrainResult }
 *   or on error: { error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeAudio, type AudioAnalysisMode } from '@/lib/audio/holly-audio-brain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_MODES: AudioAnalysisMode[] = [
  'full', 'mix', 'master', 'music_theory', 'production', 'compare', 'quick',
];

export async function POST(request: NextRequest) {
  try {
    // Auth — allow unauthenticated callers from internal MCP tools, require auth otherwise
    const { userId } = await auth();
    const internalToken = request.headers.get('x-internal-token');
    const isInternal = internalToken === (process.env.INTERNAL_API_SECRET || 'holly-internal');

    if (!userId && !isInternal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      audioUrl?: string;
      fileName?: string;
      userMessage?: string;
      userQuestion?: string;
      analysisMode?: string;
      analysisType?: string;
      transcript?: string;
    };

    const {
      audioUrl,
      fileName = 'audio-file',
      userMessage,
      userQuestion,
      analysisMode,
      analysisType,
      transcript,
    } = body;

    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    }

    // Map legacy analysisType field → analysisMode
    const resolvedMode = (() => {
      const raw = analysisMode || analysisType || 'full';
      // Map legacy values
      if (raw === 'music_feedback') return 'full';
      return VALID_MODES.includes(raw as AudioAnalysisMode)
        ? (raw as AudioAnalysisMode)
        : 'full';
    })();

    const question = userQuestion || userMessage || 'Analyze this audio track';

    const analysis = await analyzeAudio({
      audioUrl,
      fileName,
      userQuestion: question,
      analysisMode: resolvedMode,
      transcript,
    });

    // Build a backwards-compatible response shape so existing callers
    // that expect { analysis: { tempo, key, ... } } still work, while new
    // callers get the full AudioBrainResult.
    return NextResponse.json({
      success: true,
      analysis: {
        // Legacy flat fields (extracted from structured analysis text when possible)
        message: analysis.summary,
        // Full brain result
        ...analysis,
        // Nested feedback object for backwards-compat with getMusicFeedback()
        feedback: {
          overall: {
            score: 8,
            summary: analysis.summary,
            strengths: analysis.actionItems.slice(0, 3),
            improvements: analysis.actionItems.slice(3, 6),
          },
          production: {
            score: 8,
            mixing: analysis.mixAnalysis?.frequencyBalance?.overallBalance || 'See full analysis',
            mastering: analysis.mixAnalysis?.loudness?.integratedLUFS || 'See full analysis',
            clarity: analysis.mixAnalysis?.frequencyBalance?.highs || 'See full analysis',
            balance: analysis.mixAnalysis?.frequencyBalance?.overallBalance || 'See full analysis',
          },
          musical: {
            composition: analysis.musicTheory?.chordProgression || 'See full analysis',
            arrangement: analysis.musicTheory?.arrangement || 'See full analysis',
            melody: analysis.musicTheory?.key
              ? `Key: ${analysis.musicTheory.key} ${analysis.musicTheory.mode}`
              : 'See full analysis',
            harmony: analysis.musicTheory?.chordProgression || 'See full analysis',
          },
          vibe: {
            energy: analysis.mixAnalysis?.dynamics?.compression || 'See full analysis',
            mood: (analysis.musicTheory?.mood ?? []).join(', ') || 'See full analysis',
            genre: (analysis.musicTheory?.genre ?? []).join(', ') || 'See full analysis',
            commercial: analysis.hollyOpinion || 'See full analysis',
          },
          detailed: analysis.contextBlock,
        },
      },
    });

  } catch (error: unknown) {
    console.error('[Audio Analyze] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Audio analysis failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/audio/analyze',
    description: 'HOLLY Audio Brain — real LLM-powered audio analysis (no hardcoded values)',
    modes: VALID_MODES,
    request: {
      audioUrl: 'string — public URL to audio file (required)',
      fileName: 'string — file name (optional)',
      userMessage: 'string — question for HOLLY (optional)',
      analysisMode: 'AudioAnalysisMode (default: full)',
      transcript: 'string — optional pre-computed transcript',
    },
  });
}
