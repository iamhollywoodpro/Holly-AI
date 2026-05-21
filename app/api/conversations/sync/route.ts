/**
 * GET /api/conversations/sync — Phase 19: Conversation Continuity
 *
 * Returns the resume state for the current device.
 * Any device can pick up exactly where another left off.
 *
 * Query params:
 *   device   — device identifier (e.g. "iphone-15", "macbook-pro")
 *   platform — "ios" | "android" | "macos" | "windows" | "linux" | "web"
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user-manager';
import { getResumeState, getUnreadCounts, getSyncStats } from '@/lib/conversation-sync/conversation-sync-engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getOrCreateUser(authResult.userId);
    const device = request.nextUrl.searchParams.get('device') || 'unknown';
    const platform = request.nextUrl.searchParams.get('platform') || 'web';

    const [resumeState, unreadCounts, stats] = await Promise.all([
      getResumeState(user.id, device, platform),
      getUnreadCounts(user.id, device),
      getSyncStats(user.id),
    ]);

    return NextResponse.json({
      phase: 19,
      resume: resumeState,
      unread: unreadCounts,
      stats,
    });
  } catch (error) {
    console.error('[ConversationSync API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load sync state' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/conversations/sync — Update sync point for current device
 *
 * Body:
 *   conversationId — which conversation is being viewed
 *   lastMessageId  — last message the user has seen
 *   device         — device identifier
 *   platform       — platform identifier
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getOrCreateUser(authResult.userId);
    const body = await request.json() as {
      conversationId?: string;
      lastMessageId?: string;
      device?: string;
      platform?: string;
    };

    if (!body.conversationId || !body.lastMessageId) {
      return NextResponse.json(
        { error: 'conversationId and lastMessageId required' },
        { status: 400 },
      );
    }

    const { updateSyncPoint } = await import('@/lib/conversation-sync/conversation-sync-engine');

    await updateSyncPoint({
      userId: user.id,
      conversationId: body.conversationId,
      lastMessageId: body.lastMessageId,
      device: body.device || 'unknown',
      platform: body.platform || 'web',
    });

    return NextResponse.json({ phase: 19, synced: true });
  } catch (error) {
    console.error('[ConversationSync API] POST error:', error);
    return NextResponse.json({ error: 'Failed to sync' }, { status: 500 });
  }
}
