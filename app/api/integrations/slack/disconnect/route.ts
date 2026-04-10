/**
 * DELETE /api/integrations/slack/disconnect
 *
 * Revoke Slack token and remove integration from DB.
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
      where: { service: 'slack', createdBy: userId },
    });

    if (integration?.accessToken) {
      // Revoke Slack token
      await fetch('https://slack.com/api/auth.revoke', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }).catch(() => { /* ignore revoke errors */ });
    }

    const deleted = await prisma.integration.deleteMany({
      where: { service: 'slack', createdBy: userId },
    });

    return NextResponse.json({ disconnected: true, deleted: deleted.count });
  } catch (err: any) {
    console.error('[Slack] Disconnect error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
