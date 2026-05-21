import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { recalculateResonance, getResonanceProfile } from '@/lib/emotion/emotional-resonance';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
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

    const forceRecalc = request.nextUrl.searchParams.get('recalculate') === 'true';
    const profile = forceRecalc
      ? await recalculateResonance(user.id)
      : await getResonanceProfile(user.id);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[Resonance API] Error:', error);
    return NextResponse.json({ error: 'Failed to get resonance profile' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const profile = await recalculateResonance(user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[Resonance API] Recalculate error:', error);
    return NextResponse.json({ error: 'Failed to recalculate resonance' }, { status: 500 });
  }
}
