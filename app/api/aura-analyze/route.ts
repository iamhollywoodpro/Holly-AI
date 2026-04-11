/**
 * AURA A&R Analysis API
 * Real AI-powered music analysis via the smart router.
 * Routes to 'creative' task: OpenRouter Mistral → Groq Llama-3.3-70B → NVIDIA Mistral → CF Kimi
 * No mock data. No external Python worker needed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function analyzeWithAI(params: {
  trackTitle?: string;
  artistName?: string;
  genre?: string;
  lyrics?: string;
  audioUrl?: string;
}): Promise<object> {
  const contextParts: string[] = [];
  if (params.trackTitle) contextParts.push(`Track: "${params.trackTitle}"`);
  if (params.artistName) contextParts.push(`Artist: ${params.artistName}`);
  if (params.genre)      contextParts.push(`Genre: ${params.genre}`);
  if (params.audioUrl)   contextParts.push(`Audio URL: ${params.audioUrl}`);
  if (params.lyrics)     contextParts.push(`\nLyrics:\n${params.lyrics.slice(0, 2000)}`);

  const context = contextParts.join('\n');

  const prompt = `You are AURA, an elite A&R analyst with 20+ years in the music industry. You have signed artists to major labels, predicted hit songs, and worked with Billboard charting acts.

Analyze this track submission and provide a professional A&R assessment. Be direct, specific, and honest — like a real A&R executive writing an internal memo.

${context}

Respond ONLY with valid JSON matching this exact structure:
{
  "overall_score": <0-100 integer>,
  "production_quality": <0-100 integer>,
  "commercial_viability": <0-100 integer>,
  "artistic_merit": <0-100 integer>,
  "hit_potential": <0-100 integer>,
  "strengths": [<3-4 specific strengths as strings>],
  "weaknesses": [<2-3 honest weaknesses as strings>],
  "recommendations": [<3 actionable industry recommendations as strings>],
  "market_potential": "<one sentence assessment>",
  "target_audience": "<specific demographic description>",
  "genre_fit": "<primary genre / subgenre>",
  "playlist_targets": [<3 specific Spotify/Apple playlist names to target>],
  "similar_artists": [<2-3 comparable artists>],
  "radio_viability": "<High|Medium|Low> - <one sentence reason>",
  "sync_potential": "<High|Medium|Low> - <one sentence reason>",
  "a_and_r_verdict": "<2-3 sentence honest executive verdict>",
  "model_version": "AURA-v3.0"
}`;

  // Route to 'creative' task — OpenRouter Mistral Small → Groq Llama-3.3-70B → NVIDIA Mistral → CF Kimi
  const routeResult = smartRoute(prompt, { taskHint: 'creative' });
  console.log(`[AURA] Routing via ${routeResult.taskType}: ${routeResult.reason}`);

  const { text: content, model: usedModel } = await cascadeCollect(
    routeResult.waterfall,
    [{ role: 'user', content: prompt }],
    { temperature: 0.7, maxTokens: 1024 },
  );

  if (!content) throw new Error('Empty AI response');

  // Strip markdown fences before parsing
  const cleaned = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  return {
    ...parsed,
    model_version: `AURA-v3.0 (${usedModel.displayName})`,
    analyzed_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request — accept both FormData and JSON
    let audioUrl: string | null = null;
    let lyrics: string | null = null;
    let trackTitle: string | null = null;
    let artistName: string | null = null;
    let genre: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      audioUrl    = formData.get('audioUrl') as string;
      lyrics      = formData.get('lyrics') as string;
      trackTitle  = formData.get('trackTitle') as string;
      artistName  = formData.get('artistName') as string;
      genre       = formData.get('genre') as string;
    } else {
      const body = await req.json().catch(() => ({}));
      audioUrl    = body.audioUrl;
      lyrics      = body.lyrics;
      trackTitle  = body.trackTitle;
      artistName  = body.artistName;
      genre       = body.genre;
    }

    if (!audioUrl && !lyrics && !trackTitle) {
      return NextResponse.json(
        { error: 'Provide at least one of: audioUrl, lyrics, or trackTitle' },
        { status: 400 }
      );
    }

    console.log('[AURA] Starting AI analysis...');

    const analysis = await analyzeWithAI({
      trackTitle: trackTitle || undefined,
      artistName: artistName || undefined,
      genre: genre || undefined,
      lyrics: lyrics || undefined,
      audioUrl: audioUrl || undefined,
    });

    console.log('[AURA] AI analysis complete');

    return NextResponse.json({ success: true, analysis });

  } catch (error) {
    console.error('[AURA] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
