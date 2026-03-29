/**
 * GET /api/spotify/callback
 *
 * Step 2 of PKCE OAuth: exchange code for tokens, store in DB,
 * then redirect to the integrations settings page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  exchangeCodeForTokens,
  getSpotifyUser,
} from '@/lib/music/spotify/spotify-client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const storedVerifier = req.cookies.get('spotify_code_verifier')?.value;
  const storedState    = req.cookies.get('spotify_oauth_state')?.value;

  const redirectBase = new URL('/settings/integrations', req.url);

  // ── Error / state mismatch ──────────────────────────────────────────────────
  if (error) {
    redirectBase.searchParams.set('spotify_error', error);
    return NextResponse.redirect(redirectBase);
  }

  if (!code || !storedVerifier || state !== storedState) {
    redirectBase.searchParams.set('spotify_error', 'invalid_state');
    return NextResponse.redirect(redirectBase);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, storedVerifier);

    // Fetch Spotify profile
    const spotifyUser = await getSpotifyUser(tokens.accessToken);

    // Find or create the integration record
    const existing = await prisma.integration.findFirst({
      where: { service: 'spotify', createdBy: userId },
    });

    const integrationData = {
      service:      'spotify',
      serviceName:  'Spotify',
      serviceIcon:  '🎵',
      status:       'active',
      authType:     'oauth',
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry:  tokens.expiresAt,
      isActive:     true,
      config: {
        spotifyUserId:   spotifyUser.id,
        displayName:     spotifyUser.display_name,
        email:           spotifyUser.email,
        country:         spotifyUser.country,
        product:         spotifyUser.product,
        profileImageUrl: spotifyUser.images?.[0]?.url ?? null,
        followers:       spotifyUser.followers.total,
        scope:           tokens.scope,
        connectedAt:     new Date().toISOString(),
      },
      capabilities:   ['stream_stats', 'top_tracks', 'top_artists', 'recently_played', 'playlists', 'audio_features'],
      enabledFeatures: ['stream_stats', 'top_tracks', 'top_artists', 'recently_played', 'playlists'],
    };

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data:  integrationData,
      });
    } else {
      await prisma.integration.create({
        data: {
          ...integrationData,
          createdBy: userId,
        },
      });
    }

    // Clear PKCE cookies
    const response = NextResponse.redirect(redirectBase);
    response.cookies.set('spotify_code_verifier', '', { maxAge: 0, path: '/' });
    response.cookies.set('spotify_oauth_state', '', { maxAge: 0, path: '/' });

    return response;
  } catch (err: any) {
    console.error('[Spotify Callback] Error:', err);
    redirectBase.searchParams.set('spotify_error', 'token_exchange_failed');
    return NextResponse.redirect(redirectBase);
  }
}
