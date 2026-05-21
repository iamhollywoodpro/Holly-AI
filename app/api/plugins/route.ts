/**
 * GET /api/plugins — List installed plugins + marketplace
 * POST /api/plugins/enable — Enable a plugin
 * POST /api/plugins/disable — Disable a plugin
 * DELETE /api/plugins/uninstall — Uninstall a plugin
 * PATCH /api/plugins/configure — Update plugin config
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { pluginManager } from '@/lib/plugins/plugin-manager';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [installed, marketplace] = await Promise.all([
      pluginManager.getUserPlugins(user.id),
      Promise.resolve(pluginManager.getMarketplace()),
    ]);

    // Mark marketplace entries that are already installed
    const installedIds = new Set(installed.map(p => p.pluginId));
    const marketplaceWithStatus = marketplace.map(entry => ({
      ...entry,
      installed: installedIds.has(entry.id),
    }));

    return NextResponse.json({
      installed,
      marketplace: marketplaceWithStatus,
      stats: pluginManager.getStats(),
    });
  } catch (error) {
    console.error('[Plugins List] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
