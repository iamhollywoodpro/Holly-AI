/**
 * Conversation Backup & Recovery Service
 * Phase 8.7.1 — Automatic conversation backup to prevent data loss
 *
 * Provides:
 * - JSON export of all conversations with messages
 * - Point-in-time recovery
 * - User ID migration (for Clerk ID changes)
 */

import { prisma } from '@/lib/db';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = join(process.cwd(), 'backups', 'conversations');

interface ConversationBackup {
  version: string;
  exportedAt: string;
  totalConversations: number;
  totalMessages: number;
  conversations: Array<{
    id: string;
    title: string;
    userId: string;
    clerkUserId: string;
    userName: string;
    messageCount: number;
    lastMessagePreview: string | null;
    createdAt: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: string;
    }>;
  }>;
}

/**
 * Export all conversations for a specific user to JSON
 */
export async function exportUserConversations(dbUserId: string): Promise<ConversationBackup> {
  const conversations = await prisma.conversation.findMany({
    where: { userId: dbUserId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
      user: {
        select: { clerkUserId: true, name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const backup: ConversationBackup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    totalConversations: conversations.length,
    totalMessages: conversations.reduce((sum, c) => sum + c.messages.length, 0),
    conversations: conversations.map(c => ({
      id: c.id,
      title: c.title || 'Untitled',
      userId: c.userId,
      clerkUserId: c.user?.clerkUserId || 'unknown',
      userName: c.user?.name || 'Unknown',
      messageCount: c.messageCount,
      lastMessagePreview: c.lastMessagePreview,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messages: c.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
  };

  return backup;
}

/**
 * Export all conversations in the database (admin)
 */
export async function exportAllConversations(): Promise<ConversationBackup> {
  const conversations = await prisma.conversation.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
      user: {
        select: { clerkUserId: true, name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 500, // Safety limit
  });

  const backup: ConversationBackup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    totalConversations: conversations.length,
    totalMessages: conversations.reduce((sum, c) => sum + c.messages.length, 0),
    conversations: conversations.map(c => ({
      id: c.id,
      title: c.title || 'Untitled',
      userId: c.userId,
      clerkUserId: c.user?.clerkUserId || 'unknown',
      userName: c.user?.name || 'Unknown',
      messageCount: c.messageCount,
      lastMessagePreview: c.lastMessagePreview,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      messages: c.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    })),
  };

  return backup;
}

/**
 * Save backup to disk
 */
export function saveBackupToFile(backup: ConversationBackup, filename?: string): string {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const fname = filename || `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = join(BACKUP_DIR, fname);
  writeFileSync(filepath, JSON.stringify(backup, null, 2));
  return filepath;
}

/**
 * Load backup from disk
 */
export function loadBackupFromFile(filepath: string): ConversationBackup {
  if (!existsSync(filepath)) {
    throw new Error(`Backup file not found: ${filepath}`);
  }
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

/**
 * Migrate conversations from one user ID to another
 * Use case: Clerk user ID changed after re-authentication
 */
export async function migrateConversations(
  oldDbUserId: string,
  newDbUserId: string
): Promise<{ migrated: number; errors: string[] }> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Update conversations
    const convResult = await prisma.conversation.updateMany({
      where: { userId: oldDbUserId },
      data: { userId: newDbUserId },
    });
    migrated += convResult.count;

    // Update messages
    const msgResult = await prisma.message.updateMany({
      where: { userId: oldDbUserId },
      data: { userId: newDbUserId },
    });
    migrated += msgResult.count;

    // Update conversation summaries
    try {
      const summaryResult = await prisma.conversationSummary.updateMany({
        where: { userId: oldDbUserId },
        data: { userId: newDbUserId },
      });
      migrated += summaryResult.count;
    } catch {
      // conversationSummary may not have userId — ignore
    }

    // Update memories
    try {
      const memResult = await prisma.memory.updateMany({
        where: { userId: oldDbUserId },
        data: { userId: newDbUserId },
      });
      migrated += memResult.count;
    } catch {
      // Memory table may not exist — ignore
    }
  } catch (error) {
    errors.push(`Migration error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { migrated, errors };
}

/**
 * Import conversations from a backup file
 */
export async function importConversations(
  backup: ConversationBackup,
  targetDbUserId: string,
  options: { skipExisting?: boolean; maxImport?: number } = {}
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const { skipExisting = true, maxImport = 100 } = options;
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (const conv of backup.conversations.slice(0, maxImport)) {
    try {
      if (skipExisting) {
        const existing = await prisma.conversation.findUnique({ where: { id: conv.id } });
        if (existing) {
          skipped++;
          continue;
        }
      }

      // Create conversation
      await prisma.conversation.upsert({
        where: { id: conv.id },
        create: {
          id: conv.id,
          title: conv.title,
          userId: targetDbUserId,
          messageCount: conv.messageCount,
          lastMessagePreview: conv.lastMessagePreview,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
        },
        update: {
          title: conv.title,
          messageCount: conv.messageCount,
          lastMessagePreview: conv.lastMessagePreview,
        },
      });

      // Create messages
      for (const msg of conv.messages) {
        try {
          await prisma.message.upsert({
            where: { id: msg.id },
            create: {
              id: msg.id,
              conversationId: conv.id,
              userId: targetDbUserId,
              role: msg.role,
              content: msg.content,
              createdAt: new Date(msg.createdAt),
            },
            update: {},
          });
        } catch (msgErr) {
          errors.push(`Message ${msg.id}: ${msgErr instanceof Error ? msgErr.message : String(msgErr)}`);
        }
      }

      imported++;
    } catch (convErr) {
      errors.push(`Conversation ${conv.id}: ${convErr instanceof Error ? convErr.message : String(convErr)}`);
    }
  }

  return { imported, skipped, errors };
}
