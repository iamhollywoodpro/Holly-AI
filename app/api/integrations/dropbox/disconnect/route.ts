/**
 * DELETE /api/integrations/dropbox/disconnect
 *
 * Revoke Dropbox token and remove integration from DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const integration = await prisma.integration.findFirst({
      where: { service: 'dropbox', createdBy: userId },
    });

    if (integration?.accessToken) {
      // Revoke token with Dropbox
      await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: 'null',
      }).catch(() => { /* ignore revoke errors */ });
    }

    const deleted = await prisma.integration.deleteMany({
      where: { service: 'dropbox', createdBy: userId },
    });

    return NextResponse.json({ disconnected: true, deleted: deleted.count });
  } catch (err: any) {
    console.error('[Dropbox] Disconnect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
