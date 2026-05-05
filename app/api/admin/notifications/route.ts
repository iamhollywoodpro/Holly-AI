/**
 * NOTIFICATION SYSTEM API - Phase 4E
 * Manage notifications across multiple channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Delivery helpers ─────────────────────────────────────────────────────────

/**
 * Send an email notification.
 * Uses Resend API when RESEND_API_KEY is set,
 * otherwise falls back to a generic SMTP-over-fetch approach.
 * Returns true on success, false on failure (non-fatal).
 */
async function deliverEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'notifications@holly.ai';

  if (!resendKey) {
    // SMTP fallback via Nodemailer-style env vars
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('[Notifications] No email provider configured (set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS)');
      return false;
    }

    // Nodemailer (available in Node runtime)
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({ from: fromEmail, to, subject, html });
      return true;
    } catch (err: unknown) {
      console.error('[Notifications] SMTP delivery failed:', (err as Error).message);
      return false;
    }
  }

  // Resend API
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromEmail, to, subject, html }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[Notifications] Resend error:', err);
      return false;
    }
    return true;
  } catch (err: unknown) {
    console.error('[Notifications] Resend delivery failed:', (err as Error).message);
    return false;
  }
}

/**
 * Send a Slack notification via incoming webhook.
 * Requires SLACK_WEBHOOK_URL environment variable.
 * Returns true on success, false on failure (non-fatal).
 */
async function deliverSlack(
  title: string,
  message: string,
  priority: string,
  actionUrl?: string
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('[Notifications] SLACK_WEBHOOK_URL not configured — skipping Slack delivery');
    return false;
  }

  const emoji = priority === 'critical' ? '🚨' : priority === 'high' ? '⚠️' : 'ℹ️';
  const blocks: object[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${title}*\n${message}`,
      },
    },
  ];
  if (actionUrl) {
    blocks.push({
      type: 'actions',
      elements: [{
        type: 'button',
        text: { type: 'plain_text', text: 'View →' },
        url: actionUrl,
      }],
    });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    if (!res.ok) {
      console.error('[Notifications] Slack webhook failed:', res.status);
      return false;
    }
    return true;
  } catch (err: unknown) {
    console.error('[Notifications] Slack delivery error:', (err as Error).message);
    return false;
  }
}

/**
 * Build a simple HTML email body for a notification.
 */
function buildEmailHtml(title: string, message: string, actionUrl?: string, actionLabel?: string): string {
  const actionBlock = actionUrl
    ? `<p style="margin-top:16px;"><a href="${actionUrl}" style="background:#7c3aed;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:14px;">${actionLabel || 'View'}</a></p>`
    : '';
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f9fafb;padding:32px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <h2 style="margin:0 0 12px;color:#1f2937;">🤖 HOLLY Notification</h2>
    <h3 style="margin:0 0 8px;color:#374151;">${title}</h3>
    <p style="color:#4b5563;line-height:1.6;">${message}</p>
    ${actionBlock}
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
    <p style="font-size:12px;color:#9ca3af;">Sent by HOLLY AI • <a href="https://holly.nexamusicgroup.com/settings" style="color:#6b7280;">Manage notifications</a></p>
  </div>
</body>
</html>`;
}

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

    // ── Real delivery via email + Slack ─────────────────────────────────────
    const requestedChannels: string[] = channels || ['web'];
    const deliveredViaSet = new Set<string>(['web']);

    // Get user email from DB for email delivery
    const userWithEmail = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, email: true },
    });
    const userEmail = userWithEmail?.email;

    // Email delivery
    if (requestedChannels.includes('email') && userEmail) {
      const html = buildEmailHtml(
        title,
        message,
        actionUrl as string | undefined,
        actionLabel as string | undefined
      );
      const sent = await deliverEmail(userEmail, title, html);
      if (sent) deliveredViaSet.add('email');
    }

    // Slack delivery (for critical/high priority OR when explicitly requested)
    const shouldSlack =
      requestedChannels.includes('slack') ||
      (priority === 'critical') ||
      (priority === 'high' && process.env.SLACK_NOTIFY_HIGH === 'true');

    if (shouldSlack) {
      const sent = await deliverSlack(
        title,
        message,
        priority || 'normal',
        actionUrl as string | undefined
      );
      if (sent) deliveredViaSet.add('slack');
    }

    // Update deliveredVia on the notification record
    const deliveredViaArray = Array.from(deliveredViaSet);
    await prisma.notification.update({
      where: { id: notification.id },
      data: { deliveredVia: deliveredViaArray },
    });

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
