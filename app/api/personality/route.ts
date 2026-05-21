/**
 * Phase 12: Adaptive Personality API
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getCommunicationStylePrompt, applyToneAdjustment } from '@/lib/personality/adaptive-personality';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const style = await prisma.communicationStyle.findUnique({ where: { userId: user.id } });
    const recentAdjustments = await prisma.toneAdjustment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ style, recentAdjustments });
  } catch (error) {
    console.error('[Personality API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = getAuth(req);
    if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const { dimension, direction, magnitude, reason } = body;

    if (!dimension || !direction || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await applyToneAdjustment(user.id, dimension, direction, magnitude || 0.2, reason);
    const stylePrompt = await getCommunicationStylePrompt(user.id);

    return NextResponse.json({ success: true, stylePrompt });
  } catch (error) {
    console.error('[Personality API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
