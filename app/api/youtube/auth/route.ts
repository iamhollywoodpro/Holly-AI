/**
 * GET /api/youtube/auth
 * Initiates YouTube OAuth 2.0 — redirects to Google consent screen.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildAuthUrl, generateState, isYouTubeConfigured } from '@/lib/music/youtube/youtube-client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isYouTubeConfigured()) {
    return NextResponse.json({
      error:  'YouTube not configured',
      detail: 'Add YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and YOUTUBE_REDIRECT_URI to your environment variables.',
      docs:   'https://console.cloud.google.com/apis/credentials',
    }, { status: 503 });
  }

  const state    = generateState();
  const authUrl  = buildAuthUrl(state);
  const response = NextResponse.redirect(authUrl);

  response.cookies.set('youtube_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   300,
    path:     '/',
  });

  return response;
}
