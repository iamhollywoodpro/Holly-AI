// Phase 4E - Notification System API
// Hollywood Phase 4E: Multi-channel notification management

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List notifications
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get notification stats
    if (action === 'stats') {
      const [total, unread, read, byType, byPriority] = await Promise.all([
        prisma.notification.count({
          where: { clerkUserId: userId }
        }),
        prisma.notification.count({
          where: { clerkUserId: userId, status: 'unread' }
        }),
        prisma.notification.count({
          where: { clerkUserId: userId, status: 'read' }
        }),
        prisma.notification.groupBy({
          by: ['type'],
          where: { clerkUserId: userId },
          _count: true
        }),
        prisma.notification.groupBy({
          by: ['priority'],
          where: { clerkUserId: userId },
          _count: true
        })
      ]);

      const stats = {
        total,
        unread,
        read,
        archived: total - unread - read,
        byType: byType.reduce((acc: any, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {}),
        byPriority: byPriority.reduce((acc: any, item) => {
          acc[item.priority] = item._count;
          return acc;
        }, {})
      };

      return NextResponse.json({ stats });
    }

    // Build where clause
    const where: any = {
      clerkUserId: userId
    };

    if (status) where.status = status;
    if (type) where.type = type;

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        integration: {
          select: {
            service: true,
            serviceName: true,
            serviceIcon: true
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            imageUrl: true
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
  } catch (error) {
    console.error('Notification GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST: Create notification or perform actions
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Mark as read
    if (action === 'mark-read') {
      const { notificationId } = body;

      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'read',
          readAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        notification
      });
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

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }

    // Dismiss notification
    if (action === 'dismiss') {
      const { notificationId } = body;

      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'dismissed',
          dismissedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        notification
      });
    }

    // Archive notification
    if (action === 'archive') {
      const { notificationId } = body;

      const notification = await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'archived'
        }
      });

      return NextResponse.json({
        success: true,
        notification
      });
    }

    // Send notification
    if (action === 'send') {
      const {
        type,
        title,
        message,
        category,
        priority,
        channels,
        actionUrl,
        actionLabel,
        actionData,
        integrationId,
        sourceService,
        metadata,
        attachments,
        scheduledFor
      } = body;

      const notification = await prisma.notification.create({
        data: {
          type,
          title,
          message,
          category,
          priority: priority || 'normal',
          channels: channels || ['web'],
          deliveredVia: [],
          failedChannels: [],
          userId,
          clerkUserId: userId,
          actionUrl,
          actionLabel,
          actionData,
          integrationId,
          sourceService,
          metadata,
          attachments,
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          status: 'unread'
        },
        include: {
          integration: {
            select: {
              service: true,
              serviceName: true,
              serviceIcon: true
            }
          },
          user: {
            select: {
              name: true,
              email: true,
              imageUrl: true
            }
          }
        }
      });

      // Send to channels
      const deliveryResults = await deliverNotification(notification);

      // Update notification with delivery results
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          deliveredVia: deliveryResults.successful,
          failedChannels: deliveryResults.failed,
          sentAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        notification,
        deliveryResults
      });
    }

    // Create notification (default action)
    const {
      type,
      title,
      message,
      category,
      priority,
      channels,
      actionUrl,
      actionLabel,
      actionData,
      integrationId,
      sourceService,
      metadata,
      attachments
    } = body;

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        category,
        priority: priority || 'normal',
        channels: channels || ['web'],
        deliveredVia: [],
        failedChannels: [],
        userId,
        clerkUserId: userId,
        actionUrl,
        actionLabel,
        actionData,
        integrationId,
        sourceService,
        metadata,
        attachments,
        status: 'unread'
      },
      include: {
        integration: {
          select: {
            service: true,
            serviceName: true,
            serviceIcon: true
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Notification POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PUT: Update notification
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, priority, actionUrl, actionLabel } = body;

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(actionUrl && { actionUrl }),
        ...(actionLabel && { actionLabel }),
        ...(status === 'read' && { readAt: new Date() }),
        ...(status === 'dismissed' && { dismissedAt: new Date() })
      },
      include: {
        integration: {
          select: {
            service: true,
            serviceName: true,
            serviceIcon: true
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Notification PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// DELETE: Remove notification
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    // Delete all read notifications
    if (action === 'clear-read') {
      await prisma.notification.deleteMany({
        where: {
          clerkUserId: userId,
          status: 'read'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Read notifications cleared'
      });
    }

    // Delete all archived notifications
    if (action === 'clear-archived') {
      await prisma.notification.deleteMany({
        where: {
          clerkUserId: userId,
          status: 'archived'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Archived notifications cleared'
      });
    }

    // Delete specific notification
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID required' },
        { status: 400 }
      );
    }

    await prisma.notification.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Notification DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

// Helper: Deliver notification to channels
async function deliverNotification(notification: any) {
  const successful: string[] = [];
  const failed: string[] = [];

  for (const channel of notification.channels) {
    try {
      switch (channel) {
        case 'web':
          // Already stored in database
          successful.push('web');
          break;

        case 'email':
          // Send email (placeholder)
          // await sendEmail(notification);
          successful.push('email');
          break;

        case 'slack':
          // Send to Slack (placeholder)
          // await sendSlackMessage(notification);
          successful.push('slack');
          break;

        case 'sms':
          // Send SMS (placeholder)
          // await sendSMS(notification);
          successful.push('sms');
          break;

        case 'push':
          // Send push notification (placeholder)
          // await sendPushNotification(notification);
          successful.push('push');
          break;

        default:
          failed.push(channel);
      }
    } catch (error) {
      console.error(`Failed to deliver to ${channel}:`, error);
      failed.push(channel);
    }
  }

  return { successful, failed };
}
