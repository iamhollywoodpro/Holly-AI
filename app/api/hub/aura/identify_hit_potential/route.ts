/**
 * POST /api/hub/aura/identify_hit_potential
 *
 * Score a song's commercial hit potential using market trends and audience modeling.
 * Auth: Bearer holly_xxxx | x-api-key: holly_xxxx | x-hub-key: <HOLLY_HUB_API_KEY>
 *
 * Required:  { title, genre }
 * Optional:  { artist, lyrics, targetMarket, releaseDate, similarArtists, streamingPlatforms }
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { writeLog, newRequestId, startTimer } from '@/lib/hub/logger';
import { checkHubRateLimit } from '@/lib/hub/rate-limit';
import { identifyHitPotential } from '@/lib/hub/tools/aura-engine';
import type { IdentifyHitPotentialInput } from '@/lib/hub/types';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const elapsed   = startTimer();

  const auth = await guardHubRequest(req);
  if (!isAuthSuccess(auth)) return auth.response;

  const rl = checkHubRateLimit(auth.userId, 'aura');
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${Math.ceil(rl.resetInMs / 1000)}s.`, code: 'RATE_LIMITED', requestId },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    );
  }

  let body: IdentifyHitPotentialInput;
  try { body = await req.json() as IdentifyHitPotentialInput; }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, error: '"title" is required' }, { status: 400 });
  }
  if (!body.genre?.trim()) {
    return NextResponse.json({ ok: false, error: '"genre" is required' }, { status: 400 });
  }

  try {
    const data     = await identifyHitPotential(body);
    const duration = elapsed();

    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'aura', action: 'identify_hit_potential',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration, status: 'success', statusCode: 200,
      inputSize: JSON.stringify(body).length,
      outputSize: JSON.stringify(data).length,
    });

    return NextResponse.json({
      ok: true, tool: 'aura', action: 'identify_hit_potential',
      requestId, timestamp: new Date().toISOString(), duration, data,
    }, {
      headers: {
        'X-RateLimit-Remaining-RPM': String(rl.remainingRpm),
        'X-RateLimit-Remaining-RPD': String(rl.remainingRpd),
        'X-Request-Id':              requestId,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Hit potential analysis failed';
    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'aura', action: 'identify_hit_potential',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration: elapsed(), status: 'error', statusCode: 500, errorMsg: msg,
      inputSize: JSON.stringify(body).length, outputSize: 0,
    });
    return NextResponse.json({ ok: false, error: msg, requestId }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    action:      'identify_hit_potential',
    tool:        'aura',
    method:      'POST',
    endpoint:    '/api/hub/aura/identify_hit_potential',
    description: 'Score a song\'s commercial hit potential using market trends, genre analysis, and audience preference modeling.',
    rateLimit:   { rpm: 20, rpd: 200 },
    requiredFields: ['title', 'genre'],
    optionalFields: ['artist', 'lyrics', 'targetMarket', 'releaseDate', 'similarArtists', 'streamingPlatforms'],
    scoring:     { hitScore: '0–100 integer', verdict: 'high (≥70) | medium (40–69) | low (<40)', confidence: '0.0–1.0' },
    example: {
      request: {
        title: 'Midnight Drive', genre: 'synthpop',
        artist: 'Nova', targetMarket: 'US mainstream',
        similarArtists: ['The Weeknd', 'Dua Lipa', 'Tame Impala'],
      },
      response: {
        ok: true, tool: 'aura', action: 'identify_hit_potential',
        data: {
          hitScore: 78, verdict: 'high', confidence: 0.81,
          marketAnalysis: { genreTrend: 'rising', audienceMatch: 84, platformFit: { Spotify: 88, TikTok: 72, 'Apple Music': 83, YouTube: 76 }, seasonality: 'performs best spring/summer', competitionLevel: 'medium' },
          strengths:   ['Anthemic chorus structure', 'Strong genre alignment with trending synthwave revival', 'TikTok-ready hook duration (8s)'],
          weaknesses:  ['Market saturation in synth-pop lane', 'Lyrics could be more specific/visual'],
          opportunities: ['Sync licensing for TV drama soundtracks', 'TikTok dance challenge potential with the drop', 'Remix potential for EDM crossover'],
          comparables:   [{ title: 'Blinding Lights', artist: 'The Weeknd', reason: 'Similar 80s synth palette and anthemic structure' }],
          recommendation: 'Release late spring (April–May) to capitalize on genre timing. Prioritize TikTok activation with a focused hook clip campaign. Consider a Spotify editorial pitch to synthwave playlists.',
        },
      },
    },
    curlExample: `curl -X POST https://holly.nexamusicgroup.com/api/hub/aura/identify_hit_potential \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{"title":"Midnight Drive","genre":"synthpop","targetMarket":"US mainstream","similarArtists":["The Weeknd","Dua Lipa"]}'`,
  });
}
