/**
 * POST /api/discord/webhook
 * Send a message to a Discord channel via webhook URL stored in env or DB.
 *
 * Required env vars (or stored in Integration.config):
 *   DISCORD_WEBHOOK_URL  – the Discord webhook URL
 *
 * Body: { message, title?, color?, fields? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordBody {
  message?: string;
  title?: string;
  color?: number;      // decimal color e.g. 0x1DB954 = 1957204
  fields?: DiscordField[];
  username?: string;
  avatarUrl?: string;
}

async function getWebhookUrl(userId: string): Promise<string | null> {
  // 1. Check env var (global)
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL;

  // 2. Check DB integration row
  const row = await prisma.integration.findFirst({
    where: { service: 'discord', createdBy: userId, isActive: true },
  });
  const cfg = row?.config as Record<string, unknown> | null;
  return (cfg?.webhookUrl as string) ?? null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: DiscordBody = await req.json();
  const { message, title, color = 1957204, fields, username = 'HOLLY', avatarUrl } = body;

  if (!message && !title && !fields?.length) {
    return NextResponse.json({ error: 'Provide at least message, title, or fields' }, { status: 400 });
  }

  const webhookUrl = await getWebhookUrl(userId);
  if (!webhookUrl) {
    return NextResponse.json({
      error: 'Discord not configured',
      detail: 'Set DISCORD_WEBHOOK_URL in env or connect Discord in Settings → Integrations.',
      docs: 'https://support.discord.com/hc/en-us/articles/228383668',
    }, { status: 503 });
  }

  // Build Discord embed payload
  const embed: Record<string, unknown> = { color };
  if (title)  embed.title       = title;
  if (message) embed.description = message;
  if (fields?.length) embed.fields = fields;
  embed.footer    = { text: 'HOLLY AI · holly.nexamusicgroup.com' };
  embed.timestamp = new Date().toISOString();

  const payload: Record<string, unknown> = { embeds: [embed], username };
  if (avatarUrl) payload.avatar_url = avatarUrl;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[Discord Webhook]', res.status, errText);
    return NextResponse.json({ error: 'Discord webhook failed', detail: errText }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: 'Message sent to Discord' });
}
