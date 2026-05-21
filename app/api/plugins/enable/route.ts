/**
 * POST /api/plugins/enable — Enable an installed plugin
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { pluginManager } from '@/lib/plugins/plugin-manager';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { pluginId } = await req.json();
    if (!pluginId) {
      return NextResponse.json({ error: 'pluginId required' }, { status: 400 });
    }

    const result = await pluginManager.enablePlugin(user.id, pluginId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Plugin ${pluginId} enabled` });
  } catch (error) {
    console.error('[Plugins Enable] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
