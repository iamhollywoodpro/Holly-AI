/**
 * GET/DELETE /api/integrations/instagram
 *
 * Instagram Basic Display API integration for HOLLY.
 * Handles OAuth2 token exchange, status check, and disconnect.
 *
 * Setup: Add env vars:
 *   INSTAGRAM_APP_ID
 *   INSTAGRAM_APP_SECRET
 *   INSTAGRAM_REDIRECT_URI=https://holly.nexamusicgroup.com/api/integrations/instagram/callback
 *
 * OAuth flow: GET /api/integrations/instagram → redirects to Instagram auth page
 * Callback:   /api/integrations/instagram?code=... (Instagram redirects here)
 * Disconnect: DELETE /api/integrations/instagram
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID ?? '';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? '';
const INSTAGRAM_REDIRECT_URI =
  process.env.INSTAGRAM_REDIRECT_URI ??
  'https://holly.nexamusicgroup.com/api/integrations/instagram';

function isInstagramConfigured(): boolean {
  return !!(INSTAGRAM_APP_ID && INSTAGRAM_APP_SECRET);
}

/** GET — initiate OAuth or return current status */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Handle OAuth callback (Instagram redirects here with ?code=...)
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');

    if (error) {
      console.error('[Instagram] OAuth error:', error, errorReason);
      return NextResponse.redirect(
        new URL(`/settings/integrations?instagram_error=${error}`, req.url),
      );
    }

    if (code) {
      // Exchange code for short-lived token
      if (!isInstagramConfigured()) {
        return NextResponse.redirect(
          new URL('/settings/integrations?instagram_error=not_configured', req.url),
        );
      }

      try {
        const tokenRes = await fetch(
          'https://api.instagram.com/oauth/access_token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: INSTAGRAM_APP_ID,
              client_secret: INSTAGRAM_APP_SECRET,
              grant_type: 'authorization_code',
              redirect_uri: INSTAGRAM_REDIRECT_URI,
              code,
            }),
          },
        );

        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          console.error('[Instagram] Token exchange failed:', errText);
          return NextResponse.redirect(
            new URL('/settings/integrations?instagram_error=token_exchange_failed', req.url),
          );
        }

        const tokenData = await tokenRes.json();
        const shortToken: string = tokenData.access_token;
        const instagramUserId: string = String(tokenData.user_id);

        // Exchange for long-lived token (60 days)
        const longTokenRes = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortToken}`,
        );
        const longTokenData = await longTokenRes.json();
        const longToken: string = longTokenData.access_token ?? shortToken;
        const expiresIn: number = longTokenData.expires_in ?? 5183944;

        // Fetch Instagram profile
        const profileRes = await fetch(
          `https://graph.instagram.com/me?fields=id,username,name,account_type,profile_picture_url&access_token=${longToken}`,
        );
        const profile = await profileRes.json();

        // Store in DB
        const existing = await prisma.integration.findFirst({
          where: { service: 'instagram', createdBy: userId },
        });

        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        const integrationData = {
          service: 'instagram',
          serviceName: 'Instagram',
          serviceIcon: '📸',
          status: 'active',
          authType: 'oauth',
          accessToken: longToken,
          tokenExpiry: expiresAt,
          isActive: true,
          config: {
            instagramUserId,
            username: profile.username,
            name: profile.name,
            accountType: profile.account_type,
            profilePictureUrl: profile.profile_picture_url ?? null,
            connectedAt: new Date().toISOString(),
          },
          capabilities: ['post_media', 'view_insights', 'read_profile', 'hashtag_search'],
          enabledFeatures: ['post_media', 'read_profile'],
        };

        if (existing) {
          await prisma.integration.update({ where: { id: existing.id }, data: integrationData });
        } else {
          await prisma.integration.create({ data: { ...integrationData, createdBy: userId } });
        }

        return NextResponse.redirect(new URL('/settings/integrations?instagram_connected=true', req.url));
      } catch (err: any) {
        console.error('[Instagram] Callback error:', err);
        return NextResponse.redirect(
          new URL('/settings/integrations?instagram_error=callback_failed', req.url),
        );
      }
    }

    // No code — check current status
    const integration = await prisma.integration.findFirst({
      where: { service: 'instagram', createdBy: userId },
      select: {
        id: true, status: true, isActive: true, config: true,
        tokenExpiry: true, enabledFeatures: true,
      },
    });

    if (!integration) {
      return NextResponse.json({ connected: false, configured: isInstagramConfigured() });
    }

    return NextResponse.json({
      connected: true,
      active: integration.isActive,
      status: integration.status,
      username: (integration.config as any)?.username,
      accountType: (integration.config as any)?.accountType,
      tokenExpiry: integration.tokenExpiry,
      enabledFeatures: integration.enabledFeatures,
    });
  } catch (err: any) {
    console.error('[Instagram] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST — initiate OAuth authorization */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isInstagramConfigured()) {
    return NextResponse.json(
      {
        error: 'Instagram not configured',
        detail:
          'Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to your environment variables.',
        docs: 'https://developers.facebook.com/docs/instagram-basic-display-api/getting-started',
      },
      { status: 503 },
    );
  }

  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}&scope=user_profile,user_media&response_type=code`;

  return NextResponse.json({ authUrl });
}

/** DELETE — disconnect Instagram */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deleted = await prisma.integration.deleteMany({
      where: { service: 'instagram', createdBy: userId },
    });

    return NextResponse.json({ disconnected: true, deleted: deleted.count });
  } catch (err: any) {
    console.error('[Instagram] Disconnect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
