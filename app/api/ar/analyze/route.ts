/**
 * HOLLY A&R Analysis API
 * POST /api/ar/analyze
 *
 * Give HOLLY a track URL and she responds as a professional A&R executive:
 *   - Billboard Hit Rating (1-100)
 *   - Breakdown: production, songwriting, commercial appeal, originality, performance
 *   - Signing decision
 *   - Full A&R letter
 *
 * Internally: calls AURA's analysis engine for technical scores,
 * then layers a senior A&R persona on top via Groq LLM.
 *
 * GET /api/ar/analyze — returns endpoint documentation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runARAnalysis } from '@/lib/ar/holly-ar-engine';

export const runtime    = 'nodejs';
export const maxDuration = 60; // Vercel Hobby cap — use Dokploy for unlimited // 2 minutes — AURA + LLM pass

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    endpoint:    'POST /api/ar/analyze',
    description: 'HOLLY A&R Analysis — professional music industry evaluation',
    version:     'AR-v1.0',
    poweredBy:   'AURA analysis engine + HOLLY A&R persona (Groq llama-3.3-70b)',
    fields: {
      required: ['audioUrl', 'fileName'],
      optional: ['trackTitle', 'artistName', 'genre', 'lyricsText', 'referenceTrack', 'userQuestion'],
    },
    returns: {
      billboardRating: 'Overall score 1-100 + breakdown (production, songwriting, commercial, originality, performance)',
      auraScores:      'Technical audio scores from AURA engine',
      firstListen:     'A&R gut reaction — first 30 seconds',
      strengths:       'What is genuinely working',
      concerns:        'What needs work (specific, technical)',
      dealBreakers:    'Must-fix items for a deal',
      marketFit:       'Current market placement and platform strategy',
      comparables:     'Real comparable artists for pitch/marketing',
      nextSteps:       'Concrete action plan',
      signingDecision: 'Sign immediately / Sign with revisions / Pass — keep watching / Hard pass',
      arLetter:        'Full professional A&R letter to artist/manager',
      contextBlock:    'Formatted analysis for HOLLY chat injection',
    },
  });
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const {
      audioUrl,
      fileName,
      trackTitle,
      artistName,
      genre,
      lyricsText,
      referenceTrack,
      userQuestion,
    } = body;

    // Validate
    if (!audioUrl || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: audioUrl, fileName' },
        { status: 400 }
      );
    }

    console.log(`[A&R API] Analyzing: "${trackTitle || fileName}" by ${artistName || 'Unknown'}`);

    const result = await runARAnalysis({
      userId,
      audioUrl,
      fileName,
      trackTitle,
      artistName,
      genre,
      lyricsText,
      referenceTrack,
      userQuestion,
    });

    console.log(`[A&R API] Billboard Rating: ${result.billboardRating.overall}/100 — ${result.signingDecision}`);

    return NextResponse.json({ ok: true, analysis: result });

  } catch (error) {
    console.error('[A&R API] Error:', error);
    return NextResponse.json(
      { error: 'A&R analysis failed', details: String(error) },
      { status: 500 }
    );
  }
}
