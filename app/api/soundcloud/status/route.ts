import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { isSoundCloudConfigured } from '@/lib/music/soundcloud/soundcloud-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const integration = await prisma.integration.findFirst({
    where: { service: 'soundcloud', createdBy: userId },
    select: { status: true, isActive: true, config: true, lastSyncAt: true },
  });

  const connected = integration?.status === 'active' && integration.isActive;
  const cfg = integration?.config as any;

  return NextResponse.json({
    configured: isSoundCloudConfigured(),
    connected,
    profile: connected ? {
      username: cfg?.username, fullName: cfg?.fullName,
      avatarUrl: cfg?.avatarUrl, permalinkUrl: cfg?.permalinkUrl,
      followers: cfg?.followers, tracks: cfg?.tracks, connectedAt: cfg?.connectedAt,
    } : null,
    authUrl: isSoundCloudConfigured() ? '/api/soundcloud/auth' : null,
  });
}
