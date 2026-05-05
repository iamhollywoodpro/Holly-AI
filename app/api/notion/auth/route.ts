/**
 * GET /api/notion/auth
 * Initiates Notion OAuth — redirects to Notion authorization page.
 *
 * Required env vars:
 *   NOTION_CLIENT_ID
 *   NOTION_CLIENT_SECRET
 *   NOTION_REDIRECT_URI  (https://holly.nexamusicgroup.com/api/notion/callback)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

const NOTION_CLIENT_ID  = process.env.NOTION_CLIENT_ID ?? '';
const NOTION_REDIRECT   = process.env.NOTION_REDIRECT_URI ?? 'https://holly.nexamusicgroup.com/api/notion/callback';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!NOTION_CLIENT_ID) {
    return NextResponse.json({
      error: 'Notion not configured',
      detail: 'Add NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI to env vars.',
      docs: 'https://developers.notion.com/docs/authorization',
    }, { status: 503 });
  }

  const state  = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id:     NOTION_CLIENT_ID,
    redirect_uri:  NOTION_REDIRECT,
    response_type: 'code',
    owner:         'user',
    state,
  });

  const response = NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`);
  response.cookies.set('notion_oauth_state', state, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 300, path: '/',
  });
  return response;
}
