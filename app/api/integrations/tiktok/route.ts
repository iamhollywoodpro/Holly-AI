/**
 * GET/POST/DELETE /api/integrations/tiktok
 *
 * TikTok Login Kit OAuth2 integration for HOLLY.
 * Handles OAuth2 token exchange, status check, and disconnect.
 *
 * Setup: Add env vars:
 *   TIKTOK_CLIENT_KEY
 *   TIKTOK_CLIENT_SECRET
 *   TIKTOK_REDIRECT_URI=https://holly.nexamusicgroup.com/api/integrations/tiktok
 *
 * Docs: https://developers.tiktok.com/doc/login-kit-web
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY ?? '';
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET ?? '';
const TIKTOK_REDIRECT_URI =
  process.env.TIKTOK_REDIRECT_URI ??
  'https://holly.nexamusicgroup.com/api/integrations/tiktok';

function isTikTokConfigured(): boolean {
  return !!(TIKTOK_CLIENT_KEY && TIKTOK_CLIENT_SECRET);
}

/** GET — handle OAuth callback or return current status */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[TikTok] OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?tiktok_error=${error}`, req.url),
      );
    }

    if (code) {
      if (!isTikTokConfigured()) {
        return NextResponse.redirect(
          new URL('/settings/integrations?tiktok_error=not_configured', req.url),
        );
      }

      try {
        // Exchange code for tokens
        const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache',
          },
          body: new URLSearchParams({
            client_key: TIKTOK_CLIENT_KEY,
            client_secret: TIKTOK_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: TIKTOK_REDIRECT_URI,
          }),
        });

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error('[TikTok] Token exchange failed:', errText);
          return NextResponse.redirect(
            new URL('/settings/integrations?tiktok_error=token_exchange_failed', req.url),
          );
        }

        const tokenData = await tokenRes.json();

        // Fetch user profile
        const profileRes = await fetch(
          'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,follower_count,following_count,likes_count,video_count',
          {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
          },
        );
        const profileData = await profileRes.json();
        const userInfo = profileData.data?.user ?? {};

        // Store in DB
        const existing = await prisma.integration.findFirst({
          where: { service: 'tiktok', createdBy: userId },
        });

        const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 86400) * 1000);
        const integrationData = {
          service: 'tiktok',
          serviceName: 'TikTok',
          serviceIcon: '🎵',
          status: 'active',
          authType: 'oauth',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token ?? null,
          tokenExpiry: expiresAt,
          isActive: true,
          config: {
            openId: userInfo.open_id ?? tokenData.open_id,
            displayName: userInfo.display_name,
            avatarUrl: userInfo.avatar_url,
            followerCount: userInfo.follower_count,
            videoCount: userInfo.video_count,
            scope: tokenData.scope,
            connectedAt: new Date().toISOString(),
          },
          capabilities: ['post_video', 'view_profile', 'read_insights', 'manage_comments'],
          enabledFeatures: ['post_video', 'view_profile'],
        };

        if (existing) {
          await prisma.integration.update({ where: { id: existing.id }, data: integrationData });
        } else {
          await prisma.integration.create({ data: { ...integrationData, createdBy: userId } });
        }

        return NextResponse.redirect(new URL('/settings/integrations?tiktok_connected=true', req.url));
      } catch (err: any) {
        console.error('[TikTok] Callback error:', err);
        return NextResponse.redirect(
          new URL('/settings/integrations?tiktok_error=callback_failed', req.url),
        );
      }
    }

    // No code — return current status
    const integration = await prisma.integration.findFirst({
      where: { service: 'tiktok', createdBy: userId },
      select: {
        id: true, status: true, isActive: true, config: true,
        tokenExpiry: true, enabledFeatures: true,
      },
    });

    if (!integration) {
      return NextResponse.json({ connected: false, configured: isTikTokConfigured() });
    }

    return NextResponse.json({
      connected: true,
      active: integration.isActive,
      status: integration.status,
      displayName: (integration.config as any)?.displayName,
      followerCount: (integration.config as any)?.followerCount,
      tokenExpiry: integration.tokenExpiry,
      enabledFeatures: integration.enabledFeatures,
    });
  } catch (err: any) {
    console.error('[TikTok] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST — initiate OAuth authorization */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isTikTokConfigured()) {
    return NextResponse.json(
      {
        error: 'TikTok not configured',
        detail: 'Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET to your environment variables.',
        docs: 'https://developers.tiktok.com/doc/login-kit-web',
      },
      { status: 503 },
    );
  }

  const csrfState = crypto.randomBytes(16).toString('hex');
  const scopes = 'user.info.basic,video.list,video.upload';

  const authUrl =
    `https://www.tiktok.com/v2/auth/authorize/?` +
    new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      scope: scopes,
      response_type: 'code',
      redirect_uri: TIKTOK_REDIRECT_URI,
      state: csrfState,
    }).toString();

  return NextResponse.json({ authUrl, state: csrfState });
}

/** DELETE — disconnect TikTok */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deleted = await prisma.integration.deleteMany({
      where: { service: 'tiktok', createdBy: userId },
    });

    return NextResponse.json({ disconnected: true, deleted: deleted.count });
  } catch (err: any) {
    console.error('[TikTok] Disconnect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
