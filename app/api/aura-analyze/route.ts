/**
 * AURA A&R Analysis API
 *
 * Single Clerk-authenticated endpoint powering all 4 AURA workspace tabs:
 *   task=quick          → Quick A&R scan (scores + verdict)
 *   task=full-analysis  → Deep song structure / melody / lyrics breakdown
 *   task=recommendations → Chord progressions, lyric edits, production tips
 *   task=hit-potential  → Hit score, market analysis, comparables
 *
 * Uses the smart router cascade:
 * creative → OpenRouter Mistral → Groq Llama-3.3-70B → NVIDIA → CF Kimi
 *
 * No Hub API key needed. Clerk session handles auth for internal UI use.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

export const runtime = 'nodejs';
export const maxDuration = 60;

type AuraTask = 'quick' | 'full-analysis' | 'recommendations' | 'hit-potential';

interface AuraParams {
  task: AuraTask;
  trackTitle?: string;
  artistName?: string;
  genre?: string;
  lyrics?: string;
  audioUrl?: string;
}

// ── Build context string shared by all prompts ──────────────────────────────

function buildContext(p: AuraParams): string {
  const parts: string[] = [];
  if (p.trackTitle)  parts.push(`Track: "${p.trackTitle}"`);
  if (p.artistName)  parts.push(`Artist: ${p.artistName}`);
  if (p.genre)       parts.push(`Genre: ${p.genre}`);
  if (p.audioUrl)    parts.push(`Audio URL: ${p.audioUrl}`);
  if (p.lyrics)      parts.push(`\nLyrics:\n${p.lyrics.slice(0, 2000)}`);
  return parts.join('\n');
}

// ── Task-specific prompts ───────────────────────────────────────────────────

function quickPrompt(ctx: string): string {
  return `You are AURA, an elite A&R analyst with 20+ years in the music industry. You have signed artists to major labels, predicted hit songs, and worked with Billboard charting acts.

Analyze this track submission and provide a professional A&R assessment. Be direct, specific, and honest — like a real A&R executive writing an internal memo.

${ctx}

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
  "a_and_r_verdict": "<2-3 sentence honest executive verdict>"
}`;
}

function fullAnalysisPrompt(ctx: string): string {
  return `You are AURA, a professional music analyst with deep expertise in song structure, melody, and lyrical composition.

Perform a detailed analytical breakdown of this track:

${ctx}

Respond ONLY with valid JSON matching this exact structure:
{
  "structure": {
    "sections": [<array of section names in order, e.g. "intro","verse1","pre-chorus","chorus","verse2","bridge","outro">],
    "tempo": "<speed description e.g. 'moderate (110 BPM estimated)'>",
    "timeSignature": "<e.g. '4/4'>",
    "estimatedDuration": "<e.g. '3:24'>"
  },
  "melody": {
    "range": "<vocal range e.g. 'G3–E5'>",
    "complexity": "<simple|moderate|complex>",
    "hooks": [<2-3 specific hook descriptions>],
    "intervals": [<2-3 notable melodic intervals>],
    "key": "<musical key e.g. 'C minor'>",
    "mode": "<e.g. 'aeolian' or 'major'>",
    "chorus": "<one sentence description of the chorus melody>"
  },
  "lyrics": {
    "themes": [<2-4 core themes>],
    "sentiment": "<positive|negative|mixed|neutral>",
    "rhymeScheme": "<e.g. 'ABAB' or 'AABB'>",
    "vocabulary": "<simple|moderate|sophisticated>",
    "wordCount": <estimated integer>,
    "uniqueWords": <estimated integer>,
    "chorus": "<first line of chorus if determinable, else null>"
  },
  "patterns": [<3-4 recurring song patterns>],
  "trends": [<2-3 current genre trends this track aligns with>],
  "overallScore": <0-100 integer>,
  "summary": "<2-3 sentence analytical summary>"
}`;
}

function recommendationsPrompt(ctx: string): string {
  return `You are AURA, a professional music producer and A&R consultant. Provide concrete, actionable improvement recommendations for this track.

${ctx}

Respond ONLY with valid JSON matching this exact structure:
{
  "recommendations": [
    {
      "area": "<e.g. 'Production' | 'Lyrics' | 'Melody' | 'Structure' | 'Mixing'>",
      "priority": "<high|medium|low>",
      "suggestion": "<specific actionable suggestion>",
      "rationale": "<why this will improve the track>",
      "example": "<optional: brief concrete example>"
    }
  ],
  "chordProgressions": [
    {
      "name": "<progression name e.g. 'I–V–vi–IV'>",
      "chords": [<array of chord names e.g. "C","G","Am","F">],
      "genre": "<genre this fits>",
      "mood": "<mood it creates>",
      "description": "<one sentence on how to use it>"
    }
  ],
  "melodyIdeas": [<3-4 specific melody improvement ideas as strings>],
  "lyricsEdits": [
    {
      "original": "<original lyric line or concept>",
      "suggested": "<improved version>",
      "reason": "<why it's better>"
    }
  ],
  "productionTips": [<4-5 specific production/mixing tips as strings>],
  "summary": "<1-2 sentence overall recommendation summary>"
}

Include AT LEAST: 3 recommendations, 2 chord progressions, 2 lyric edits, 4 production tips.`;
}

function hitPotentialPrompt(ctx: string): string {
  return `You are AURA, an A&R data analyst specializing in hit prediction and market analysis. Assess the commercial hit potential of this track with analytical precision.

${ctx}

Respond ONLY with valid JSON matching this exact structure:
{
  "hitScore": <0-100 integer, where 80+ = high potential, 50-79 = medium, below 50 = low>,
  "verdict": "<high|medium|low>",
  "confidence": <0.0-1.0 float>,
  "marketAnalysis": {
    "genreTrend": "<trending up|stable|trending down>",
    "audienceMatch": <0-100 integer>,
    "platformFit": {
      "Spotify": <0-100>,
      "Apple Music": <0-100>,
      "TikTok": <0-100>,
      "YouTube": <0-100>,
      "Radio": <0-100>
    },
    "seasonality": "<best release season e.g. 'Summer' or 'Year-round'>",
    "competitionLevel": "<low|moderate|high|saturated>"
  },
  "strengths": [<3-4 commercial strengths>],
  "weaknesses": [<2-3 commercial weaknesses>],
  "opportunities": [<2-3 market opportunities>],
  "comparables": [
    {
      "title": "<comparable hit song title>",
      "artist": "<artist name>",
      "reason": "<why it's comparable>"
    }
  ],
  "recommendation": "<2-3 sentence strategic recommendation for maximizing commercial success>"
}`;
}

// ── Core AI invocation ──────────────────────────────────────────────────────

async function runAuraTask(params: AuraParams): Promise<{ data: object; model: string }> {
  const ctx = buildContext(params);

  let prompt: string;
  let maxTokens: number;

  switch (params.task) {
    case 'full-analysis':
      prompt = fullAnalysisPrompt(ctx);
      maxTokens = 1200;
      break;
    case 'recommendations':
      prompt = recommendationsPrompt(ctx);
      maxTokens = 1500;
      break;
    case 'hit-potential':
      prompt = hitPotentialPrompt(ctx);
      maxTokens = 1200;
      break;
    case 'quick':
    default:
      prompt = quickPrompt(ctx);
      maxTokens = 1024;
      break;
  }

  const routeResult = smartRoute(prompt, { taskHint: 'creative' });
  console.log(`[AURA:${params.task}] Routing via ${routeResult.taskType}: ${routeResult.reason}`);

  const { text: content, model: usedModel } = await cascadeCollect(
    routeResult.waterfall,
    [{ role: 'user', content: prompt }],
    { temperature: 0.7, maxTokens },
  );

  if (!content) throw new Error('Empty AI response');

  // Strip markdown fences before parsing
  const cleaned = content
    .replace(/^```(?:json)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  return {
    data: {
      ...parsed,
      analyzed_at: new Date().toISOString(),
    },
    model: usedModel.displayName,
  };
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request — accept both FormData (quick tab with file upload) and JSON
    let task: AuraTask = 'quick';
    let audioUrl: string | null = null;
    let lyrics: string | null = null;
    let trackTitle: string | null = null;
    let artistName: string | null = null;
    let genre: string | null = null;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      task        = (formData.get('task') as AuraTask) || 'quick';
      audioUrl    = formData.get('audioUrl') as string;
      lyrics      = formData.get('lyrics') as string;
      trackTitle  = formData.get('trackTitle') as string;
      artistName  = formData.get('artistName') as string;
      genre       = formData.get('genre') as string;
    } else {
      const body  = await req.json().catch(() => ({}));
      task        = body.task || 'quick';
      audioUrl    = body.audioUrl;
      lyrics      = body.lyrics;
      trackTitle  = body.trackTitle;
      artistName  = body.artistName;
      genre       = body.genre;
    }

    // Quick tab can work with just audio/url — other tabs need at least a title
    if (task === 'quick' && !audioUrl && !lyrics && !trackTitle) {
      return NextResponse.json(
        { error: 'Provide at least one of: audioUrl, lyrics, or trackTitle' },
        { status: 400 },
      );
    }
    if (task !== 'quick' && !trackTitle) {
      return NextResponse.json(
        { error: 'Track title is required for this analysis type' },
        { status: 400 },
      );
    }

    console.log(`[AURA] Starting ${task} analysis...`);

    const { data, model } = await runAuraTask({
      task,
      trackTitle:  trackTitle  || undefined,
      artistName:  artistName  || undefined,
      genre:       genre       || undefined,
      lyrics:      lyrics      || undefined,
      audioUrl:    audioUrl    || undefined,
    });

    console.log(`[AURA] ${task} complete via ${model}`);

    return NextResponse.json({
      success: true,
      task,
      analysis: data,
      model: `AURA-v3.0 (${model})`,
    });

  } catch (error) {
    console.error('[AURA] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 },
    );
  }
}
