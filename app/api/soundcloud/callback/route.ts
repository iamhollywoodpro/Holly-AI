import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { exchangeCodeForToken, getMe } from '@/lib/music/soundcloud/soundcloud-client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url));

  const { searchParams } = new URL(req.url);
  const code        = searchParams.get('code');
  const state       = searchParams.get('state');
  const error       = searchParams.get('error');
  const storedState = req.cookies.get('soundcloud_oauth_state')?.value;

  const base = new URL('/settings/integrations', req.url);

  if (error) { base.searchParams.set('soundcloud_error', error); return NextResponse.redirect(base); }
  if (!code || state !== storedState) { base.searchParams.set('soundcloud_error', 'invalid_state'); return NextResponse.redirect(base); }

  try {
    const { accessToken, scope } = await exchangeCodeForToken(code);
    const me = await getMe(accessToken);

    const existing = await prisma.integration.findFirst({ where: { service: 'soundcloud', createdBy: userId } });

    const data = {
      service: 'soundcloud', serviceName: 'SoundCloud', serviceIcon: '☁️',
      status: 'active', authType: 'oauth',
      accessToken, refreshToken: null, tokenExpiry: null, isActive: true,
      config: {
        userId: me.id, username: me.username, fullName: me.full_name,
        avatarUrl: me.avatar_url, permalinkUrl: me.permalink_url,
        followers: me.followers_count, tracks: me.track_count,
        connectedAt: new Date().toISOString(), scope,
      },
      capabilities: ['track_upload', 'track_list', 'play_stats'],
      enabledFeatures: ['track_upload', 'track_list'],
    };

    if (existing) await prisma.integration.update({ where: { id: existing.id }, data });
    else await prisma.integration.create({ data: { ...data, createdBy: userId } });

    const res = NextResponse.redirect(base);
    res.cookies.set('soundcloud_oauth_state', '', { maxAge: 0, path: '/' });
    return res;

  } catch (err: any) {
    console.error('[SoundCloud Callback]', err);
    base.searchParams.set('soundcloud_error', 'token_exchange_failed');
    return NextResponse.redirect(base);
  }
}
