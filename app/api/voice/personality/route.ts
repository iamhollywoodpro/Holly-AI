/**
 * GET /api/voice/personality — Phase 18: Voice Personality
 *
 * Returns the voice parameters adapted to the current user's communication style.
 * POST can override the voice profile.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import {
  getVoicePersonality,
  getVoiceProfiles,
  getVoicePersonalityStats,
  invalidateVoicePersonality,
} from '@/lib/voice/voice-personality';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: authResult.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [personality, profiles, stats] = await Promise.all([
      getVoicePersonality(user.id),
      Promise.resolve(getVoiceProfiles()),
      Promise.resolve(getVoicePersonalityStats()),
    ]);

    return NextResponse.json({
      phase: 18,
      personality,
      availableProfiles: profiles,
      stats,
    });
  } catch (error) {
    console.error('[VoicePersonality API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load voice personality' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: authResult.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json() as { action?: string };
    
    if (body.action === 'refresh') {
      invalidateVoicePersonality(user.id);
      const personality = await getVoicePersonality(user.id);
      return NextResponse.json({ phase: 18, action: 'refreshed', personality });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[VoicePersonality API] POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
