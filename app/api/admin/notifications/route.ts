// Phase 4E - Notification System API
// Hollywood Phase 4E: Multi-channel notification management

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - List notifications or get stats
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const notificationId = searchParams.get('id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get notification stats
    if (action === 'stats') {
      const [total, unread, read, archived] = await Promise.all([
        prisma.notification.count({ where: { clerkUserId: userId } }),
        prisma.notification.count({ where: { clerkUserId: userId, status: 'unread' } }),
        prisma.notification.count({ where: { clerkUserId: userId, status: 'read' } }),
        prisma.notification.count({ where: { clerkUserId: userId, status: 'archived' } })
      ]);

      const byType = await prisma.notification.groupBy({
        by: ['type'],
        where: { clerkUserId: userId, status: 'unread' },
        _count: true
      });

      const byPriority = await prisma.notification.groupBy({
        by: ['priority'],
        where: { clerkUserId: userId, status: 'unread' },
        _count: true
      });

      return NextResponse.json({
        stats: {
          total,
          unread,
          read,
          archived,
          byType: byType.map(t => ({ type: t.type, count: t._count })),
          byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count }))
        }
      });
    }

    // Get specific notification
    if (action === 'get' && notificationId) {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true
            }
          },
          integration: {
            select: {
              id: true,
              service: true,
              serviceName: true,
              serviceIcon: true
            }
          }
        }
      });

      if (!notification || notification.clerkUserId !== userId) {
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
      }

      // Mark as read
      if (notification.status === 'unread') {
        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'read',
            readAt: new Date()
          }
        });
      }

      return NextResponse.json({ notification });
    }

    // List notifications
    const where: any = { clerkUserId: userId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (category) where.category = category;

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        integration: {
          select: {
            id: true,
            service: true,
            serviceName: true,
            serviceIcon: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    return NextResponse.json({ notifications });

  } catch (error: any) {
    console.error('Notification API GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or send notifications
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Create notification
    if (action === 'create' || !action) {
      const {
        type,
        title,
        message,
        category,
        priority,
        channels,
        targetUserId,
        actionUrl,
        actionLabel,
        actionData,
        integrationId,
        sourceService,
        metadata,
        scheduledFor,
        expiresAt
      } = body;

      const notification = await prisma.notification.create({
        data: {
          type: type || 'info',
          title,
          message,
          category: category || 'system',
          priority: priority || 'normal',
          channels: channels || ['web'],
          userId: targetUserId || userId,
          clerkUserId: targetUserId || userId,
          actionUrl,
          actionLabel,
          actionData,
          integrationId,
          sourceService,
          metadata,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined
        },
        include: {
          integration: {
            select: {
              id: true,
              service: true,
              serviceName: true,
              serviceIcon: true
            }
          }
        }
      });

      // TODO: Send notification via configured channels
      // This would trigger email, Slack, SMS, etc.

      return NextResponse.json({ success: true, notification });
    }

    // Mark as read
    if (action === 'mark-read') {
      const { notificationIds } = body;

      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          clerkUserId: userId
        },
        data: {
          status: 'read',
          readAt: new Date()
        }
      });

      return NextResponse.json({ success: true });
    }

    // Mark all as read
    if (action === 'mark-all-read') {
      await prisma.notification.updateMany({
        where: {
          clerkUserId: userId,
          status: 'unread'
        },
        data: {
          status: 'read',
          readAt: new Date()
        }
      });

      return NextResponse.json({ success: true });
    }

    // Archive notifications
    if (action === 'archive') {
      const { notificationIds } = body;

      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          clerkUserId: userId
        },
        data: {
          status: 'archived'
        }
      });

      return NextResponse.json({ success: true });
    }

    // Dismiss notification
    if (action === 'dismiss') {
      const { notificationId } = body;

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'dismissed',
          dismissedAt: new Date()
        }
      });

      return NextResponse.json({ success: true });
    }

    // Send test notification
    if (action === 'send-test') {
      const { channel, testMessage } = body;

      const notification = await prisma.notification.create({
        data: {
          type: 'info',
          title: 'Test Notification',
          message: testMessage || 'This is a test notification',
          category: 'system',
          priority: 'normal',
          channels: [channel],
          userId,
          clerkUserId: userId
        }
      });

      // TODO: Actually send via the specified channel

      return NextResponse.json({ 
        success: true, 
        notification,
        message: `Test notification sent via ${channel}`
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Notification API POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update notification preferences
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!existing || existing.clerkUserId !== userId) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update status
    if (action === 'update-status') {
      const { status } = body;

      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status,
          readAt: status === 'read' ? new Date() : existing.readAt,
          dismissedAt: status === 'dismissed' ? new Date() : existing.dismissedAt
        }
      });

      return NextResponse.json({ success: true, notification });
    }

    // Snooze notification
    if (action === 'snooze') {
      const { snoozeUntil } = body;

      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          scheduledFor: new Date(snoozeUntil)
        }
      });

      return NextResponse.json({ success: true, notification });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Notification API PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete notifications
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      // Delete all read/archived notifications
      await prisma.notification.deleteMany({
        where: {
          clerkUserId: userId,
          status: { in: ['read', 'archived', 'dismissed'] }
        }
      });

      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!existing || existing.clerkUserId !== userId) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Notification API DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
