/**
 * Phase 15: Notification Preferences Endpoint
 * GET /api/notifications/preferences — get current notification preferences
 * PUT /api/notifications/preferences — update notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { notificationDispatcher } from '@/lib/notifications/notification-dispatcher';

export async function GET() {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await notificationDispatcher.getUserPreferences(clerkUserId);
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('[Notifications/Preferences] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate that only known preference keys are passed
    const allowedKeys = [
      'proactiveInsights',
      'morningBriefing',
      'studyUpdates',
      'goalReminders',
      'emailDigest',
      'browserPush',
      'quietHoursStart',
      'quietHoursEnd',
    ];

    const filtered: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (key in body) {
        filtered[key] = body[key];
      }
    }

    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'No valid preferences provided' }, { status: 400 });
    }

    await notificationDispatcher.setUserPreferences(clerkUserId, filtered);

    const updated = await notificationDispatcher.getUserPreferences(clerkUserId);
    return NextResponse.json({ preferences: updated });
  } catch (error) {
    console.error('[Notifications/Preferences] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
