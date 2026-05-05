/**
 * DELETE /api/spotify/disconnect
 * Removes Spotify OAuth tokens from DB (revokes connection).
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.integration.updateMany({
    where: { service: 'spotify', createdBy: userId },
    data: {
      status:       'inactive',
      isActive:     false,
      accessToken:  null,
      refreshToken: null,
      tokenExpiry:  null,
    },
  });

  return NextResponse.json({ success: true, message: 'Spotify disconnected' });
}
