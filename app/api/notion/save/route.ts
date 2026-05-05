/**
 * POST /api/notion/save
 * Save a page (song idea, lyric draft, A&R note) to a Notion database.
 *
 * Body:
 *   { title, content, type: 'song_idea' | 'lyric' | 'ar_note' | 'goal' | 'note', tags? }
 *
 * The Notion integration must be connected first.
 * If no database is configured, the page is saved to the connected workspace root.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const NOTION_VERSION = '2022-06-28';

type SaveType = 'song_idea' | 'lyric' | 'ar_note' | 'goal' | 'note';

const TYPE_EMOJI: Record<SaveType, string> = {
  song_idea: '🎵',
  lyric:     '✍️',
  ar_note:   '📊',
  goal:      '🎯',
  note:      '📝',
};

async function getAccessToken(userId: string): Promise<string | null> {
  const row = await prisma.integration.findFirst({
    where: { service: 'notion', createdBy: userId, isActive: true },
  });
  return row?.accessToken ?? null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accessToken = await getAccessToken(userId);
  if (!accessToken) {
    return NextResponse.json({
      error: 'Notion not connected',
      detail: 'Connect Notion in Settings → Integrations first.',
    }, { status: 503 });
  }

  const body = await req.json();
  const {
    title,
    content,
    type = 'note' as SaveType,
    tags = [] as string[],
    databaseId = null as string | null,
  } = body;

  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

  const emoji = TYPE_EMOJI[type as SaveType] ?? '📝';
  const fullTitle = `${emoji} ${title}`;

  // Build Notion page creation payload
  // If databaseId provided → create as DB item, else create as top-level page
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    properties: {
      title: {
        title: [{ text: { content: fullTitle } }],
      },
    },
  };

  if (databaseId) {
    payload.parent = { database_id: databaseId };
    // Add extra props if it's a DB page
    if (tags.length) {
      payload.properties['Tags'] = {
        multi_select: tags.map((t: string) => ({ name: t })),
      };
    }
    payload.properties['Type'] = { select: { name: type } };
    payload.properties['Source'] = { select: { name: 'HOLLY AI' } };
  } else {
    payload.parent = { type: 'workspace', workspace: true };
  }

  // Add content as paragraph blocks
  if (content) {
    // Split content into chunks ≤ 2000 chars (Notion limit per block)
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += 2000) chunks.push(content.slice(i, i + 2000));
    payload.children = chunks.map((chunk: string) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: chunk } }],
      },
    }));
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization':   `Bearer ${accessToken}`,
      'Content-Type':    'application/json',
      'Notion-Version':  NOTION_VERSION,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ message: 'Unknown error' }));
    console.error('[Notion Save]', res.status, errData);
    return NextResponse.json({
      error: 'Failed to save to Notion',
      detail: errData.message ?? errData,
    }, { status: 502 });
  }

  const page = await res.json();
  return NextResponse.json({
    ok: true,
    pageId:  page.id,
    pageUrl: page.url,
    message: `Saved "${fullTitle}" to Notion`,
  });
}
