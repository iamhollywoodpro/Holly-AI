/**
 * GET /api/youtube/callback
 * Handles Google OAuth callback — exchanges code for tokens, stores in DB.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { exchangeCodeForTokens, getChannel } from '@/lib/music/youtube/youtube-client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url));

  const { searchParams } = new URL(req.url);
  const code        = searchParams.get('code');
  const state       = searchParams.get('state');
  const error       = searchParams.get('error');
  const storedState = req.cookies.get('youtube_oauth_state')?.value;

  const base = new URL('/settings/integrations', req.url);

  if (error) {
    base.searchParams.set('youtube_error', error);
    return NextResponse.redirect(base);
  }

  if (!code || state !== storedState) {
    base.searchParams.set('youtube_error', 'invalid_state');
    return NextResponse.redirect(base);
  }

  try {
    const tokens  = await exchangeCodeForTokens(code);
    const channel = await getChannel(tokens.accessToken);

    const existing = await prisma.integration.findFirst({
      where: { service: 'youtube', createdBy: userId },
    });

    const data = {
      service:      'youtube',
      serviceName:  'YouTube',
      serviceIcon:  '▶️',
      status:       'active',
      authType:     'oauth',
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiry:  tokens.expiresAt,
      isActive:     true,
      config: {
        channelId:       channel.id,
        channelTitle:    channel.title,
        customUrl:       channel.customUrl,
        thumbnailUrl:    channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        viewCount:       channel.viewCount,
        videoCount:      channel.videoCount,
        country:         channel.country,
        connectedAt:     new Date().toISOString(),
        scope:           tokens.scope,
      },
      capabilities:    ['video_upload', 'channel_analytics', 'playlist_management', 'video_list'],
      enabledFeatures: ['video_upload', 'channel_analytics', 'video_list'],
    };

    if (existing) {
      await prisma.integration.update({ where: { id: existing.id }, data });
    } else {
      await prisma.integration.create({ data: { ...data, createdBy: userId } });
    }

    const res = NextResponse.redirect(base);
    res.cookies.set('youtube_oauth_state', '', { maxAge: 0, path: '/' });
    return res;

  } catch (err: any) {
    console.error('[YouTube Callback]', err);
    base.searchParams.set('youtube_error', 'token_exchange_failed');
    return NextResponse.redirect(base);
  }
}
