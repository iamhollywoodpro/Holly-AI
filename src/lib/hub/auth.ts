/**
 * HOLLY Tool Hub — Authentication Guard
 *
 * Accepts three auth methods (checked in order):
 *   1. HOLLY_HUB_API_KEY env var — x-hub-key or Bearer matching this value
 *   2. HOLLY API key (holly_xxxx) — validated against the DB
 *   3. Dev bypass — x-hub-key: hub_dev (NODE_ENV=development only)
 *
 * Set HOLLY_HUB_API_KEY in Vercel → a single shared secret for the hub.
 * Alternatively users can use their personal holly_xxxx API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api-keys';

export type HubAuthResult =
  | { ok: true;  userId: string; keyId: string; keyName: string }
  | { ok: false; response: NextResponse };

/**
 * Guard incoming hub requests.
 * Returns { ok: true, userId, keyId } or a pre-built error NextResponse.
 */
export async function guardHubRequest(req: NextRequest): Promise<HubAuthResult> {
  // ── Extract all possible key sources ──────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const xApiKey    = req.headers.get('x-api-key') ?? '';
  const xHubKey    = req.headers.get('x-hub-key') ?? '';

  // ── Internal server-to-server token (MCP client → hub routes via localhost) ──
  const xInternalToken = req.headers.get('x-internal-token') ?? '';
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (!internalSecret) {
    console.error('[HUB AUTH] INTERNAL_API_SECRET not set — internal token auth disabled');
  }
  if (xInternalToken && xInternalToken === internalSecret) {
    return { ok: true, userId: 'internal', keyId: 'internal', keyName: 'Internal Server-to-Server' };
  }

  let rawKey: string | null = null;

  if (authHeader.toLowerCase().startsWith('bearer ')) {
    rawKey = authHeader.slice(7).trim();
  } else if (xApiKey) {
    rawKey = xApiKey.trim();
  } else if (xHubKey) {
    rawKey = xHubKey.trim();
  }

  // ── HOLLY_HUB_API_KEY: master hub secret (set in Vercel) ──────────────────
  const masterKey = process.env.HOLLY_HUB_API_KEY;
  if (masterKey && rawKey && rawKey === masterKey) {
    return { ok: true, userId: 'hub-master', keyId: 'hub_master', keyName: 'Hub Master Key' };
  }

  // ── Dev bypass ────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    if (rawKey === 'hub_dev' || rawKey === 'dev') {
      return { ok: true, userId: 'dev-user', keyId: 'dev', keyName: 'Development Key' };
    }
  }

  if (!rawKey) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Missing authentication',
          hint:  [
            'Option 1: Authorization: Bearer holly_xxxx  (your HOLLY API key)',
            'Option 2: x-api-key: holly_xxxx',
            'Option 3: x-hub-key: <HOLLY_HUB_API_KEY>  (if set in Vercel env)',
            'Dev only: x-hub-key: hub_dev',
          ],
          docs: '/hub',
        },
        { status: 401 },
      ),
    };
  }

  // ── Validate via existing HOLLY API-key system ────────────────────────────
  if (rawKey.startsWith('holly_')) {
    try {
      const validated = await validateApiKey(rawKey);
      if (!validated) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Invalid or revoked API key', hint: 'Generate a new key at /settings/api-keys' },
            { status: 401 },
          ),
        };
      }
      return {
        ok:      true,
        userId:  validated.userId,
        keyId:   validated.apiKey.id,
        keyName: validated.apiKey.name ?? 'Unnamed key',
      };
    } catch {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Auth service error' }, { status: 500 }),
      };
    }
  }

  // ── Unknown key format ────────────────────────────────────────────────────
  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'Unknown key format',
        hint:  'HOLLY API keys start with "holly_". Generate at /settings/api-keys',
        docs:  '/hub',
      },
      { status: 401 },
    ),
  };
}

/** Type guard */
export function isAuthSuccess(r: HubAuthResult): r is { ok: true; userId: string; keyId: string; keyName: string } {
  return r.ok === true;
}
