/**
 * API v1 Guard — Phase 7
 *
 * Call `guardApiKey(req)` at the top of every /api/v1/* handler.
 * Returns { userId, apiKey, remainingRpm, remainingRpd } on success.
 * Returns a NextResponse with the appropriate error status on failure.
 *
 * After the handler finishes, call `logUsage(...)` to record the request.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateApiKey,
  checkRateLimit,
  type ValidatedKey,
  type RateLimitResult,
} from '@/src/lib/api-keys';
import type { ApiKey } from '@prisma/client';

export type GuardSuccess = {
  ok:            true;
  userId:        string;
  apiKey:        ApiKey;
  remainingRpm:  number;
  remainingRpd:  number;
};

export type GuardFailure = NextResponse;

/**
 * Extract the Bearer token from the Authorization header.
 * Accepts:  Authorization: Bearer holly_xxxx
 * Also accepts:  x-api-key: holly_xxxx  (common alternative)
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization') ?? '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const xKey = req.headers.get('x-api-key');
  if (xKey) return xKey.trim();
  return null;
}

/**
 * Full guard: validate key + rate-limit check.
 * Returns GuardSuccess or a pre-built error NextResponse.
 */
export async function guardApiKey(
  req: NextRequest,
): Promise<GuardSuccess | GuardFailure> {
  const rawKey = extractToken(req);

  if (!rawKey) {
    return NextResponse.json(
      {
        error:   'Missing API key',
        hint:    'Pass your key as: Authorization: Bearer holly_xxxx  or  x-api-key: holly_xxxx',
        docs:    'https://holly-ai.dev/docs/api',
      },
      { status: 401 },
    );
  }

  let validated: ValidatedKey | null = null;
  try {
    validated = await validateApiKey(rawKey);
  } catch (err) {
    console.error('[API Guard] validateApiKey error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!validated) {
    return NextResponse.json(
      {
        error: 'Invalid or revoked API key',
        hint:  'Check your key in the HOLLY developer dashboard at /settings/api-keys',
      },
      { status: 401 },
    );
  }

  let rl: RateLimitResult;
  try {
    rl = await checkRateLimit(validated.apiKey);
  } catch (err) {
    console.error('[API Guard] checkRateLimit error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!rl.allowed) {
    const retryAfterSec = Math.ceil(rl.retryAfterMs / 1000);
    const res = NextResponse.json(
      {
        error:        rl.reason === 'rpm' ? 'Rate limit exceeded (per minute)' : 'Rate limit exceeded (per day)',
        retryAfterMs: rl.retryAfterMs,
        limit:        rl.reason === 'rpm' ? validated.apiKey.rpmLimit : validated.apiKey.rpdLimit,
        window:       rl.reason === 'rpm' ? '60s' : '24h',
      },
      { status: 429 },
    );
    res.headers.set('Retry-After', String(retryAfterSec));
    res.headers.set('X-RateLimit-Limit', String(
      rl.reason === 'rpm' ? validated.apiKey.rpmLimit : validated.apiKey.rpdLimit,
    ));
    return res;
  }

  return {
    ok:           true,
    userId:       validated.userId,
    apiKey:       validated.apiKey,
    remainingRpm: rl.remainingRpm,
    remainingRpd: rl.remainingRpd,
  };
}

/** Type-guard: was the guard result a success? */
export function isGuardSuccess(result: GuardSuccess | GuardFailure): result is GuardSuccess {
  return !('status' in result) && (result as GuardSuccess).ok === true;
}
