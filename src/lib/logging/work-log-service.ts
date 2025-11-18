/**
 * HOLLY Work Log Service
 * 
 * Manages activity logging with 90-day tiered retention:
 * - Hot Storage (7 days): Full detail, instant access
 * - Warm Storage (30 days): Compressed, queryable
 * - Cold Archive (90 days): S3/Blob, minimal metadata
 * - Deleted (90+ days): GDPR compliance
 * 
 * @author HOLLY AI System
 */

import { PrismaClient } from '@prisma/client';
import { canCreateLog } from './rate-limiter';

const prisma = new PrismaClient();

// Log types - what kind of activity
export type WorkLogType =
  | 'ai_response'      // AI model generating response
  | 'tool_call'        // Function/tool execution (image, music, video)
  | 'file_operation'   // Upload/download operations
  | 'deployment'       // Build/deploy activities
  | 'error'            // Errors and exceptions
  | 'info';            // General information

// Status indicators
export type WorkLogStatus =
  | 'working'   // 🔧 In progress
  | 'success'   // ✅ Completed successfully
  | 'warning'   // ⚠️  Warning or fallback used
  | 'error'     // ❌ Failed
  | 'info';     // 📊 Informational

// Storage tiers
export type StorageStatus = 'hot' | 'warm' | 'cold' | 'archived';

export interface CreateLogOptions {
  userId: string;
  conversationId?: string;
  logType: WorkLogType;
  status: WorkLogStatus;
  title: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface WorkLogEntry {
  id: string;
  userId: string;
  conversationId: string | null;
  logType: string;
  status: string;
  title: string;
  details: string | null;
  metadata: any;
  storageStatus: string;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Create a new work log entry
 */
export async function createWorkLog(options: CreateLogOptions): Promise<WorkLogEntry> {
  const {
    userId,
    conversationId,
    logType,
    status,
    title,
    details,
    metadata
  } = options;

  // Rate limiting check
  const rateLimitCheck = canCreateLog(userId, title);
  if (!rateLimitCheck.allowed) {
    console.warn(`[WorkLogService] Rate limit: ${rateLimitCheck.reason}`);
    // Return a mock entry instead of throwing (graceful degradation)
    return {
      id: 'rate-limited',
      userId,
      conversationId: conversationId || null,
      logType,
      status,
      title,
      details: details || null,
      metadata: metadata || {},
      storageStatus: 'hot',
      timestamp: new Date(),
      createdAt: new Date(),
    } as WorkLogEntry;
  }

  // Calculate expiration based on storage tier
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    const log = await prisma.workLog.create({
      data: {
        userId,
        conversationId: conversationId || null,
        logType,
        status,
        title,
        details: details || null,
        metadata: metadata || {},
        storageStatus: 'hot',
        compressionLevel: 0,
        timestamp: now,
        expiresAt,
      },
    });

    // Update stats
    await updateStats('created');

    return log as WorkLogEntry;
  } catch (error) {
    console.error('[WorkLogService] Failed to create log:', error);
    throw error;
  }
}

/**
 * Get recent logs for a user
 */
export async function getRecentLogs(
  userId: string,
  options?: {
    conversationId?: string;
    limit?: number;
    logTypes?: WorkLogType[];
  }
): Promise<WorkLogEntry[]> {
  const { conversationId, limit = 50, logTypes } = options || {};

  try {
    const logs = await prisma.workLog.findMany({
      where: {
        userId,
        ...(conversationId ? { conversationId } : {}),
        ...(logTypes ? { logType: { in: logTypes } } : {}),
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return logs as WorkLogEntry[];
  } catch (error) {
    console.error('[WorkLogService] Failed to fetch logs:', error);
    return [];
  }
}

/**
 * Get logs for a specific conversation
 */
export async function getConversationLogs(
  conversationId: string,
  limit = 100
): Promise<WorkLogEntry[]> {
  try {
    const logs = await prisma.workLog.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        timestamp: 'asc', // Chronological for conversation view
      },
      take: limit,
    });

    return logs as WorkLogEntry[];
  } catch (error) {
    console.error('[WorkLogService] Failed to fetch conversation logs:', error);
    return [];
  }
}

/**
 * Delete old logs (cleanup cron job)
 * Hot → Warm → Cold → Delete
 */
export async function cleanupExpiredLogs(): Promise<{
  deleted: number;
  movedToWarm: number;
  movedToCold: number;
}> {
  const now = new Date();
  
  try {
    // Delete logs older than 90 days
    const deleted = await prisma.workLog.deleteMany({
      where: {
        timestamp: {
          lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Move hot → warm (7+ days old)
    const movedToWarm = await prisma.workLog.updateMany({
      where: {
        storageStatus: 'hot',
        timestamp: {
          lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      data: {
        storageStatus: 'warm',
        compressionLevel: 1,
        // In production: compress details field here
      },
    });

    // Move warm → cold (30+ days old)
    const movedToCold = await prisma.workLog.updateMany({
      where: {
        storageStatus: 'warm',
        timestamp: {
          lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      data: {
        storageStatus: 'cold',
        compressionLevel: 2,
        archivedAt: now,
        // In production: move to S3/Blob storage here
      },
    });

    // Update stats
    await prisma.workLogStats.update({
      where: { id: 'global_stats' },
      data: {
        lastCleanupRun: now,
        hotStorageCount: await prisma.workLog.count({ where: { storageStatus: 'hot' } }),
        warmStorageCount: await prisma.workLog.count({ where: { storageStatus: 'warm' } }),
        coldStorageCount: await prisma.workLog.count({ where: { storageStatus: 'cold' } }),
      },
    });

    return {
      deleted: deleted.count,
      movedToWarm: movedToWarm.count,
      movedToCold: movedToCold.count,
    };
  } catch (error) {
    console.error('[WorkLogService] Cleanup failed:', error);
    throw error;
  }
}

/**
 * Update system stats (atomic operations)
 */
async function updateStats(operation: 'created' | 'deleted'): Promise<void> {
  try {
    if (operation === 'created') {
      await prisma.workLogStats.upsert({
        where: { id: 'global_stats' },
        create: {
          id: 'global_stats',
          totalLogsCreated: 1,
          hotStorageCount: 1,
          warmStorageCount: 0,
          coldStorageCount: 0,
          totalSizeBytes: 0,
          updatedAt: new Date(),
        },
        update: {
          totalLogsCreated: { increment: 1 },
          hotStorageCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    // Stats are non-critical, don't throw
    console.warn('[WorkLogService] Stats update failed:', error);
  }
}

/**
 * Get system stats
 */
export async function getSystemStats() {
  try {
    return await prisma.workLogStats.findUnique({
      where: { id: 'global_stats' },
    });
  } catch (error) {
    console.error('[WorkLogService] Failed to fetch stats:', error);
    return null;
  }
}

/**
 * Helper: Create a "working" status log
 */
export async function logWorking(
  userId: string,
  title: string,
  options?: { conversationId?: string; details?: string; metadata?: any }
) {
  return createWorkLog({
    userId,
    conversationId: options?.conversationId,
    logType: 'info',
    status: 'working',
    title,
    details: options?.details,
    metadata: options?.metadata,
  });
}

/**
 * Helper: Create a "success" status log
 */
export async function logSuccess(
  userId: string,
  title: string,
  options?: { conversationId?: string; details?: string; metadata?: any }
) {
  return createWorkLog({
    userId,
    conversationId: options?.conversationId,
    logType: 'info',
    status: 'success',
    title,
    details: options?.details,
    metadata: options?.metadata,
  });
}

/**
 * Helper: Create an "error" status log
 */
export async function logError(
  userId: string,
  title: string,
  error: Error,
  options?: { conversationId?: string; metadata?: any }
) {
  return createWorkLog({
    userId,
    conversationId: options?.conversationId,
    logType: 'error',
    status: 'error',
    title,
    details: `${error.message}\n\nStack:\n${error.stack}`,
    metadata: options?.metadata,
  });
}

// Export types for external use (already exported above as interfaces/types)

export default {
  createWorkLog,
  getRecentLogs,
  getConversationLogs,
  cleanupExpiredLogs,
  getSystemStats,
  logWorking,
  logSuccess,
  logError,
};
