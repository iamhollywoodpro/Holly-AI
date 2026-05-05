/**
 * GET  /api/discord/status  – check if Discord webhook is configured
 * POST /api/discord/status  – save a Discord webhook URL for this user
 * DELETE /api/discord/status – remove the Discord webhook for this user
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const envWebhook = !!process.env.DISCORD_WEBHOOK_URL;

  const row = await prisma.integration.findFirst({
    where: { service: 'discord', createdBy: userId },
  });
  const cfg = row?.config as Record<string, unknown> | null;
  const dbWebhook = !!(cfg?.webhookUrl);

  const connected = envWebhook || (!!row?.isActive && dbWebhook);

  return NextResponse.json({
    connected,
    source:      envWebhook ? 'env' : dbWebhook ? 'db' : null,
    serverName:  (cfg?.serverName  as string) ?? null,
    channelName: (cfg?.channelName as string) ?? null,
  });
}

// ── POST ───────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { webhookUrl, serverName = '', channelName = '' } = body;

  if (!webhookUrl?.startsWith('https://discord.com/api/webhooks/')) {
    return NextResponse.json({ error: 'Invalid Discord webhook URL' }, { status: 400 });
  }

  const existing = await prisma.integration.findFirst({
    where: { service: 'discord', createdBy: userId },
  });

  const data = {
    service: 'discord', serviceName: 'Discord', serviceIcon: '🎮',
    status: 'active', authType: 'webhook',
    isActive: true,
    config: {
      webhookUrl,
      serverName,
      channelName,
      connectedAt: new Date().toISOString(),
    },
    capabilities: ['send_message', 'send_embed'],
    enabledFeatures: ['send_message'],
  };

  if (existing) {
    await prisma.integration.update({ where: { id: existing.id }, data });
  } else {
    await prisma.integration.create({ data: { ...data, createdBy: userId } });
  }

  return NextResponse.json({ ok: true, message: 'Discord webhook saved' });
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.integration.findFirst({
    where: { service: 'discord', createdBy: userId },
  });

  if (row) {
    await prisma.integration.update({
      where: { id: row.id },
      data: { status: 'inactive', isActive: false, config: {} },
    });
  }

  return NextResponse.json({ ok: true, message: 'Discord disconnected' });
}
