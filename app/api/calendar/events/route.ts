/**
 * Calendar API Endpoint
 * Phase 8.5.2 — Google Calendar event management
 *
 * GET    /api/calendar/events — List upcoming events
 * POST   /api/calendar/events — Create a new event
 * DELETE /api/calendar/events?id=xxx — Delete an event
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createCalendarEvent,
  listUpcomingEvents,
  deleteCalendarEvent,
  getCalendarStatus,
} from '@/lib/integrations/calendar-service';
import { prisma } from '@/lib/db';

async function getUserAccessToken(userId: string): Promise<string | null> {
  try {
    const token = await prisma.userPreference.findFirst({
      where: { userId, preferenceKey: 'google_calendar_access_token' },
    });
    return (token?.value as string) || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = getCalendarStatus();
    if (!status.configured) {
      return NextResponse.json({ error: 'Calendar not configured', status });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId: authResult.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const accessToken = await getUserAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: 'Calendar not authorized', needsAuth: true });
    }

    const events = await listUpcomingEvents(accessToken);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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

    const accessToken = await getUserAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: 'Calendar not authorized', needsAuth: true });
    }

    const body = await req.json();
    const { title, description, startTime, endTime, location, attendees, reminders } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields: title, startTime, endTime' }, { status: 400 });
    }

    const result = await createCalendarEvent(accessToken, {
      title,
      description,
      startTime,
      endTime,
      location,
      attendees,
      reminders,
    });

    if (result.success) {
      return NextResponse.json({ success: true, eventId: result.eventId, link: result.htmlLink });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const accessToken = await getUserAccessToken(user.id);
    if (!accessToken) {
      return NextResponse.json({ error: 'Calendar not authorized' }, { status: 401 });
    }

    const eventId = req.nextUrl.searchParams.get('id');
    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    const result = await deleteCalendarEvent(accessToken, eventId);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
