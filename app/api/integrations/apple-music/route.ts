/**
 * GET/POST/DELETE /api/integrations/apple-music
 *
 * Apple Music API integration for HOLLY.
 * Uses MusicKit JS on the client side + Apple Music API on the server.
 *
 * Server-side: Generates a developer token (JWT) for MusicKit JS.
 * Client-side: User authenticates via MusicKit JS (no redirect needed).
 *
 * Setup: Add env vars:
 *   APPLE_MUSIC_KEY_ID        — 10-char key ID from Apple Developer portal
 *   APPLE_MUSIC_TEAM_ID       — 10-char Team ID from Apple Developer portal
 *   APPLE_MUSIC_PRIVATE_KEY   — ES256 .p8 private key content (PEM format, one-liner with \n)
 *
 * Docs: https://developer.apple.com/documentation/applemusicapi
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

const APPLE_KEY_ID = process.env.APPLE_MUSIC_KEY_ID ?? '';
const APPLE_TEAM_ID = process.env.APPLE_MUSIC_TEAM_ID ?? '';
const APPLE_PRIVATE_KEY = (process.env.APPLE_MUSIC_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');

function isAppleMusicConfigured(): boolean {
  return !!(APPLE_KEY_ID && APPLE_TEAM_ID && APPLE_PRIVATE_KEY);
}

/**
 * Generate Apple Music developer token (JWT, valid 6 months).
 * This token is used by MusicKit JS to make API calls.
 */
function generateDeveloperToken(): string {
  if (!isAppleMusicConfigured()) {
    throw new Error('Apple Music not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 15_777_000; // ~6 months in seconds

  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: APPLE_KEY_ID }),
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({ iss: APPLE_TEAM_ID, iat: now, exp: expiry }),
  ).toString('base64url');

  const signingInput = `${header}.${payload}`;

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  sign.end();

  const signature = sign.sign(
    { key: APPLE_PRIVATE_KEY, dsaEncoding: 'ieee-p1363' },
    'base64url',
  );

  return `${signingInput}.${signature}`;
}

/** GET — return developer token and current connection status */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAppleMusicConfigured()) {
      return NextResponse.json({
        connected: false,
        configured: false,
        message: 'Add APPLE_MUSIC_KEY_ID, APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_PRIVATE_KEY to env vars.',
        docs: 'https://developer.apple.com/documentation/applemusicapi/generating_developer_tokens',
      });
    }

    // Return developer token so MusicKit JS can authenticate
    let developerToken: string;
    try {
      developerToken = generateDeveloperToken();
    } catch (err: any) {
      return NextResponse.json({ error: err.message, configured: false }, { status: 503 });
    }

    // Check existing DB integration
    const integration = await prisma.integration.findFirst({
      where: { service: 'apple-music', createdBy: userId },
      select: {
        id: true, status: true, isActive: true, config: true,
        tokenExpiry: true, enabledFeatures: true,
      },
    });

    return NextResponse.json({
      configured: true,
      connected: !!integration,
      active: integration?.isActive ?? false,
      developerToken, // Client uses this to init MusicKit JS
      status: integration?.status ?? 'disconnected',
      storefront: (integration?.config as any)?.storefront,
      displayName: (integration?.config as any)?.displayName,
      enabledFeatures: integration?.enabledFeatures ?? [],
    });
  } catch (err: any) {
    console.error('[Apple Music] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST — store user music token from MusicKit JS */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { musicUserToken, storefront, displayName } = body;

    if (!musicUserToken) {
      return NextResponse.json({ error: 'musicUserToken is required' }, { status: 400 });
    }

    // Store integration
    const existing = await prisma.integration.findFirst({
      where: { service: 'apple-music', createdBy: userId },
    });

    const integrationData = {
      service: 'apple-music',
      serviceName: 'Apple Music',
      serviceIcon: '🍎',
      status: 'active',
      authType: 'token',
      accessToken: musicUserToken,
      isActive: true,
      config: {
        storefront: storefront ?? 'us',
        displayName: displayName ?? 'Apple Music User',
        connectedAt: new Date().toISOString(),
      },
      capabilities: [
        'search_catalog',
        'get_recommendations',
        'view_library',
        'stream_previews',
        'create_playlists',
        'get_recently_played',
      ],
      enabledFeatures: ['search_catalog', 'get_recommendations', 'view_library'],
    };

    if (existing) {
      await prisma.integration.update({ where: { id: existing.id }, data: integrationData });
    } else {
      await prisma.integration.create({ data: { ...integrationData, createdBy: userId } });
    }

    return NextResponse.json({ connected: true, storefront: storefront ?? 'us' });
  } catch (err: any) {
    console.error('[Apple Music] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — disconnect Apple Music */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deleted = await prisma.integration.deleteMany({
      where: { service: 'apple-music', createdBy: userId },
    });

    return NextResponse.json({ disconnected: true, deleted: deleted.count });
  } catch (err: any) {
    console.error('[Apple Music] Disconnect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
