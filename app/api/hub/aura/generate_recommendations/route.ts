/**
 * POST /api/hub/aura/generate_recommendations
 *
 * Generate improvement recommendations for a song (chords, lyrics, production).
 * Auth: Bearer holly_xxxx | x-api-key: holly_xxxx | x-hub-key: <HOLLY_HUB_API_KEY>
 *
 * Required:  { title }
 * Optional:  { artist, genre, lyrics, currentKey, currentBpm, targetMood, targetAudience, areas }
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { writeLog, newRequestId, startTimer } from '@/lib/hub/logger';
import { checkHubRateLimit } from '@/lib/hub/rate-limit';
import { generateRecommendations } from '@/lib/hub/tools/aura-engine';
import type { GenerateRecommendationsInput } from '@/lib/hub/types';

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

  let body: GenerateRecommendationsInput;
  try { body = await req.json() as GenerateRecommendationsInput; }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, error: '"title" is required' }, { status: 400 });
  }

  try {
    const data     = await generateRecommendations(body);
    const duration = elapsed();

    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'aura', action: 'generate_recommendations',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration, status: 'success', statusCode: 200,
      inputSize: JSON.stringify(body).length,
      outputSize: JSON.stringify(data).length,
    });

    return NextResponse.json({
      ok: true, tool: 'aura', action: 'generate_recommendations',
      requestId, timestamp: new Date().toISOString(), duration, data,
    }, {
      headers: {
        'X-RateLimit-Remaining-RPM': String(rl.remainingRpm),
        'X-RateLimit-Remaining-RPD': String(rl.remainingRpd),
        'X-Request-Id':              requestId,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Recommendation generation failed';
    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'aura', action: 'generate_recommendations',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration: elapsed(), status: 'error', statusCode: 500, errorMsg: msg,
      inputSize: JSON.stringify(body).length, outputSize: 0,
    });
    return NextResponse.json({ ok: false, error: msg, requestId }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    action:      'generate_recommendations',
    tool:        'aura',
    method:      'POST',
    endpoint:    '/api/hub/aura/generate_recommendations',
    description: 'Generate actionable recommendations for song improvement including chord progressions, melody ideas, and lyric edits.',
    rateLimit:   { rpm: 20, rpd: 200 },
    requiredFields: ['title'],
    optionalFields: ['artist', 'genre', 'lyrics', 'currentKey', 'currentBpm', 'targetMood', 'targetAudience', 'areas'],
    areasEnum: ['melody', 'chords', 'lyrics', 'structure', 'production'],
    example: {
      request: {
        title: 'Midnight Drive', genre: 'synthpop',
        currentKey: 'G minor', currentBpm: 128,
        targetMood: 'anthemic', targetAudience: 'Gen-Z pop',
        areas: ['chords', 'lyrics', 'production'],
      },
      response: {
        ok: true, tool: 'aura', action: 'generate_recommendations',
        data: {
          recommendations:   [{ area: 'chords', priority: 'high', suggestion: 'Add a IV–V pivot before the chorus', rationale: 'Creates tension-release that drives chorus impact', example: 'Cm – D# – A# – F → Gm' }],
          chordProgressions: [{ name: 'Neo-Soul Shift', chords: ['Gm','Eb','Bb','F'], genre: 'synthpop', mood: 'anthemic', description: 'Borrowing from neo-soul adds emotional depth to the genre palette' }],
          melodyIdeas:       ['Open with an ascending minor third on "drive"', 'Use a syncopated dotted-eighth rhythm in the pre-chorus'],
          lyricsEdits:       [{ original: 'chasing something', suggested: 'chasing echoes down this neon spine', reason: 'More vivid imagery — pairs with the synth aesthetic' }],
          productionTips:    ['Side-chain the pads to the kick for a pumping feel', 'Layer a Juno-106 patch an octave above the lead', 'Automate filter cutoff rising into each chorus'],
          summary:           'Focus on the chord pivot before the chorus and adding specific imagery to the lyrics for maximum commercial impact.',
        },
      },
    },
    curlExample: `curl -X POST https://holly.nexamusicgroup.com/api/hub/aura/generate_recommendations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{"title":"Midnight Drive","genre":"synthpop","areas":["chords","lyrics"]}'`,
  });
}
