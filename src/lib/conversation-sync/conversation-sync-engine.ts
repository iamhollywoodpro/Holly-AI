/**
 * Phase 19: Conversation Continuity Across Devices
 *
 * Enables seamless conversation resumption across devices.
 * Holly picks up exactly where you left off, regardless of device.
 *
 * Components:
 * - Sync points: per-device cursors tracking last read position
 * - Resume state: the context needed to continue a conversation
 * - Active conversation tracking: which conversation is open on which device
 */

import { prisma } from '@/lib/db';

// ── Types ──────────────────────────────────────────────────────────────

export interface SyncPoint {
  conversationId: string;
  lastMessageId: string;
  lastMessageAt: Date;
  device: string;
  platform: string;
  syncedAt: Date;
}

export interface ResumeState {
  conversationId: string;
  title: string | null;
  lastMessages: Array<{
    id: string;
    role: string;
    content: string;
    emotion: string | null;
    createdAt: Date;
  }>;
  lastActiveAt: Date;
  messageCount: number;
  unreadCount: number;
  summary: string | null;
  relationshipContext: string | null;
  activeDevices: number;
}

export interface DeviceSession {
  device: string;
  platform: string;
  lastActiveAt: Date;
  currentConversationId: string | null;
}

// ── Sync Point Management ──────────────────────────────────────────────

/**
 * Create or update a sync point for a device reading a conversation.
 * Called every time a user views or receives messages in a conversation.
 */
export async function updateSyncPoint(params: {
  userId: string;
  conversationId: string;
  lastMessageId: string;
  device: string;
  platform: string;
}): Promise<void> {
  const key = `${params.userId}:${params.device}:${params.conversationId}`;

  try {
    await prisma.conversationSyncPoint.upsert({
      where: { id: key },
      create: {
        id: key,
        userId: params.userId,
        conversationId: params.conversationId,
        lastMessageId: params.lastMessageId,
        device: params.device,
        platform: params.platform,
        syncedAt: new Date(),
      },
      update: {
        lastMessageId: params.lastMessageId,
        syncedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[ConversationSync] Failed to update sync point:', error);
  }
}

/**
 * Get the sync point for a specific device and conversation.
 */
export async function getSyncPoint(
  userId: string,
  conversationId: string,
  device: string,
): Promise<SyncPoint | null> {
  const key = `${userId}:${device}:${conversationId}`;

  try {
    const point = await prisma.conversationSyncPoint.findUnique({
      where: { id: key },
    });

    if (!point) return null;

    return {
      conversationId: point.conversationId,
      lastMessageId: point.lastMessageId,
      lastMessageAt: point.syncedAt,
      device: point.device,
      platform: point.platform,
      syncedAt: point.syncedAt,
    };
  } catch (error) {
    console.error('[ConversationSync] Failed to get sync point:', error);
    return null;
  }
}

// ── Resume State ───────────────────────────────────────────────────────

/**
 * Get the full resume state for a user — everything needed to pick up
 * where they left off on any device.
 */
export async function getResumeState(
  userId: string,
  device: string,
  platform: string,
): Promise<ResumeState | null> {
  try {
    // Find the most recently active conversation for this user
    const lastConversation = await prisma.conversation.findFirst({
      where: { userId, archived: false },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        summary: true,
      },
    });

    if (!lastConversation) return null;

    // Get the sync point for this device (what they've already seen)
    const syncPoint = await getSyncPoint(userId, lastConversation.id, device);

    // Calculate unread: messages after the last sync point
    let unreadCount = 0;
    if (syncPoint) {
      const afterSync = lastConversation.messages.findIndex(
        (m) => m.id === syncPoint.lastMessageId,
      );
      // Messages are desc ordered, so index 0 is newest
      // Count = messages before the sync point in desc order
      unreadCount = afterSync >= 0
        ? lastConversation.messages.length - (lastConversation.messages.length - afterSync)
        : lastConversation.messages.length;
    } else {
      // No sync point = all messages are "new" on this device
      unreadCount = lastConversation.messages.length;
    }

    // Get relationship context
    const relationshipProfile = await prisma.relationshipProfile.findUnique({
      where: { userId },
    });

    // Get active device sessions
    const activeDevices = await getActiveDevices(userId);

    // Update sync point for this device
    const latestMessage = lastConversation.messages[0];
    if (latestMessage) {
      await updateSyncPoint({
        userId,
        conversationId: lastConversation.id,
        lastMessageId: latestMessage.id,
        device,
        platform,
      });
    }

    return {
      conversationId: lastConversation.id,
      title: lastConversation.title,
      lastMessages: lastConversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        emotion: m.emotion,
        createdAt: m.createdAt,
      })),
      lastActiveAt: lastConversation.updatedAt,
      messageCount: lastConversation.messageCount,
      unreadCount,
      summary: lastConversation.summary?.summary ?? null,
      relationshipContext: relationshipProfile
        ? JSON.stringify({
            depth: relationshipProfile.relationshipDepth,
            trust: relationshipProfile.trustLevel,
            style: relationshipProfile.communicationStyle,
          })
        : null,
      activeDevices: activeDevices.length,
    };
  } catch (error) {
    console.error('[ConversationSync] Failed to get resume state:', error);
    return null;
  }
}

// ── Device Tracking ────────────────────────────────────────────────────

/**
 * Get all active device sessions for a user (active in last 30 minutes).
 */
export async function getActiveDevices(userId: string): Promise<DeviceSession[]> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  try {
    const sessions = await prisma.userSession.findMany({
      where: {
        clerkUserId: userId,
        endedAt: null,
        startedAt: { gte: thirtyMinAgo },
      },
      orderBy: { startedAt: 'desc' },
      select: {
        device: true,
        os: true,
        startedAt: true,
        endedAt: true,
      },
    });

    return sessions.map((s) => ({
      device: s.device ?? 'unknown',
      platform: s.os ?? 'unknown',
      lastActiveAt: s.startedAt,
      currentConversationId: null,
    }));
  } catch (error) {
    console.error('[ConversationSync] Failed to get active devices:', error);
    return [];
  }
}

/**
 * Get unread counts across all conversations for a user on a specific device.
 */
export async function getUnreadCounts(
  userId: string,
  device: string,
): Promise<Array<{ conversationId: string; unread: number; title: string | null }>> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId, archived: false },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, createdAt: true },
        },
      },
    });

    const results: Array<{ conversationId: string; unread: number; title: string | null }> = [];

    for (const conv of conversations) {
      if (conv.messages.length === 0) continue;

      const syncPoint = await prisma.conversationSyncPoint.findUnique({
        where: { id: `${userId}:${device}:${conv.id}` },
      });

      // If no sync point or last message is newer than sync, count as unread
      const hasUnread = !syncPoint ||
        conv.messages[0].createdAt > syncPoint.syncedAt;

      if (hasUnread) {
        results.push({
          conversationId: conv.id,
          unread: 1, // At least 1 unread (simplified)
          title: conv.title,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[ConversationSync] Failed to get unread counts:', error);
    return [];
  }
}

// ── Stats ──────────────────────────────────────────────────────────────

export async function getSyncStats(userId: string): Promise<{
  totalSyncPoints: number;
  activeDevices: number;
  lastSyncAt: Date | null;
}> {
  try {
    const [syncPoints, devices] = await Promise.all([
      prisma.conversationSyncPoint.findMany({
        where: { userId },
        orderBy: { syncedAt: 'desc' },
        take: 1,
      }),
      getActiveDevices(userId),
    ]);

    return {
      totalSyncPoints: await prisma.conversationSyncPoint.count({
        where: { userId },
      }),
      activeDevices: devices.length,
      lastSyncAt: syncPoints[0]?.syncedAt ?? null,
    };
  } catch (error) {
    console.error('[ConversationSync] Failed to get sync stats:', error);
    return { totalSyncPoints: 0, activeDevices: 0, lastSyncAt: null };
  }
}
