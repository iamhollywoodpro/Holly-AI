/**
 * GET /api/spotify/status
 * Returns Spotify connection status for the authenticated user.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { isSpotifyConfigured } from '@/lib/music/spotify/spotify-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const configured = isSpotifyConfigured();

  const integration = await prisma.integration.findFirst({
    where: { service: 'spotify', createdBy: userId },
    select: {
      id:           true,
      status:       true,
      isActive:     true,
      config:       true,
      tokenExpiry:  true,
      lastSyncAt:   true,
      capabilities: true,
    },
  });

  const connected = integration?.status === 'active' && integration.isActive;
  const tokenValid =
    connected && integration.tokenExpiry
      ? integration.tokenExpiry.getTime() > Date.now()
      : false;

  return NextResponse.json({
    configured,
    connected,
    tokenValid,
    integration: connected
      ? {
          displayName:     (integration.config as any)?.displayName,
          email:           (integration.config as any)?.email,
          product:         (integration.config as any)?.product,
          profileImageUrl: (integration.config as any)?.profileImageUrl,
          followers:       (integration.config as any)?.followers,
          connectedAt:     (integration.config as any)?.connectedAt,
          capabilities:    integration.capabilities,
          lastSyncAt:      integration.lastSyncAt,
        }
      : null,
    authUrl: configured ? '/api/spotify/auth' : null,
  });
}
