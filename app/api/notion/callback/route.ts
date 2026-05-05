/**
 * GET /api/notion/callback
 * Exchanges Notion OAuth code for access token, stores in DB.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const NOTION_CLIENT_ID     = process.env.NOTION_CLIENT_ID ?? '';
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET ?? '';
const NOTION_REDIRECT      = process.env.NOTION_REDIRECT_URI ?? 'https://holly.nexamusicgroup.com/api/notion/callback';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url));

  const { searchParams } = new URL(req.url);
  const code        = searchParams.get('code');
  const state       = searchParams.get('state');
  const error       = searchParams.get('error');
  const storedState = req.cookies.get('notion_oauth_state')?.value;

  const base = new URL('/settings/integrations', req.url);

  if (error) { base.searchParams.set('notion_error', error); return NextResponse.redirect(base); }
  if (!code || state !== storedState) { base.searchParams.set('notion_error', 'invalid_state'); return NextResponse.redirect(base); }

  try {
    // Exchange code for token (Basic auth with client_id:client_secret)
    const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        grant_type:   'authorization_code',
        code,
        redirect_uri: NOTION_REDIRECT,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion token exchange failed: ${err}`);
    }

    const data = await res.json();
    const {
      access_token,
      workspace_id,
      workspace_name,
      workspace_icon,
      bot_id,
      owner,
    } = data;

    const existing = await prisma.integration.findFirst({ where: { service: 'notion', createdBy: userId } });

    const integrationData = {
      service: 'notion', serviceName: 'Notion', serviceIcon: '📝',
      status: 'active', authType: 'oauth',
      accessToken: access_token, tokenExpiry: null, isActive: true,
      config: {
        workspaceId:   workspace_id,
        workspaceName: workspace_name,
        workspaceIcon: workspace_icon,
        botId:         bot_id,
        ownerName:     owner?.user?.name,
        connectedAt:   new Date().toISOString(),
      },
      capabilities: ['create_page', 'list_databases', 'search'],
      enabledFeatures: ['create_page', 'search'],
    };

    if (existing) await prisma.integration.update({ where: { id: existing.id }, data: integrationData });
    else await prisma.integration.create({ data: { ...integrationData, createdBy: userId } });

    const response = NextResponse.redirect(base);
    response.cookies.set('notion_oauth_state', '', { maxAge: 0, path: '/' });
    return response;

  } catch (err: any) {
    console.error('[Notion Callback]', err);
    base.searchParams.set('notion_error', 'token_exchange_failed');
    return NextResponse.redirect(base);
  }
}
