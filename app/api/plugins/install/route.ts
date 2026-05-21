/**
 * POST /api/plugins/install
 * Install a plugin from the marketplace or a custom manifest.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { pluginManager } from '@/lib/plugins/plugin-manager';
import type { PluginManifest, PluginPermission } from '@/lib/plugins/plugin-system';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { pluginId, manifest } = body as {
      pluginId?: string;
      manifest?: PluginManifest;
    };

    // Option 1: Install from marketplace by ID
    if (pluginId) {
      const entry = pluginManager.getMarketplacePlugin(pluginId);
      if (!entry) {
        return NextResponse.json({ error: `Plugin ${pluginId} not found in marketplace` }, { status: 404 });
      }

      const installManifest: PluginManifest = {
        id: entry.id,
        name: entry.name,
        version: entry.version,
        description: entry.description,
        author: entry.author,
        permissions: entry.permissions,
      };

      const result = await pluginManager.installPlugin(user.id, installManifest);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `${entry.name} installed successfully`,
        installationId: result.installationId,
      });
    }

    // Option 2: Install from custom manifest
    if (manifest) {
      if (!manifest.id || !manifest.name || !manifest.version) {
        return NextResponse.json({
          error: 'Custom manifest requires id, name, and version',
        }, { status: 400 });
      }

      const result = await pluginManager.installPlugin(user.id, manifest as PluginManifest);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `${manifest.name} installed successfully`,
        installationId: result.installationId,
      });
    }

    return NextResponse.json({ error: 'Provide pluginId or manifest' }, { status: 400 });
  } catch (error) {
    console.error('[Plugins Install] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
