/**
 * AUDIT LOGGER
 * Comprehensive audit logging and compliance tracking
 */

import { prisma } from '@/lib/prisma';

export interface AuditAction {
  userId?: string;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface AuditSummary {
  totalActions: number;
  uniqueUsers: number;
  actionBreakdown: Record<string, number>;
  topActions: Array<{ action: string; count: number }>;
  recentActions: any[];
}

/**
 * Log an audit action
 */
export async function logAction(action: AuditAction): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: action.userId,
        action: action.action,
        details: action.details,
        ipAddress: action.ipAddress,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error logging audit action:', error);
    return { success: false, error: 'Failed to log action' };
  }
}

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(filters: AuditFilters): Promise<any[]> {
  try {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return logs;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return [];
  }
}

/**
 * Search audit logs by query string
 */
export async function searchAuditLogs(query: string): Promise<any[]> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { contains: query, mode: 'insensitive' } },
          { ipAddress: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return logs;
  } catch (error) {
    console.error('Error searching audit logs:', error);
    return [];
  }
}

/**
 * Export audit logs (mock implementation - would generate file in production)
 */
export async function exportAuditLogs(
  filters: AuditFilters
): Promise<{ success: boolean; exportUrl?: string; error?: string }> {
  try {
    const logs = await getAuditLogs(filters);

    // In production, this would:
    // 1. Generate CSV/JSON file
    // 2. Upload to cloud storage
    // 3. Return download URL
    // For now, we return success with log count

    return {
      success: true,
      exportUrl: `/exports/audit-logs-${Date.now()}.json`,
    };
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return { success: false, error: 'Failed to export logs' };
  }
}

/**
 * Get audit summary statistics
 */
export async function getAuditSummary(
  userId?: string,
  dateRange?: DateRange
): Promise<AuditSummary> {
  try {
    const where: any = {};
    if (userId) where.userId = userId;
    if (dateRange) {
      where.timestamp = {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      };
    }

    // Get total count
    const totalActions = await prisma.auditLog.count({ where });

    // Get unique users
    const uniqueUsers = await prisma.auditLog.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    });

    // Get action breakdown
    const actions = await prisma.auditLog.findMany({
      where,
      select: { action: true },
    });

    const actionBreakdown: Record<string, number> = {};
    actions.forEach((log) => {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
    });

    // Get top actions
    const topActions = Object.entries(actionBreakdown)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent actions
    const recentActions = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return {
      totalActions,
      uniqueUsers: uniqueUsers.filter((u) => u.userId).length,
      actionBreakdown,
      topActions,
      recentActions,
    };
  } catch (error) {
    console.error('Error getting audit summary:', error);
    return {
      totalActions: 0,
      uniqueUsers: 0,
      actionBreakdown: {},
      topActions: [],
      recentActions: [],
    };
  }
}
