/**
 * Mood Tracker Plugin API Routes
 *
 * GET  /api/plugins/holly-mood-tracker          — Get mood summary or recent entries
 * POST /api/plugins/holly-mood-tracker          — Log a mood entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { moodTrackerService } from '@/lib/plugins/implementations/holly-mood-tracker';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'summary';
    const days = parseInt(searchParams.get('days') || '7', 10);

    if (mode === 'entries') {
      const entries = await moodTrackerService.getRecentMoods(user.id, days);
      return NextResponse.json({ entries });
    }

    if (mode === 'trend') {
      const trend = await moodTrackerService.analyzeTrend(user.id, days);
      return NextResponse.json(trend || { error: 'Not enough data for trend analysis' });
    }

    // Default: summary
    const summary = await moodTrackerService.getSummary(user.id);
    return NextResponse.json(summary || { totalEntries: 0, message: 'No mood entries yet. Start by logging your first mood!' });
  } catch (error) {
    console.error('[MoodTracker] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { mood, intensity, source, note, tags } = await req.json();

    if (!mood) {
      return NextResponse.json({ error: 'mood required' }, { status: 400 });
    }

    const entry = await moodTrackerService.logMood(
      user.id,
      mood,
      typeof intensity === 'number' ? intensity : 0.5,
      source || 'checkin',
      note,
      tags,
    );

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('[MoodTracker] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
