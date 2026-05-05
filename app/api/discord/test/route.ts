/**
 * POST /api/discord/test
 * Send a test message to the configured Discord webhook to verify it works.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

async function getWebhookUrl(userId: string): Promise<string | null> {
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL;
  const row = await prisma.integration.findFirst({
    where: { service: 'discord', createdBy: userId, isActive: true },
  });
  const cfg = row?.config as Record<string, unknown> | null;
  return (cfg?.webhookUrl as string) ?? null;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const webhookUrl = await getWebhookUrl(userId);
  if (!webhookUrl) {
    return NextResponse.json({ error: 'Discord not configured' }, { status: 503 });
  }

  const payload = {
    username: 'HOLLY',
    embeds: [{
      title: '✅ HOLLY Discord Connection Test',
      description: 'Your Discord webhook is working correctly! HOLLY will send you A&R reports, new track notifications, and insights here.',
      color: 1957204, // Spotify green
      fields: [
        { name: '🎵 Music Updates', value: 'New tracks, stem separations, and cover art', inline: true },
        { name: '📊 A&R Reports', value: 'Streaming stats and playlist pitches', inline: true },
        { name: '🧠 AI Insights', value: 'Memory updates and goal progress', inline: true },
      ],
      footer: { text: 'HOLLY AI · holly.nexamusicgroup.com' },
      timestamp: new Date().toISOString(),
    }],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: 'Webhook test failed', detail: errText }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: 'Test message sent to Discord' });
}
