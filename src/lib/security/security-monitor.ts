/**
 * SECURITY MONITOR
 * Security monitoring, threat detection, rate limiting
 */

import { prisma } from '@/lib/prisma';
import { logAction } from './audit-logger';

export interface SecurityEvent {
  userId?: string;
  eventType: string;
  severity: 'info' | 'warning' | 'critical';
  details?: Record<string, any>;
  ipAddress?: string;
}

export interface Anomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface SecurityFilters {
  userId?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface SecurityReport {
  totalEvents: number;
  criticalEvents: number;
  anomaliesDetected: number;
  blockedUsers: number;
  rateLimitViolations: number;
  recentEvents: any[];
}

// In-memory rate limit store (in production, use Redis)
const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

/**
 * Log security event
 */
export async function logSecurityEvent(
  event: SecurityEvent
): Promise<{ success: boolean; error?: string }> {
  try {
    // Log to audit system
    await logAction({
      userId: event.userId,
      action: `security:${event.eventType}`,
      details: {
        severity: event.severity,
        ...event.details,
      },
      ipAddress: event.ipAddress,
    });

    return { success: true };
  } catch (error) {
    console.error('Error logging security event:', error);
    return { success: false, error: 'Failed to log security event' };
  }
}

/**
 * Detect anomalies for a user
 */
export async function detectAnomalies(userId: string): Promise<{ anomalies: Anomaly[] }> {
  try {
    const anomalies: Anomaly[] = [];

    // Check recent activity patterns
    const recentSessions = await prisma.userSession.findMany({
      where: {
        clerkUserId: userId,
        startedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Anomaly 1: Multiple sessions from different locations
    const uniqueCountries = new Set(
      recentSessions.map((s) => s.country).filter(Boolean)
    );
    if (uniqueCountries.size > 3) {
      anomalies.push({
        type: 'multiple_locations',
        description: `User accessed from ${uniqueCountries.size} different countries in 24h`,
        severity: 'high',
        timestamp: new Date(),
        details: { countries: Array.from(uniqueCountries) },
      });
    }

    // Anomaly 2: Unusual activity volume
    const recentAuditLogs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    });

    if (recentAuditLogs.length > 100) {
      anomalies.push({
        type: 'high_activity',
        description: `Unusually high activity: ${recentAuditLogs.length} actions in 1 hour`,
        severity: 'medium',
        timestamp: new Date(),
        details: { actionCount: recentAuditLogs.length },
      });
    }

    // Anomaly 3: Failed authentication attempts (mock check)
    const failedAttempts = recentAuditLogs.filter((log) =>
      log.action.includes('auth:failed')
    );
    if (failedAttempts.length > 5) {
      anomalies.push({
        type: 'failed_auth',
        description: `${failedAttempts.length} failed authentication attempts`,
        severity: 'high',
        timestamp: new Date(),
        details: { failedAttempts: failedAttempts.length },
      });
    }

    return { anomalies };
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return { anomalies: [] };
  }
}

/**
 * Check rate limit for user action
 */
export async function checkRateLimit(
  userId: string,
  action: string
): Promise<{ allowed: boolean; remaining: number; resetAt?: number }> {
  try {
    const key = `${userId}:${action}`;
    const now = Date.now();

    // Define rate limits (requests per minute)
    const limits: Record<string, number> = {
      'api:call': 100,
      'content:generate': 20,
      'image:generate': 10,
      default: 60,
    };

    const limit = limits[action] || limits.default;
    const windowMs = 60 * 1000; // 1 minute

    let bucket = rateLimitStore.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, bucket);
    }

    bucket.count++;

    const allowed = bucket.count <= limit;
    const remaining = Math.max(0, limit - bucket.count);

    if (!allowed) {
      // Log rate limit violation
      await logSecurityEvent({
        userId,
        eventType: 'rate_limit_exceeded',
        severity: 'warning',
        details: { action, limit, attempts: bucket.count },
      });
    }

    return {
      allowed,
      remaining,
      resetAt: bucket.resetAt,
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // Fail open - allow the request
    return { allowed: true, remaining: 0 };
  }
}

/**
 * Block a user (mock implementation)
 */
export async function blockUser(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Log the block action
    await logSecurityEvent({
      userId,
      eventType: 'user_blocked',
      severity: 'critical',
      details: { reason },
    });

    // In production, this would:
    // 1. Update user status in database
    // 2. Invalidate all sessions
    // 3. Revoke API tokens
    // 4. Notify security team

    return { success: true };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, error: 'Failed to block user' };
  }
}

/**
 * Get security report
 */
export async function getSecurityReport(filters?: SecurityFilters): Promise<SecurityReport> {
  try {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    // Get security events from audit logs
    const securityLogs = await prisma.auditLog.findMany({
      where: {
        ...where,
        action: {
          startsWith: 'security:',
        },
      },
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 100,
    });

    const criticalEvents = securityLogs.filter(
      (log) => log.details && (log.details as any).severity === 'critical'
    );

    return {
      totalEvents: securityLogs.length,
      criticalEvents: criticalEvents.length,
      anomaliesDetected: 0, // Would be calculated from anomaly detection
      blockedUsers: 0, // Would be counted from user blocks
      rateLimitViolations: securityLogs.filter((log) =>
        log.action.includes('rate_limit')
      ).length,
      recentEvents: securityLogs.slice(0, 10),
    };
  } catch (error) {
    console.error('Error generating security report:', error);
    return {
      totalEvents: 0,
      criticalEvents: 0,
      anomaliesDetected: 0,
      blockedUsers: 0,
      rateLimitViolations: 0,
      recentEvents: [],
    };
  }
}
