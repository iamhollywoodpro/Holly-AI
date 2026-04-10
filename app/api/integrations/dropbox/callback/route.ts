/**
 * GET /api/integrations/dropbox/callback
 *
 * Handle Dropbox OAuth2 callback — exchange code for tokens, store in DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY ?? '';
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET ?? '';
const DROPBOX_REDIRECT_URI =
  process.env.DROPBOX_REDIRECT_URI ??
  'https://holly.nexamusicgroup.com/api/integrations/dropbox/callback';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const storedVerifier = req.cookies.get('dropbox_code_verifier')?.value;
  const storedState = req.cookies.get('dropbox_oauth_state')?.value;

  const redirectBase = new URL('/settings/integrations', req.url);

  if (error) {
    redirectBase.searchParams.set('dropbox_error', error);
    return NextResponse.redirect(redirectBase);
  }

  if (!code || !storedVerifier || state !== storedState) {
    redirectBase.searchParams.set('dropbox_error', 'invalid_state');
    return NextResponse.redirect(redirectBase);
  }

  try {
    const tokenRes = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${DROPBOX_APP_KEY}:${DROPBOX_APP_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: DROPBOX_REDIRECT_URI,
        code_verifier: storedVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Dropbox] Token exchange failed:', errText);
      redirectBase.searchParams.set('dropbox_error', 'token_exchange_failed');
      return NextResponse.redirect(redirectBase);
    }

    const tokens = await tokenRes.json();

    // Fetch Dropbox account info
    const accountRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: 'null',
    });
    const account = accountRes.ok ? await accountRes.json() : {};

    // Store integration
    const existing = await prisma.integration.findFirst({
      where: { service: 'dropbox', createdBy: userId },
    });

    const integrationData = {
      service: 'dropbox',
      serviceName: 'Dropbox',
      serviceIcon: '📦',
      status: 'active',
      authType: 'oauth',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiry: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      isActive: true,
      config: {
        accountId: tokens.account_id,
        displayName: account.name?.display_name,
        email: account.email,
        profilePhotoUrl: account.profile_photo_url ?? null,
        accountType: account.account_type?.['.tag'] ?? 'personal',
        connectedAt: new Date().toISOString(),
      },
      capabilities: ['upload_files', 'download_files', 'list_folders', 'share_links', 'create_folder'],
      enabledFeatures: ['upload_files', 'download_files', 'list_folders'],
    };

    if (existing) {
      await prisma.integration.update({ where: { id: existing.id }, data: integrationData });
    } else {
      await prisma.integration.create({ data: { ...integrationData, createdBy: userId } });
    }

    // Clear PKCE cookies
    const response = NextResponse.redirect(
      new URL('/settings/integrations?dropbox_connected=true', req.url),
    );
    response.cookies.set('dropbox_code_verifier', '', { maxAge: 0, path: '/' });
    response.cookies.set('dropbox_oauth_state', '', { maxAge: 0, path: '/' });
    return response;
  } catch (err: any) {
    console.error('[Dropbox] Callback error:', err);
    redirectBase.searchParams.set('dropbox_error', 'callback_failed');
    return NextResponse.redirect(redirectBase);
  }
}
