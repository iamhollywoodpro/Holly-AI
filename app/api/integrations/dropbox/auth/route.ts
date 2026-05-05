/**
 * GET /api/integrations/dropbox/auth
 *
 * Initiate Dropbox OAuth2 PKCE flow.
 * Redirects user to Dropbox authorization page.
 *
 * Setup: Add env vars:
 *   DROPBOX_APP_KEY
 *   DROPBOX_APP_SECRET
 *   DROPBOX_REDIRECT_URI=https://holly.nexamusicgroup.com/api/integrations/dropbox/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY ?? '';
const DROPBOX_REDIRECT_URI =
  process.env.DROPBOX_REDIRECT_URI ??
  'https://holly.nexamusicgroup.com/api/integrations/dropbox/callback';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!DROPBOX_APP_KEY) {
    return NextResponse.json(
      {
        error: 'Dropbox not configured',
        detail: 'Add DROPBOX_APP_KEY and DROPBOX_APP_SECRET to your environment variables.',
        docs: 'https://www.dropbox.com/developers/apps',
      },
      { status: 503 },
    );
  }

  // PKCE code verifier + challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl =
    `https://www.dropbox.com/oauth2/authorize?` +
    new URLSearchParams({
      client_id: DROPBOX_APP_KEY,
      redirect_uri: DROPBOX_REDIRECT_URI,
      response_type: 'code',
      token_access_type: 'offline',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    }).toString();

  const response = NextResponse.redirect(authUrl);

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 300,
    path: '/',
  };
  response.cookies.set('dropbox_code_verifier', codeVerifier, cookieOpts);
  response.cookies.set('dropbox_oauth_state', state, cookieOpts);

  return response;
}
