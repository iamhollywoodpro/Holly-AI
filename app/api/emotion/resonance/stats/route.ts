import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getResonanceStats } from '@/lib/emotion/emotional-resonance';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const stats = await getResonanceStats(user.id);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Resonance Stats API] Error:', error);
    return NextResponse.json({ error: 'Failed to get resonance stats' }, { status: 500 });
  }
}
