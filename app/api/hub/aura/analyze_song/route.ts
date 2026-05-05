/**
 * POST /api/hub/aura/analyze_song
 *
 * Analyze a song's structure, melody, and lyrics.
 * Auth: Bearer holly_xxxx | x-api-key: holly_xxxx | x-hub-key: <HOLLY_HUB_API_KEY>
 *
 * Required:  { title }
 * Optional:  { artist, genre, lyrics, bpm, key, mood }
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { writeLog, newRequestId, startTimer } from '@/lib/hub/logger';
import { checkHubRateLimit } from '@/lib/hub/rate-limit';
import { analyzeSong } from '@/lib/hub/tools/aura-engine';
import type { AnalyzeSongInput } from '@/lib/hub/types';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const elapsed   = startTimer();

  const auth = await guardHubRequest(req);
  if (!isAuthSuccess(auth)) return auth.response;

  // Rate limit
  const rl = checkHubRateLimit(auth.userId, 'aura');
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${Math.ceil(rl.resetInMs / 1000)}s.`, code: 'RATE_LIMITED', requestId },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    );
  }

  let body: AnalyzeSongInput;
  try { body = await req.json() as AnalyzeSongInput; }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  if (!body.title?.trim()) {
    return NextResponse.json({ ok: false, error: '"title" is required' }, { status: 400 });
  }

  try {
    const data     = await analyzeSong(body);
    const duration = elapsed();

    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'aura', action: 'analyze_song',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration, status: 'success', statusCode: 200,
      inputSize: JSON.stringify(body).length,
      outputSize: JSON.stringify(data).length,
    });

    return NextResponse.json({
      ok: true, tool: 'aura', action: 'analyze_song',
      requestId, timestamp: new Date().toISOString(), duration, data,
    }, {
      headers: {
        'X-RateLimit-Remaining-RPM': String(rl.remainingRpm),
        'X-RateLimit-Remaining-RPD': String(rl.remainingRpd),
        'X-Request-Id':              requestId,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'aura', action: 'analyze_song',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration: elapsed(), status: 'error', statusCode: 500, errorMsg: msg,
      inputSize: JSON.stringify(body).length, outputSize: 0,
    });
    return NextResponse.json({ ok: false, error: msg, requestId }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    action:      'analyze_song',
    tool:        'aura',
    method:      'POST',
    endpoint:    '/api/hub/aura/analyze_song',
    description: 'Analyze a song\'s structure, melody, and lyrics to identify patterns and trends.',
    rateLimit:   { rpm: 20, rpd: 200 },
    requiredFields: ['title'],
    optionalFields: ['artist', 'genre', 'lyrics', 'bpm', 'key', 'mood'],
    example: {
      request: { title: 'Midnight Drive', artist: 'Nova', genre: 'synthpop', bpm: 128, key: 'G minor', mood: 'euphoric' },
      response: {
        ok: true, tool: 'aura', action: 'analyze_song',
        data: {
          structure:    { sections: ['intro','verse','chorus','bridge','outro'], tempo: 'fast', timeSignature: '4/4', estimatedDuration: '3:28' },
          melody:       { range: 'G3–D5', complexity: 'moderate', hooks: ['ascending chorus hook', 'verse synth line'], key: 'G minor', mode: 'aeolian' },
          lyrics:       { themes: ['longing','escape'], sentiment: 'mixed', rhymeScheme: 'ABAB', vocabulary: 'moderate', wordCount: 220, uniqueWords: 110 },
          patterns:     ['8-bar verse loop','hook repeats 3x','post-chorus drop'],
          trends:       ['synthwave revival','nostalgia-pop trending upward'],
          overallScore: 82,
          summary:      'Midnight Drive demonstrates strong commercial synthpop construction with a memorable hook and effective tempo. Genre timing is favorable.',
        },
      },
    },
    curlExample: `curl -X POST https://holly.nexamusicgroup.com/api/hub/aura/analyze_song \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{"title":"Midnight Drive","artist":"Nova","genre":"synthpop","bpm":128}'`,
  });
}
