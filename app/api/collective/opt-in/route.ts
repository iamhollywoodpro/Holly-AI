/**
 * Phase 23: Collective Intelligence opt-in/out
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { setCollectiveIntelligenceOptIn, isCollectiveIntelligenceEnabled } from '@/lib/collective/collective-intelligence-engine';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const enabled = body.enabled === true;

    await setCollectiveIntelligenceOptIn(user.id, enabled);

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled
        ? 'Opted in to collective intelligence. Your anonymized patterns will help all Holly users.'
        : 'Opted out of collective intelligence. Your contributed patterns have been removed.',
    });
  } catch (error) {
    console.error('Collective intelligence opt-in error:', error);
    return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const enabled = await isCollectiveIntelligenceEnabled(user.id);

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Collective intelligence status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
