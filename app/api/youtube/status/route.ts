/**
 * GET /api/youtube/status
 * Returns YouTube connection status + channel snapshot.
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { isYouTubeConfigured } from '@/lib/music/youtube/youtube-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const integration = await prisma.integration.findFirst({
    where: { service: 'youtube', createdBy: userId },
    select: { id: true, status: true, isActive: true, config: true, tokenExpiry: true, lastSyncAt: true },
  });

  const connected = integration?.status === 'active' && integration.isActive;
  const cfg       = integration?.config as any;

  return NextResponse.json({
    configured:  isYouTubeConfigured(),
    connected,
    tokenValid:  connected && integration?.tokenExpiry ? integration.tokenExpiry.getTime() > Date.now() : false,
    channel:     connected ? {
      channelId:       cfg?.channelId,
      channelTitle:    cfg?.channelTitle,
      customUrl:       cfg?.customUrl,
      thumbnailUrl:    cfg?.thumbnailUrl,
      subscriberCount: cfg?.subscriberCount,
      viewCount:       cfg?.viewCount,
      videoCount:      cfg?.videoCount,
      connectedAt:     cfg?.connectedAt,
    } : null,
    authUrl: isYouTubeConfigured() ? '/api/youtube/auth' : null,
  });
}
