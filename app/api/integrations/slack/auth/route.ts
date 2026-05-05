/**
 * GET /api/integrations/slack/auth
 *
 * Initiate Slack OAuth2 flow.
 * Redirects user to Slack authorization page.
 *
 * Setup: Add env vars:
 *   SLACK_CLIENT_ID
 *   SLACK_CLIENT_SECRET
 *   SLACK_REDIRECT_URI=https://holly.nexamusicgroup.com/api/integrations/slack/callback
 *
 * Required scopes: channels:read, chat:write, files:write, users:read
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID ?? '';
const SLACK_REDIRECT_URI =
  process.env.SLACK_REDIRECT_URI ??
  'https://holly.nexamusicgroup.com/api/integrations/slack/callback';

const SLACK_SCOPES = [
  'channels:read',
  'channels:history',
  'chat:write',
  'files:write',
  'users:read',
  'team:read',
  'incoming-webhook',
].join(',');

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SLACK_CLIENT_ID) {
    return NextResponse.json(
      {
        error: 'Slack not configured',
        detail: 'Add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to your environment variables.',
        docs: 'https://api.slack.com/start/building',
      },
      { status: 503 },
    );
  }

  const state = crypto.randomBytes(16).toString('hex');

  const authUrl =
    `https://slack.com/oauth/v2/authorize?` +
    new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      scope: SLACK_SCOPES,
      redirect_uri: SLACK_REDIRECT_URI,
      state,
    }).toString();

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('slack_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });

  return response;
}
