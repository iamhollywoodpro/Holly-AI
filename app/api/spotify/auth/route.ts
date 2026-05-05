/**
 * GET /api/spotify/auth
 *
 * Step 1 of PKCE OAuth: generate code_verifier + state,
 * store them in short-lived cookies, then redirect to Spotify's authorization page.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  buildAuthUrl,
  generateCodeVerifier,
  generateState,
  isSpotifyConfigured,
} from '@/lib/music/spotify/spotify-client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSpotifyConfigured()) {
      return NextResponse.json(
        {
          error: 'Spotify not configured',
          detail: 'Add SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI to your environment variables.',
          docs:   'https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow',
        },
        { status: 503 },
      );
    }

    const codeVerifier = generateCodeVerifier();
    const state        = generateState();
    const authUrl      = buildAuthUrl(codeVerifier, state);

    const response = NextResponse.redirect(authUrl);

    const cookieOpts = {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge:   300, // 5 minutes
      path:     '/',
    };

    response.cookies.set('spotify_code_verifier', codeVerifier, cookieOpts);
    response.cookies.set('spotify_oauth_state', state, cookieOpts);

    return response;
  } catch (err: any) {
    console.error('[Spotify Auth] Error:', err);
    return NextResponse.json({ error: 'Auth initiation failed', detail: err.message }, { status: 500 });
  }
}
