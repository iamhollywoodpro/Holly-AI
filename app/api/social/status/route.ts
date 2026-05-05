/**
 * GET /api/social/status
 *
 * Returns connection status for all social integrations.
 * Used by the integrations page to show which platforms are connected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const ALL_SOCIAL_PLATFORMS = [
  'instagram',
  'tiktok',
  'soundcloud',
  'spotify',
  'youtube',
  'slack',
  'dropbox',
  'apple-music',
  'canva',
  'notion',
  'discord',
  'github',
  'google-drive',
];

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrations = await prisma.integration.findMany({
      where: { createdBy: userId },
      select: {
        id: true,
        service: true,
        serviceName: true,
        serviceIcon: true,
        status: true,
        isActive: true,
        tokenExpiry: true,
        config: true,
        enabledFeatures: true,
        capabilities: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Build a map for quick lookup
    const connected: Record<string, any> = {};
    for (const integration of integrations) {
      connected[integration.service] = {
        id: integration.id,
        connected: true,
        active: integration.isActive,
        status: integration.status,
        serviceName: integration.serviceName,
        serviceIcon: integration.serviceIcon,
        tokenExpiry: integration.tokenExpiry,
        enabledFeatures: integration.enabledFeatures,
        capabilities: integration.capabilities,
        connectedAt: (integration.config as any)?.connectedAt,
        // Platform-specific display info
        username: (integration.config as any)?.username
          ?? (integration.config as any)?.displayName
          ?? (integration.config as any)?.teamName,
        profileUrl: (integration.config as any)?.profileUrl ?? null,
        followerCount: (integration.config as any)?.followerCount ?? null,
        updatedAt: integration.updatedAt,
      };
    }

    // Return status for all known platforms
    const statusMap: Record<string, any> = {};
    for (const platform of ALL_SOCIAL_PLATFORMS) {
      statusMap[platform] = connected[platform] ?? { connected: false, status: 'disconnected' };
    }

    return NextResponse.json({
      status: statusMap,
      connectedCount: integrations.filter(i => i.isActive).length,
      totalPlatforms: ALL_SOCIAL_PLATFORMS.length,
    });
  } catch (err: any) {
    console.error('[Social Status] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
