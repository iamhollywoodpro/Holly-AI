/**
 * HOLLY Work Log Service - Simplified
 * 
 * Manages activity logging matching Prisma schema
 * 
 * @author HOLLY AI System
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateLogOptions {
  userId: string;
  conversationId?: string;
  taskName: string;
  description?: string;
  details?: Record<string, any>;
  duration: number; // in minutes
  category?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkLogEntry {
  id: string;
  userId: string;
  conversationId: string | null;
  taskName: string;
  description: string | null;
  details: any;
  duration: number;
  category: string | null;
  tags: string[];
  metadata: any;
  startedAt: Date;
  completedAt: Date;
  createdAt: Date;
}

/**
 * Create a new work log entry
 */
export async function createWorkLog(options: CreateLogOptions): Promise<WorkLogEntry> {
  const {
    userId,
    conversationId,
    taskName,
    description,
    details,
    duration,
    category,
    tags,
    metadata,
    startedAt,
    completedAt
  } = options;

  try {
    const log = await prisma.workLog.create({
      data: {
        userId,
        conversationId: conversationId || null,
        taskName,
        description: description || null,
        details: details || {},
        duration,
        category: category || null,
        tags: tags || [],
        metadata: metadata || {},
        startedAt: startedAt || new Date(),
        completedAt: completedAt || new Date(),
      },
    });

    // Update stats
    await updateStats(userId, duration / 60); // Convert minutes to hours

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
  }
): Promise<WorkLogEntry[]> {
  try {
    const logs = await prisma.workLog.findMany({
      where: {
        userId,
        ...(options?.conversationId && { conversationId: options.conversationId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 50,
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
  limit: number = 50
): Promise<WorkLogEntry[]> {
  try {
    const logs = await prisma.workLog.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        createdAt: 'asc',
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
        createdAt: {
          lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      deleted: deleted.count,
      movedToWarm: 0, // Not implemented yet
      movedToCold: 0, // Not implemented yet
    };
  } catch (error) {
    console.error('[WorkLogService] Cleanup failed:', error);
    throw error;
  }
}

/**
 * Get system stats
 */
export async function getSystemStats() {
  try {
    return await prisma.workLogStats.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });
  } catch (error) {
    console.error('[WorkLogService] Failed to fetch stats:', error);
    return null;
  }
}

/**
 * Update system stats (atomic operations)
 */
async function updateStats(userId: string, hoursToAdd: number): Promise<void> {
  try {
    await prisma.workLogStats.upsert({
      where: { userId },
      create: {
        userId,
        totalHours: hoursToAdd,
        totalTasks: 1,
        avgHoursPerDay: hoursToAdd,
        lastLoggedAt: new Date(),
      },
      update: {
        totalHours: { increment: hoursToAdd },
        totalTasks: { increment: 1 },
        lastLoggedAt: new Date(),
        // avgHoursPerDay calculated separately if needed
      },
    });
  } catch (error) {
    console.error('[WorkLogService] Failed to update stats:', error);
    // Don't throw - stats update failure shouldn't block log creation
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR COMMON LOG TYPES
// ============================================================================

export async function logWorking(
  userId: string,
  conversationId: string,
  taskName: string,
  details?: Record<string, any>
): Promise<WorkLogEntry> {
  return createWorkLog({
    userId,
    conversationId,
    taskName,
    description: 'Working',
    details,
    duration: 0, // Will be updated when completed
    category: 'ai_response',
    tags: ['working'],
    startedAt: new Date(),
    completedAt: new Date(),
  });
}

export async function logSuccess(
  userId: string,
  conversationId: string,
  taskName: string,
  duration: number,
  details?: Record<string, any>
): Promise<WorkLogEntry> {
  return createWorkLog({
    userId,
    conversationId,
    taskName,
    description: 'Success',
    details,
    duration,
    category: 'ai_response',
    tags: ['success'],
    completedAt: new Date(),
  });
}

export async function logError(
  userId: string,
  conversationId: string,
  taskName: string,
  error: any,
  details?: Record<string, any>
): Promise<WorkLogEntry> {
  return createWorkLog({
    userId,
    conversationId,
    taskName,
    description: 'Error',
    details: {
      ...details,
      error: error?.message || String(error),
    },
    duration: 0,
    category: 'error',
    tags: ['error'],
    completedAt: new Date(),
  });
}

export async function logInfo(
  userId: string,
  conversationId: string,
  taskName: string,
  details?: Record<string, any>
): Promise<WorkLogEntry> {
  return createWorkLog({
    userId,
    conversationId,
    taskName,
    description: 'Info',
    details,
    duration: 0,
    category: 'info',
    tags: ['info'],
    completedAt: new Date(),
  });
}

/**
 * Update system stats manually (for cron jobs)
 */
export async function updateSystemStats(): Promise<void> {
  // This is a no-op now - stats are updated per-user automatically
  console.log('[WorkLogService] updateSystemStats called - using per-user stats now');
}

export default {
  createWorkLog,
  getRecentLogs,
  getConversationLogs,
  cleanupExpiredLogs,
  getSystemStats,
  logWorking,
  logSuccess,
  logError,
  logInfo,
  updateSystemStats,
};
