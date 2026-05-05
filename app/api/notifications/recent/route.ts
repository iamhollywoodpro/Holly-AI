import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    let clerkUserId: string | null = null;
    try {
      const authResult = await auth();
      clerkUserId = authResult.userId;
    } catch {}

    if (!clerkUserId && process.env.NODE_ENV === 'development') {
      clerkUserId = 'local-dev-user';
    }

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get('since');
    const limitParam = searchParams.get('limit');
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 5 * 60 * 1000);
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 50);

    try {
      const dbUser = await prisma.user.findUnique({
        where: { clerkUserId },
        select: { id: true },
      });

      if (!dbUser) {
        return NextResponse.json({ notifications: [], unreadCount: 0 });
      }
    } catch (err) {
      console.error('[Notifications API] user lookup error:', err);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    let notifications: any[] = [];
    try {
      notifications = await prisma.notification.findMany({
        where: {
          clerkUserId,
          createdAt: { gte: since },
          status: { not: 'dismissed' },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          category: true,
          priority: true,
          status: true,
          actionUrl: true,
          createdAt: true,
        },
      });
    } catch (err) {
      console.error('[Notifications API] findMany error:', err);
    }

    let unreadCount = 0;
    try {
      unreadCount = await prisma.notification.count({
        where: {
          clerkUserId,
          status: 'unread',
        },
      });
    } catch (err) {
      console.error('[Notifications API] count error:', err);
    }

    return NextResponse.json({
      notifications: notifications.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error('[Notifications API] GET error:', error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let clerkUserId: string | null = null;
    try {
      const authResult = await auth();
      clerkUserId = authResult.userId;
    } catch {}

    if (!clerkUserId && process.env.NODE_ENV === 'development') {
      clerkUserId = 'local-dev-user';
    }

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        clerkUserId,
      },
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notifications API] PATCH error:', error);
    return NextResponse.json({ success: false });
  }
}
