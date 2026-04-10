/**
 * GET /api/integrations/slack/callback
 *
 * Handle Slack OAuth2 callback — exchange code for token, store in DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID ?? '';
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET ?? '';
const SLACK_REDIRECT_URI =
  process.env.SLACK_REDIRECT_URI ??
  'https://holly.nexamusicgroup.com/api/integrations/slack/callback';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const storedState = req.cookies.get('slack_oauth_state')?.value;
  const redirectBase = new URL('/settings/integrations', req.url);

  if (error) {
    redirectBase.searchParams.set('slack_error', error);
    return NextResponse.redirect(redirectBase);
  }

  if (!code || state !== storedState) {
    redirectBase.searchParams.set('slack_error', 'invalid_state');
    return NextResponse.redirect(redirectBase);
  }

  try {
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        client_secret: SLACK_CLIENT_SECRET,
        code,
        redirect_uri: SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error('[Slack] Token exchange failed:', tokenData.error);
      redirectBase.searchParams.set('slack_error', tokenData.error ?? 'token_exchange_failed');
      return NextResponse.redirect(redirectBase);
    }

    // Store integration
    const existing = await prisma.integration.findFirst({
      where: { service: 'slack', createdBy: userId },
    });

    const integrationData = {
      service: 'slack',
      serviceName: 'Slack',
      serviceIcon: '💬',
      status: 'active',
      authType: 'oauth',
      accessToken: tokenData.access_token,
      isActive: true,
      config: {
        teamId: tokenData.team?.id,
        teamName: tokenData.team?.name,
        teamDomain: tokenData.team?.domain,
        botUserId: tokenData.bot_user_id,
        authedUserId: tokenData.authed_user?.id,
        incomingWebhook: tokenData.incoming_webhook ?? null,
        scope: tokenData.scope,
        connectedAt: new Date().toISOString(),
      },
      capabilities: ['post_messages', 'upload_files', 'read_channels', 'incoming_webhook'],
      enabledFeatures: ['post_messages', 'incoming_webhook'],
    };

    if (existing) {
      await prisma.integration.update({ where: { id: existing.id }, data: integrationData });
    } else {
      await prisma.integration.create({ data: { ...integrationData, createdBy: userId } });
    }

    const response = NextResponse.redirect(
      new URL('/settings/integrations?slack_connected=true', req.url),
    );
    response.cookies.set('slack_oauth_state', '', { maxAge: 0, path: '/' });
    return response;
  } catch (err: any) {
    console.error('[Slack] Callback error:', err);
    redirectBase.searchParams.set('slack_error', 'callback_failed');
    return NextResponse.redirect(redirectBase);
  }
}
