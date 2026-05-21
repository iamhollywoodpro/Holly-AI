/**
 * Phase 15: Browser Push Subscription Endpoint
 * POST /api/notifications/subscribe — register push subscription
 * DELETE /api/notifications/subscribe — remove push subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { notificationDispatcher } from '@/lib/notifications/notification-dispatcher';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required fields: endpoint, keys.p256dh, keys.auth' },
        { status: 400 }
      );
    }

    // Look up internal user
    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const success = await notificationDispatcher.registerPushSubscription(user.id, {
      endpoint,
      keys,
    });

    if (success) {
      return NextResponse.json({ message: 'Push subscription registered' });
    } else {
      return NextResponse.json({ error: 'Failed to register subscription' }, { status: 500 });
    }
  } catch (error) {
    console.error('[Notifications/Subscribe] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.pushSubscription.updateMany({
      where: { userId: user.id, endpoint },
      data: { active: false },
    });

    return NextResponse.json({ message: 'Push subscription removed' });
  } catch (error) {
    console.error('[Notifications/Subscribe] Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
