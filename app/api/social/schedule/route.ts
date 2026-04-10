/**
 * POST /api/social/schedule
 * GET  /api/social/schedule
 * DELETE /api/social/schedule?id=...
 *
 * HOLLY Social Post Scheduler
 * Schedule posts to go out at specific times across connected platforms.
 *
 * Request body (POST):
 * {
 *   platforms: string[]
 *   content: { caption, mediaUrl?, mediaType?, hashtags?, title? }
 *   scheduledAt: string  — ISO 8601 datetime
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST — create a scheduled post */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { platforms, content, scheduledAt } = body;

    if (!platforms?.length || !content?.caption || !scheduledAt) {
      return NextResponse.json(
        { error: 'platforms, content.caption, and scheduledAt are required' },
        { status: 400 },
      );
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'scheduledAt must be a valid future datetime' },
        { status: 400 },
      );
    }

    // Find the DB user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Store scheduled post
    // Uses ScheduledContent model if available, otherwise falls back to a simple record
    // Note: This uses the analytics/insights models as a general event store
    const record = await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'social_post_scheduled',
        details: {
          platforms,
          content,
          scheduledAt: scheduledDate.toISOString(),
          status: 'pending',
          resource: 'social',
          resourceId: `scheduled-${Date.now()}`,
          userAgent: req.headers.get('user-agent') ?? 'HOLLY',
        },
        ipAddress: req.headers.get('x-forwarded-for') ?? 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      scheduleId: record.id,
      scheduledAt: scheduledDate.toISOString(),
      platforms,
      message: `Post scheduled for ${scheduledDate.toLocaleString()}`,
    });
  } catch (err: any) {
    console.error('[Social Schedule] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** GET — list scheduled posts */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ scheduled: [] });

    const scheduled = await prisma.auditLog.findMany({
      where: {
        userId: user.id,
        action: 'social_post_scheduled',
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        id: true,
        details: true,
        timestamp: true,
      },
    });

    const posts = scheduled.map(s => ({
      id: s.id,
      ...((s.details as any) ?? {}),
      createdAt: s.timestamp,
    }));

    return NextResponse.json({ scheduled: posts, count: posts.length });
  } catch (err: any) {
    console.error('[Social Schedule] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** DELETE — cancel a scheduled post */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const deleted = await prisma.auditLog.deleteMany({
      where: { id, userId: user.id, action: 'social_post_scheduled' },
    });

    return NextResponse.json({ cancelled: deleted.count > 0, id });
  } catch (err: any) {
    console.error('[Social Schedule] DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
