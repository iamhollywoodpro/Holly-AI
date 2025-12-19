/**
 * NOTIFICATION SYSTEM API - Phase 4E
 * Manage notifications across multiple channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';


export const dynamic = 'force-dynamic';

/**
 * GET - List notifications or get preferences
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Action: Get notification preferences
    if (action === 'preferences') {
      const userPrefs = await prisma.userPreferences.findUnique({
        where: { clerkUserId },
        select: {
          emailNotifications: true,
          pushNotifications: true,
          notificationFrequency: true
        }
      });

      return NextResponse.json({
        preferences: userPrefs || {
          emailNotifications: true,
          pushNotifications: true,
          notificationFrequency: 'real_time'
        }
      });
    }

    // Action: Get notification stats
    if (action === 'stats') {
      const totalNotifications = await prisma.notification.count({
        where: { clerkUserId }
      });

      const unreadCount = await prisma.notification.count({
        where: { 
          clerkUserId,
          status: 'unread'
        }
      });

      const criticalCount = await prisma.notification.count({
        where: {
          clerkUserId,
          priority: 'critical',
          status: 'unread'
        }
      });

      const todayCount = await prisma.notification.count({
        where: {
          clerkUserId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      return NextResponse.json({
        stats: {
          total: totalNotifications,
          unread: unreadCount,
          critical: criticalCount,
          today: todayCount
        }
      });
    }

    // Default: List notifications
    const where: any = { clerkUserId };
    
    if (status) where.status = status;
    if (category) where.category = category;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        category: true,
        priority: true,
        status: true,
        channels: true,
        deliveredVia: true,
        actionUrl: true,
        actionLabel: true,
        sourceService: true,
        groupKey: true,
        readAt: true,
        createdAt: true,
        expiresAt: true
      }
    });

    const totalCount = await prisma.notification.count({ where });

    return NextResponse.json({ 
      notifications,
      count: notifications.length,
      total: totalCount,
      hasMore: offset + limit < totalCount
    });

  } catch (error) {
    console.error('❌ Notification GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST - Send/create new notification
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
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
      scheduledFor,
      expiresAt
    } = body;

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'type, title, and message are required' },
        { status: 400 }
      );
    }

    // Get user ID from clerk user
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        category: category || 'system',
        priority: priority || 'normal',
        channels: channels || ['web'],
        deliveredVia: ['web'], // Initially only web
        userId: user.id,
        clerkUserId,
        actionUrl,
        actionLabel,
        actionData,
        integrationId,
        sourceService,
        metadata,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        sentAt: new Date()
      }
    });

    // TODO: Trigger actual delivery via integrations (email, Slack, etc.)
    // For now, just mark as delivered via web

    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        status: notification.status,
        createdAt: notification.createdAt
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Notification POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update notification (mark as read, dismiss, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId, notificationIds, status, action } = body;

    // Batch update multiple notifications
    if (action === 'mark_all_read') {
      await prisma.notification.updateMany({
        where: {
          clerkUserId,
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

    // Batch update specific notifications
    if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          clerkUserId
        },
        data: {
          status: status || 'read',
          readAt: status === 'read' ? new Date() : undefined,
          dismissedAt: status === 'dismissed' ? new Date() : undefined
        }
      });

      return NextResponse.json({
        success: true,
        updated: notificationIds.length
      });
    }

    // Single notification update
    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!existing || existing.clerkUserId !== clerkUserId) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: status || existing.status,
        readAt: status === 'read' ? new Date() : existing.readAt,
        dismissedAt: status === 'dismissed' ? new Date() : existing.dismissedAt
      }
    });

    return NextResponse.json({
      success: true,
      notification: {
        id: updated.id,
        status: updated.status,
        readAt: updated.readAt
      }
    });

  } catch (error) {
    console.error('❌ Notification PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete notification(s)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const action = searchParams.get('action');

    // Delete all read notifications
    if (action === 'clear_read') {
      const result = await prisma.notification.deleteMany({
        where: {
          clerkUserId,
          status: 'read'
        }
      });

      return NextResponse.json({
        success: true,
        deleted: result.count
      });
    }

    // Delete single notification
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!existing || existing.clerkUserId !== clerkUserId) {
      return NextResponse.json(
        { error: 'Notification not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('❌ Notification DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
