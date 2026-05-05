import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { buildAuthUrl, generateState, isSoundCloudConfigured } from '@/lib/music/soundcloud/soundcloud-client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isSoundCloudConfigured()) {
    return NextResponse.json({
      error: 'SoundCloud not configured',
      detail: 'Add SOUNDCLOUD_CLIENT_ID, SOUNDCLOUD_CLIENT_SECRET, and SOUNDCLOUD_REDIRECT_URI.',
      docs: 'https://developers.soundcloud.com/docs/api/guide',
    }, { status: 503 });
  }

  const state   = generateState();
  const authUrl = buildAuthUrl(state);
  const res     = NextResponse.redirect(authUrl);

  res.cookies.set('soundcloud_oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 300, path: '/',
  });

  return res;
}
