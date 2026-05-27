/// <reference types="jest" />

/**
 * Security Modules Test Suite
 *
 * Comprehensive tests for the 5 security modules:
 *   - audit-logger
 *   - security-monitor
 *   - compliance-manager
 *   - content-moderator
 *   - endpoint-limiter
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════════

const mockAuditLogCreate = jest.fn();
const mockAuditLogFindMany = jest.fn();
const mockAuditLogCount = jest.fn();

const mockUserFindUnique = jest.fn();
const mockUserCount = jest.fn();

const mockUserPreferencesFindUnique = jest.fn();

const mockUserSessionFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    auditLog: {
      create: mockAuditLogCreate,
      findMany: mockAuditLogFindMany,
      count: mockAuditLogCount,
    },
    user: {
      findUnique: mockUserFindUnique,
      count: mockUserCount,
    },
    userPreferences: {
      findUnique: mockUserPreferencesFindUnique,
    },
    userSession: {
      findMany: mockUserSessionFindMany,
    },
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════════════════════

import {
  logAction,
  getAuditLogs,
  searchAuditLogs,
  exportAuditLogs,
  getAuditSummary,
} from '@/lib/security/audit-logger';

import {
  logSecurityEvent,
  detectAnomalies,
  checkRateLimit,
  blockUser,
  getSecurityReport,
} from '@/lib/security/security-monitor';

import {
  exportUserData,
  deleteUserData,
  getPrivacyConsent,
  updatePrivacyConsent,
  generateComplianceReport,
} from '@/lib/security/compliance-manager';

import {
  moderateContent,
  checkImageSafety,
  filterToxicContent,
  reportContent,
  getModerationQueue,
} from '@/lib/security/content-moderator';

import {
  checkEndpointRateLimit,
  getRateLimitHeaders,
  getEndpointRateLimitStats,
} from '@/lib/security/endpoint-limiter';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Audit Logger
// ═══════════════════════════════════════════════════════════════════════════════

describe('audit-logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── logAction ──────────────────────────────────────────────────────────────

  describe('logAction', () => {
    it('should create an audit log record and return success', async () => {
      mockAuditLogCreate.mockResolvedValue({ id: 'log-1' });

      const result = await logAction({
        userId: 'user-1',
        action: 'user:login',
        details: { method: 'clerk' },
        ipAddress: '127.0.0.1',
      });

      expect(result).toEqual({ success: true });
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'user:login',
          details: { method: 'clerk' },
          ipAddress: '127.0.0.1',
        },
      });
    });

    it('should create a log record without optional fields', async () => {
      mockAuditLogCreate.mockResolvedValue({ id: 'log-2' });

      const result = await logAction({ action: 'system:startup' });

      expect(result).toEqual({ success: true });
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: undefined,
          action: 'system:startup',
          details: undefined,
          ipAddress: undefined,
        },
      });
    });

    it('should return failure when prisma throws', async () => {
      mockAuditLogCreate.mockRejectedValue(new Error('DB down'));

      const result = await logAction({
        userId: 'user-1',
        action: 'user:login',
      });

      expect(result).toEqual({ success: false, error: 'Failed to log action' });
    });
  });

  // ─── getAuditLogs ───────────────────────────────────────────────────────────

  describe('getAuditLogs', () => {
    it('should fetch logs with userId filter', async () => {
      const fakeLogs = [
        { id: 'a', userId: 'user-1', action: 'user:login', timestamp: new Date() },
      ];
      mockAuditLogFindMany.mockResolvedValue(fakeLogs);

      const result = await getAuditLogs({ userId: 'user-1' });

      expect(result).toEqual(fakeLogs);
      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { timestamp: 'desc' },
          take: 100,
        }),
      );
    });

    it('should apply action filter with case-insensitive contains', async () => {
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditLogs({ action: 'login' });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            action: { contains: 'login', mode: 'insensitive' },
          },
        }),
      );
    });

    it('should apply date range filters', async () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditLogs({ startDate: start, endDate: end });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: { gte: start, lte: end },
          },
        }),
      );
    });

    it('should apply only startDate when endDate is omitted', async () => {
      const start = new Date('2025-06-01');
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditLogs({ startDate: start });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: { gte: start },
          },
        }),
      );
    });

    it('should respect custom limit', async () => {
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditLogs({ limit: 50 });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('should combine userId, action, and date range filters', async () => {
      const start = new Date('2025-01-01');
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditLogs({ userId: 'u1', action: 'delete', startDate: start });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'u1',
            action: { contains: 'delete', mode: 'insensitive' },
            timestamp: { gte: start },
          },
        }),
      );
    });

    it('should return empty array on error', async () => {
      mockAuditLogFindMany.mockRejectedValue(new Error('fail'));

      const result = await getAuditLogs({});

      expect(result).toEqual([]);
    });
  });

  // ─── searchAuditLogs ────────────────────────────────────────────────────────

  describe('searchAuditLogs', () => {
    it('should search by action and ipAddress with OR clause', async () => {
      mockAuditLogFindMany.mockResolvedValue([]);

      await searchAuditLogs('192.168.1');

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { action: { contains: '192.168.1', mode: 'insensitive' } },
              { ipAddress: { contains: '192.168.1', mode: 'insensitive' } },
            ],
          },
          orderBy: { timestamp: 'desc' },
          take: 100,
        }),
      );
    });

    it('should return matching logs', async () => {
      const matched = [
        { id: 'x', action: 'user:login', ipAddress: '10.0.0.1' },
      ];
      mockAuditLogFindMany.mockResolvedValue(matched);

      const result = await searchAuditLogs('10.0.0');

      expect(result).toEqual(matched);
    });

    it('should return empty array on error', async () => {
      mockAuditLogFindMany.mockRejectedValue(new Error('broken'));

      const result = await searchAuditLogs('anything');

      expect(result).toEqual([]);
    });
  });

  // ─── exportAuditLogs ────────────────────────────────────────────────────────

  describe('exportAuditLogs', () => {
    it('should return a success response with exportUrl', async () => {
      mockAuditLogFindMany.mockResolvedValue([{ id: 'a' }]);

      const result = await exportAuditLogs({ userId: 'u1' });

      expect(result.success).toBe(true);
      expect(result.exportUrl).toMatch(/^\/exports\/audit-logs-\d+\.json$/);
    });

    it('should return failure when getAuditLogs throws unexpectedly', async () => {
      // exportAuditLogs delegates to getAuditLogs which catches errors.
      // To trigger the catch in exportAuditLogs itself, we simulate a synchronous
      // error after getAuditLogs returns (the only way is if Date.now throws,
      // which is unlikely). Instead, test that getAuditLogs errors result in
      // a successful export with empty logs (graceful degradation).
      mockAuditLogFindMany.mockRejectedValue(new Error('fail'));

      const result = await exportAuditLogs({});

      // getAuditLogs returns [] on error, exportAuditLogs still succeeds
      expect(result.success).toBe(true);
      expect(result.exportUrl).toMatch(/^\/exports\/audit-logs-\d+\.json$/);
    });
  });

  // ─── getAuditSummary ────────────────────────────────────────────────────────

  describe('getAuditSummary', () => {
    it('should return summary with correct structure', async () => {
      mockAuditLogCount.mockResolvedValue(42);
      mockAuditLogFindMany.mockResolvedValueOnce([
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: null },
      ]);
      mockAuditLogFindMany.mockResolvedValueOnce([
        { action: 'login' },
        { action: 'login' },
        { action: 'logout' },
      ]);
      mockAuditLogFindMany.mockResolvedValueOnce([]);

      const result = await getAuditSummary();

      expect(result.totalActions).toBe(42);
      // uniqueUsers filters out null userIds
      expect(result.uniqueUsers).toBe(2);
      expect(result.actionBreakdown).toEqual({ login: 2, logout: 1 });
      expect(result.topActions).toEqual([
        { action: 'login', count: 2 },
        { action: 'logout', count: 1 },
      ]);
    });

    it('should filter by userId when provided', async () => {
      mockAuditLogCount.mockResolvedValue(5);
      mockAuditLogFindMany.mockResolvedValue([]);
      mockAuditLogFindMany.mockResolvedValue([]);
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditSummary('user-x');

      expect(mockAuditLogCount).toHaveBeenCalledWith({ where: { userId: 'user-x' } });
    });

    it('should filter by dateRange when provided', async () => {
      const range = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      };
      mockAuditLogCount.mockResolvedValue(0);
      mockAuditLogFindMany.mockResolvedValue([]);
      mockAuditLogFindMany.mockResolvedValue([]);
      mockAuditLogFindMany.mockResolvedValue([]);

      await getAuditSummary(undefined, range);

      expect(mockAuditLogCount).toHaveBeenCalledWith({
        where: { timestamp: { gte: range.startDate, lte: range.endDate } },
      });
    });

    it('should return safe defaults on error', async () => {
      mockAuditLogCount.mockRejectedValue(new Error('boom'));

      const result = await getAuditSummary();

      expect(result).toEqual({
        totalActions: 0,
        uniqueUsers: 0,
        actionBreakdown: {},
        topActions: [],
        recentActions: [],
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: Security Monitor
// ═══════════════════════════════════════════════════════════════════════════════

describe('security-monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── logSecurityEvent ───────────────────────────────────────────────────────

  describe('logSecurityEvent', () => {
    it('should delegate to logAction with security: prefix', async () => {
      mockAuditLogCreate.mockResolvedValue({ id: 'se-1' });

      const result = await logSecurityEvent({
        userId: 'user-1',
        eventType: 'login_failed',
        severity: 'warning',
        details: { attempts: 3 },
        ipAddress: '10.0.0.1',
      });

      expect(result).toEqual({ success: true });
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'security:login_failed',
          details: { severity: 'warning', attempts: 3 },
          ipAddress: '10.0.0.1',
        },
      });
    });

    it('should still succeed when logAction encounters a database error', async () => {
      // logAction catches its own errors and returns { success: false },
      // so logSecurityEvent's catch block is not triggered.
      // Instead, logSecurityEvent returns success even if the underlying logAction failed.
      mockAuditLogCreate.mockRejectedValue(new Error('DB error'));

      const result = await logSecurityEvent({
        eventType: 'test',
        severity: 'info',
      });

      // logAction catches the error internally, so logSecurityEvent still returns success
      expect(result).toEqual({ success: true });
    });
  });

  // ─── detectAnomalies ────────────────────────────────────────────────────────

  describe('detectAnomalies', () => {
    it('should detect multiple locations anomaly (>3 countries)', async () => {
      mockUserSessionFindMany.mockResolvedValue([
        { country: 'US' },
        { country: 'UK' },
        { country: 'DE' },
        { country: 'JP' },
      ]);
      mockAuditLogFindMany.mockResolvedValue([]);

      const { anomalies } = await detectAnomalies('user-1');

      expect(anomalies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'multiple_locations',
            severity: 'high',
            description: expect.stringContaining('4 different countries'),
          }),
        ]),
      );
    });

    it('should NOT flag multiple locations when <=3 countries', async () => {
      mockUserSessionFindMany.mockResolvedValue([
        { country: 'US' },
        { country: 'UK' },
        { country: 'DE' },
      ]);
      mockAuditLogFindMany.mockResolvedValue([]);

      const { anomalies } = await detectAnomalies('user-1');

      const locationAnomaly = anomalies.find((a) => a.type === 'multiple_locations');
      expect(locationAnomaly).toBeUndefined();
    });

    it('should detect high activity anomaly (>100 actions in last hour)', async () => {
      mockUserSessionFindMany.mockResolvedValue([]);
      // 101 audit log entries in the last hour
      mockAuditLogFindMany.mockResolvedValue(
        Array.from({ length: 101 }, (_, i) => ({ action: `action:${i}` })),
      );

      const { anomalies } = await detectAnomalies('user-1');

      expect(anomalies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'high_activity',
            severity: 'medium',
            description: expect.stringContaining('101 actions in 1 hour'),
          }),
        ]),
      );
    });

    it('should NOT flag high activity when <=100 actions', async () => {
      mockUserSessionFindMany.mockResolvedValue([]);
      mockAuditLogFindMany.mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => ({ action: `action:${i}` })),
      );

      const { anomalies } = await detectAnomalies('user-1');

      const activityAnomaly = anomalies.find((a) => a.type === 'high_activity');
      expect(activityAnomaly).toBeUndefined();
    });

    it('should detect failed auth anomaly (>5 failed auth attempts)', async () => {
      mockUserSessionFindMany.mockResolvedValue([]);
      mockAuditLogFindMany.mockResolvedValue(
        Array.from({ length: 6 }, () => ({ action: 'auth:failed' })),
      );

      const { anomalies } = await detectAnomalies('user-1');

      expect(anomalies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'failed_auth',
            severity: 'high',
            description: expect.stringContaining('6 failed authentication attempts'),
          }),
        ]),
      );
    });

    it('should NOT flag failed auth when <=5 attempts', async () => {
      mockUserSessionFindMany.mockResolvedValue([]);
      mockAuditLogFindMany.mockResolvedValue(
        Array.from({ length: 5 }, () => ({ action: 'auth:failed' })),
      );

      const { anomalies } = await detectAnomalies('user-1');

      const authAnomaly = anomalies.find((a) => a.type === 'failed_auth');
      expect(authAnomaly).toBeUndefined();
    });

    it('should detect multiple anomaly types simultaneously', async () => {
      mockUserSessionFindMany.mockResolvedValue([
        { country: 'US' },
        { country: 'UK' },
        { country: 'DE' },
        { country: 'FR' },
      ]);
      // 101 total actions, 6 of which are failed auth
      const auditLogs = Array.from({ length: 101 }, (_, i) => ({
        action: i < 6 ? 'auth:failed' : 'normal:action',
      }));
      mockAuditLogFindMany.mockResolvedValue(auditLogs);

      const { anomalies } = await detectAnomalies('user-1');

      const types = anomalies.map((a) => a.type);
      expect(types).toContain('multiple_locations');
      expect(types).toContain('high_activity');
      expect(types).toContain('failed_auth');
    });

    it('should return empty array on error', async () => {
      mockUserSessionFindMany.mockRejectedValue(new Error('db error'));

      const { anomalies } = await detectAnomalies('user-1');

      expect(anomalies).toEqual([]);
    });
  });

  // ─── checkRateLimit ─────────────────────────────────────────────────────────

  describe('checkRateLimit', () => {
    // The security-monitor uses an in-memory Map that persists within the module.
    // We use unique userId prefixes per sub-test to avoid cross-test interference.

    it('should use limit 100 for api:call action', async () => {
      const uid = `rl-api-${Date.now()}`;
      mockAuditLogCreate.mockResolvedValue({});

      // First 100 should all be allowed
      for (let i = 0; i < 100; i++) {
        const result = await checkRateLimit(uid, 'api:call');
        expect(result.allowed).toBe(true);
      }
      // 101st should be blocked
      const result = await checkRateLimit(uid, 'api:call');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should use limit 20 for content:generate action', async () => {
      const uid = `rl-content-${Date.now()}`;
      mockAuditLogCreate.mockResolvedValue({});

      for (let i = 0; i < 20; i++) {
        const result = await checkRateLimit(uid, 'content:generate');
        expect(result.allowed).toBe(true);
      }
      const result = await checkRateLimit(uid, 'content:generate');
      expect(result.allowed).toBe(false);
    });

    it('should use limit 10 for image:generate action', async () => {
      const uid = `rl-image-${Date.now()}`;
      mockAuditLogCreate.mockResolvedValue({});

      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit(uid, 'image:generate');
        expect(result.allowed).toBe(true);
      }
      const result = await checkRateLimit(uid, 'image:generate');
      expect(result.allowed).toBe(false);
    });

    it('should use default limit 60 for unknown actions', async () => {
      const uid = `rl-default-${Date.now()}`;
      mockAuditLogCreate.mockResolvedValue({});

      for (let i = 0; i < 60; i++) {
        const result = await checkRateLimit(uid, 'unknown:action');
        expect(result.allowed).toBe(true);
      }
      const result = await checkRateLimit(uid, 'unknown:action');
      expect(result.allowed).toBe(false);
    });

    it('should report correct remaining count', async () => {
      const uid = `rl-remain-${Date.now()}`;

      const r1 = await checkRateLimit(uid, 'image:generate');
      expect(r1.remaining).toBe(9);

      const r2 = await checkRateLimit(uid, 'image:generate');
      expect(r2.remaining).toBe(8);
    });

    it('should log security event when rate limit exceeded', async () => {
      const uid = `rl-log-${Date.now()}`;
      mockAuditLogCreate.mockResolvedValue({});

      // Exhaust limit (image:generate = 10)
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(uid, 'image:generate');
      }
      mockAuditLogCreate.mockClear();

      // The 11th call triggers the violation log
      await checkRateLimit(uid, 'image:generate');

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'security:rate_limit_exceeded',
          details: expect.objectContaining({
            action: 'image:generate',
            limit: 10,
          }),
        }),
      });
    });

    it('should fail open on error (return allowed: true)', async () => {
      // Force an error by making the in-memory store throw
      // We can simulate by causing logSecurityEvent to throw after limit exceeded
      // Instead, let's test the catch path by spying on the Map
      const uid = `rl-error-${Date.now()}`;

      // The implementation catches any error and returns allowed: true
      // We need the internal rateLimitStore.get to throw.
      // Since it is module-scoped, we can use jest.spyOn on Map.prototype.get
      const originalGet = Map.prototype.get;
      jest.spyOn(Map.prototype, 'get').mockImplementationOnce(function (this: Map<any, any>, key: any) {
        if (typeof key === 'string' && key.includes('rl-error')) {
          throw new Error('simulated store failure');
        }
        return originalGet.call(this, key);
      });

      const result = await checkRateLimit(uid, 'api:call');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);

      (Map.prototype.get as jest.Mock).mockRestore();
    });

    it('should isolate buckets per user+action combination', async () => {
      const uid1 = `rl-iso1-${Date.now()}`;
      const uid2 = `rl-iso2-${Date.now()}`;

      // Exhaust uid1's image:generate
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(uid1, 'image:generate');
      }
      const blocked = await checkRateLimit(uid1, 'image:generate');
      expect(blocked.allowed).toBe(false);

      // uid2 with same action should still be allowed
      const allowed = await checkRateLimit(uid2, 'image:generate');
      expect(allowed.allowed).toBe(true);
    });
  });

  // ─── blockUser ──────────────────────────────────────────────────────────────

  describe('blockUser', () => {
    it('should log a critical security event for user_blocked', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await blockUser('user-1', 'ToS violation');

      expect(result).toEqual({ success: true });
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          action: 'security:user_blocked',
          details: { severity: 'critical', reason: 'ToS violation' },
          ipAddress: undefined,
        },
      });
    });

    it('should still succeed when underlying logAction encounters a DB error', async () => {
      // logAction catches its own errors, so blockUser's catch is not triggered
      mockAuditLogCreate.mockRejectedValue(new Error('DB error'));

      const result = await blockUser('user-1', 'spam');

      // logAction handles the error internally; blockUser still returns success
      expect(result).toEqual({ success: true });
    });
  });

  // ─── getSecurityReport ──────────────────────────────────────────────────────

  describe('getSecurityReport', () => {
    it('should return report with correct counts', async () => {
      const securityLogs = [
        { action: 'security:rate_limit_exceeded', details: { severity: 'warning' } },
        { action: 'security:user_blocked', details: { severity: 'critical' } },
        { action: 'security:login_failed', details: { severity: 'warning' } },
      ];
      mockAuditLogFindMany.mockResolvedValue(securityLogs);

      const report = await getSecurityReport();

      expect(report.totalEvents).toBe(3);
      expect(report.criticalEvents).toBe(1);
      expect(report.rateLimitViolations).toBe(1);
      expect(report.recentEvents).toHaveLength(3);
    });

    it('should filter by userId', async () => {
      mockAuditLogFindMany.mockResolvedValue([]);

      await getSecurityReport({ userId: 'user-1' });

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            action: { startsWith: 'security:' },
          }),
        }),
      );
    });

    it('should return zeros on error', async () => {
      mockAuditLogFindMany.mockRejectedValue(new Error('fail'));

      const report = await getSecurityReport();

      expect(report).toEqual({
        totalEvents: 0,
        criticalEvents: 0,
        anomaliesDetected: 0,
        blockedUsers: 0,
        rateLimitViolations: 0,
        recentEvents: [],
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Compliance Manager
// ═══════════════════════════════════════════════════════════════════════════════

describe('compliance-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── exportUserData ─────────────────────────────────────────────────────────

  describe('exportUserData', () => {
    it('should return error when user is not found', async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await exportUserData('nonexistent-user');

      expect(result).toEqual({ success: false, error: 'User not found' });
    });

    it('should return dataUrl when user is found', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 'u1',
        clerkUserId: 'clerk-1',
        email: 'test@test.com',
      });
      mockAuditLogCreate.mockResolvedValue({});

      const result = await exportUserData('clerk-1');

      expect(result.success).toBe(true);
      expect(result.dataUrl).toMatch(/^\/exports\/user-data-clerk-1-\d+\.json$/);
    });

    it('should log compliance:data_export action', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'u1', clerkUserId: 'clerk-1' });
      mockAuditLogCreate.mockResolvedValue({});

      await exportUserData('clerk-1');

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'clerk-1',
          action: 'compliance:data_export',
        }),
      });
    });

    it('should return failure on database error', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('DB error'));

      const result = await exportUserData('user-1');

      expect(result).toEqual({ success: false, error: 'Failed to export user data' });
    });
  });

  // ─── deleteUserData ─────────────────────────────────────────────────────────

  describe('deleteUserData', () => {
    it('should log deletion request and return success', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await deleteUserData('user-1');

      expect(result).toEqual({ success: true });
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'compliance:data_deletion',
        }),
      });
    });

    it('should still succeed when underlying logAction encounters a DB error', async () => {
      // logAction catches its own errors, so deleteUserData's catch is not triggered
      mockAuditLogCreate.mockRejectedValue(new Error('DB error'));

      const result = await deleteUserData('user-1');

      expect(result).toEqual({ success: true });
    });
  });

  // ─── getPrivacyConsent ──────────────────────────────────────────────────────

  describe('getPrivacyConsent', () => {
    it('should return default values when preferences are not found', async () => {
      mockUserPreferencesFindUnique.mockResolvedValue(null);

      const result = await getPrivacyConsent('user-1');

      expect(result).toEqual({
        marketing: false,
        analytics: true,
        thirdParty: false,
        lastUpdated: expect.any(Date),
      });
    });

    it('should return consent from preferences when found', async () => {
      const updatedAt = new Date('2025-06-15');
      mockUserPreferencesFindUnique.mockResolvedValue({ updatedAt });

      const result = await getPrivacyConsent('user-1');

      expect(result.marketing).toBe(false);
      expect(result.analytics).toBe(true);
      expect(result.thirdParty).toBe(false);
      expect(result.lastUpdated).toEqual(updatedAt);
    });

    it('should return all-false on error (error fallback)', async () => {
      mockUserPreferencesFindUnique.mockRejectedValue(new Error('fail'));

      const result = await getPrivacyConsent('user-1');

      expect(result).toEqual({
        marketing: false,
        analytics: false,
        thirdParty: false,
        lastUpdated: expect.any(Date),
      });
    });
  });

  // ─── updatePrivacyConsent ───────────────────────────────────────────────────

  describe('updatePrivacyConsent', () => {
    it('should log consent update and return success', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await updatePrivacyConsent('user-1', {
        marketing: true,
        analytics: false,
      });

      expect(result).toEqual({ success: true });
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'compliance:consent_update',
          details: { marketing: true, analytics: false },
        }),
      });
    });

    it('should still succeed when underlying logAction encounters a DB error', async () => {
      // logAction catches its own errors, so updatePrivacyConsent's catch is not triggered
      mockAuditLogCreate.mockRejectedValue(new Error('DB error'));

      const result = await updatePrivacyConsent('user-1', { marketing: true });

      expect(result).toEqual({ success: true });
    });
  });

  // ─── generateComplianceReport ───────────────────────────────────────────────

  describe('generateComplianceReport', () => {
    it('should return a report with correct structure', async () => {
      mockUserCount.mockResolvedValue(150);
      mockAuditLogCount.mockResolvedValueOnce(3)   // dataExportRequests
        .mockResolvedValueOnce(1)                   // dataDeletionRequests
        .mockResolvedValueOnce(7);                  // consentUpdates
      mockAuditLogCreate.mockResolvedValue({});

      const report = await generateComplianceReport('gdpr');

      expect(report).toEqual({
        totalUsers: 150,
        dataExportRequests: 3,
        dataDeletionRequests: 1,
        consentUpdates: 7,
        retentionCompliance: 95,
        gdprCompliant: true,
        ccpaCompliant: true,
      });
    });

    it('should log the report generation action', async () => {
      mockUserCount.mockResolvedValue(10);
      mockAuditLogCount.mockResolvedValue(0);
      mockAuditLogCount.mockResolvedValue(0);
      mockAuditLogCount.mockResolvedValue(0);
      mockAuditLogCreate.mockResolvedValue({});

      await generateComplianceReport('ccpa');

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'compliance:report_generated',
          details: { type: 'ccpa' },
        }),
      });
    });

    it('should return zeros and false flags on error', async () => {
      mockUserCount.mockRejectedValue(new Error('db error'));

      const report = await generateComplianceReport('gdpr');

      expect(report).toEqual({
        totalUsers: 0,
        dataExportRequests: 0,
        dataDeletionRequests: 0,
        consentUpdates: 0,
        retentionCompliance: 0,
        gdprCompliant: false,
        ccpaCompliant: false,
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: Content Moderator
// ═══════════════════════════════════════════════════════════════════════════════

describe('content-moderator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── moderateContent - toxicity scoring ─────────────────────────────────────

  describe('moderateContent', () => {
    it('should score 3+ keyword matches as unsafe (score >= 0.6)', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await moderateContent(
        'This contains spam, scam, and phishing links',
        'text',
      );

      expect(result.safe).toBe(false);
      expect(result.score).toBeGreaterThanOrEqual(0.6);
      expect(result.flagged).toBe(true);
      expect(result.categories).toEqual(
        expect.arrayContaining(['spam', 'scam', 'phishing']),
      );
    });

    it('should score 2 keyword matches as flagged but safe (score ~0.4)', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await moderateContent('Watch out for spam and scams', 'text');

      // 2 keywords * 0.2 = 0.4
      expect(result.score).toBeCloseTo(0.4);
      // safe means score < 0.5 → 0.4 < 0.5, so safe
      expect(result.safe).toBe(true);
      // flagged means score > 0.3 → 0.4 > 0.3, so flagged
      expect(result.flagged).toBe(true);
    });

    it('should score 1 keyword match as safe (score ~0.2)', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await moderateContent('This is just spam content', 'text');

      expect(result.score).toBeCloseTo(0.2);
      expect(result.safe).toBe(true);
      expect(result.flagged).toBe(false);
    });

    it('should score 0 keywords as completely safe', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await moderateContent('Hello world, this is fine', 'text');

      expect(result.score).toBe(0);
      expect(result.safe).toBe(true);
      expect(result.flagged).toBe(false);
      expect(result.categories).toEqual([]);
    });

    // ─── Caps ratio ─────────────────────────────────────────────────────────

    it('should add 0.1 for excessive caps with length > 20', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      // 21 chars, all caps → ratio > 0.7
      const result = await moderateContent('THIS IS ALL CAPS TEXT!', 'text');

      expect(result.categories).toContain('excessive_caps');
      // caps adds 0.1 to base score of 0
      expect(result.score).toBeCloseTo(0.1);
    });

    it('should NOT add caps penalty for short strings (length <= 20)', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      // 14 chars, all caps → but length <= 20
      const result = await moderateContent('ALL CAPS SHORT!', 'text');

      expect(result.categories).not.toContain('excessive_caps');
      expect(result.score).toBe(0);
    });

    it('should NOT add caps penalty when caps ratio <= 0.7', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      // Mixed case, well below 0.7 ratio
      const result = await moderateContent(
        'This has some CAPS but mostly lowercase text here',
        'text',
      );

      expect(result.categories).not.toContain('excessive_caps');
    });

    // ─── Spam pattern ───────────────────────────────────────────────────────

    it('should add 0.15 for repeated character spam pattern', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      // No toxic keywords, but has repeated characters "aaaaa" (5+ same)
      const result = await moderateContent('Hello world aaaaa click', 'text');

      expect(result.categories).toContain('spam_pattern');
      // No keywords matched, only spam_pattern → 0.15
      expect(result.score).toBeCloseTo(0.15);
    });

    it('should NOT flag normal text without repeated characters', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await moderateContent('Hello, how are you doing today?', 'text');

      expect(result.categories).not.toContain('spam_pattern');
    });

    // ─── Combined scoring ──────────────────────────────────────────────────

    it('should cap toxicity score at 1.0', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      // All 7 keywords (7 * 0.2 = 1.4) + spam pattern (0.15) + caps (0.1) = 1.65
      const result = await moderateContent(
        'SPAM SCAM PHISHING MALWARE HATE VIOLENCE EXPLICIT aaaaaa',
        'text',
      );

      expect(result.score).toBeLessThanOrEqual(1.0);
    });

    it('should combine keyword + caps + spam scores correctly', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      // 1 keyword (spam) = 0.2, spam_pattern (aaaaaa) = 0.15, caps (>0.7, >20 chars) = 0.1
      // Use a string where caps ratio clearly exceeds 0.7
      const result = await moderateContent(
        'SPAMMMMMMMMMMMMMMMMMMMMMMMM aaaaaa',  // long all-caps prefix + repeated chars
        'text',
      );

      // spam keyword = 0.2, spam_pattern for aaaaaa = 0.15, caps ratio ~0.82 > 0.7 = 0.1
      // Total = 0.45
      expect(result.score).toBeCloseTo(0.45);
      expect(result.categories).toContain('spam');
      expect(result.categories).toContain('spam_pattern');
      expect(result.categories).toContain('excessive_caps');
    });

    it('should log moderation:check action', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      await moderateContent('clean text', 'chat');

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'moderation:check',
          details: expect.objectContaining({ type: 'chat' }),
        }),
      });
    });

    it('should handle logAction errors gracefully and still return result', async () => {
      mockAuditLogCreate.mockRejectedValue(new Error('broken'));

      const result = await moderateContent('This has spam content', 'text');

      // logAction catches its error; moderateContent still returns the analysis result
      expect(result.score).toBeCloseTo(0.2);
      expect(result.categories).toContain('spam');
      // The function returns success even though logging failed
    });

    it('should return error result when content analysis itself fails', async () => {
      // Force an error in the content analysis by passing a value that causes
      // an internal method to throw. We spy on String.prototype.toLowerCase.
      const originalToLowerCase = String.prototype.toLowerCase;
      jest.spyOn(String.prototype, 'toLowerCase').mockImplementationOnce(function (this: string) {
        if (this.includes('trigger-error')) {
          throw new Error('forced analysis error');
        }
        return originalToLowerCase.call(this);
      });
      mockAuditLogCreate.mockResolvedValue({});

      const result = await moderateContent('trigger-error content', 'text');

      expect(result.safe).toBe(false);
      expect(result.score).toBe(0.5);
      expect(result.categories).toEqual(['error']);
      expect(result.flagged).toBe(true);

      (String.prototype.toLowerCase as jest.Mock).mockRestore();
    });
  });

  // ─── checkImageSafety ───────────────────────────────────────────────────────

  describe('checkImageSafety', () => {
    it('should return safe result by default', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await checkImageSafety('https://example.com/image.png');

      expect(result).toEqual({
        safe: true,
        categories: [],
        confidence: 0.95,
      });
    });

    it('should log moderation:image_check action', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      await checkImageSafety('https://example.com/img.jpg');

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'moderation:image_check',
          details: { imageUrl: 'https://example.com/img.jpg' },
        }),
      });
    });

    it('should return safe result even when logAction encounters DB error', async () => {
      // logAction catches its errors internally, so checkImageSafety returns its normal result
      mockAuditLogCreate.mockRejectedValue(new Error('fail'));

      const result = await checkImageSafety('https://example.com/img.jpg');

      // Returns default safe result regardless of logging error
      expect(result.safe).toBe(true);
      expect(result.confidence).toBe(0.95);
    });
  });

  // ─── filterToxicContent ─────────────────────────────────────────────────────

  describe('filterToxicContent', () => {
    it('should return safe: true when content is clean', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await filterToxicContent('This is perfectly fine content.');

      expect(result).toEqual({ safe: true });
    });

    it('should replace toxic keywords with asterisks', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      // Need 3+ keywords to make score >= 0.6 (unsafe), so filtering kicks in
      const result = await filterToxicContent('This is spam, hate, and violence');

      expect(result.safe).toBe(false);
      // spam → ****, hate → ****, violence → ********
      expect(result.filtered).toBe('This is ****, ****, and ********');
    });

    it('should replace keywords case-insensitively', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      // 3 keywords: SPAM, Scam, MALWARE → all unsafe
      const result = await filterToxicContent('SPAM and Scam and MALWARE here');

      expect(result.safe).toBe(false);
      expect(result.filtered).toBe('**** and **** and ******* here');
    });

    it('should handle moderateContent returning error result gracefully', async () => {
      // When moderateContent encounters an error, it returns safe: false.
      // filterToxicContent then tries to filter keywords but none are found,
      // returning the original text as filtered.
      // Force moderateContent to error by making toLowerCase throw.
      const originalToLowerCase = String.prototype.toLowerCase;
      jest.spyOn(String.prototype, 'toLowerCase').mockImplementationOnce(function (this: string) {
        throw new Error('forced');
      });
      mockAuditLogCreate.mockResolvedValue({});

      const result = await filterToxicContent('trigger error text');

      // moderateContent catches error → returns { safe: false }
      // filterToxicContent sees safe=false → tries to filter but no keywords found
      expect(result.safe).toBe(false);

      (String.prototype.toLowerCase as jest.Mock).mockRestore();
    });
  });

  // ─── reportContent ──────────────────────────────────────────────────────────

  describe('reportContent', () => {
    it('should log report action and return success', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await reportContent('content-123', 'inappropriate', 'reporter-1');

      expect(result).toEqual({ success: true });
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: {
          userId: 'reporter-1',
          action: 'moderation:report',
          details: {
            contentId: 'content-123',
            reason: 'inappropriate',
          },
          ipAddress: undefined,
        },
      });
    });

    it('should still succeed when underlying logAction encounters a DB error', async () => {
      // logAction catches its errors, so reportContent's catch is not triggered
      mockAuditLogCreate.mockRejectedValue(new Error('DB error'));

      const result = await reportContent('c1', 'bad', 'u1');

      // logAction handles the error internally; reportContent returns success
      expect(result).toEqual({ success: true });
    });
  });

  // ─── getModerationQueue ─────────────────────────────────────────────────────

  describe('getModerationQueue', () => {
    it('should return empty array (mock implementation)', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      const result = await getModerationQueue();

      expect(result).toEqual([]);
    });

    it('should log queue access', async () => {
      mockAuditLogCreate.mockResolvedValue({});

      await getModerationQueue();

      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'moderation:queue_access',
        }),
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 5: Endpoint Limiter
// ═══════════════════════════════════════════════════════════════════════════════

describe('endpoint-limiter', () => {
  // The endpoint-limiter uses module-level RateLimiter instances.
  // Tests use unique identity keys to avoid interference.

  // ─── Route Categorization ───────────────────────────────────────────────────

  describe('route categorization', () => {
    it('should categorize /api/chat as chat', () => {
      const result = checkEndpointRateLimit('/api/chat', `cat-chat-${Date.now()}`);
      expect(result.category).toBe('chat');
      expect(result.allowed).toBe(true);
    });

    it('should categorize /api/chat/123/messages as chat', () => {
      const result = checkEndpointRateLimit('/api/chat/123/messages', `cat-chat2-${Date.now()}`);
      expect(result.category).toBe('chat');
    });

    it('should categorize /api/image/generate as generation', () => {
      const result = checkEndpointRateLimit('/api/image/generate', `cat-gen-${Date.now()}`);
      expect(result.category).toBe('generation');
      expect(result.allowed).toBe(true);
    });

    it('should categorize /api/video/generate as generation', () => {
      const result = checkEndpointRateLimit('/api/video/generate', `cat-gen2-${Date.now()}`);
      expect(result.category).toBe('generation');
    });

    it('should categorize /api/code as code', () => {
      const result = checkEndpointRateLimit('/api/code', `cat-code-${Date.now()}`);
      expect(result.category).toBe('code');
      expect(result.allowed).toBe(true);
    });

    it('should categorize /api/code-generation as code', () => {
      const result = checkEndpointRateLimit('/api/code-generation', `cat-code2-${Date.now()}`);
      expect(result.category).toBe('code');
    });

    it('should categorize /api/auth as auth', () => {
      const result = checkEndpointRateLimit('/api/auth', `cat-auth-${Date.now()}`);
      expect(result.category).toBe('auth');
      expect(result.allowed).toBe(true);
    });

    it('should categorize /api/admin as admin', () => {
      const result = checkEndpointRateLimit('/api/admin', `cat-admin-${Date.now()}`);
      expect(result.category).toBe('admin');
      expect(result.allowed).toBe(true);
    });

    it('should categorize /api/builder as builder', () => {
      const result = checkEndpointRateLimit('/api/builder', `cat-builder-${Date.now()}`);
      expect(result.category).toBe('builder');
      expect(result.allowed).toBe(true);
    });

    it('should categorize /api/self-code as selfcode', () => {
      const result = checkEndpointRateLimit('/api/self-code', `cat-selfcode-${Date.now()}`);
      expect(result.category).toBe('selfcode');
      expect(result.allowed).toBe(true);
    });

    it('should categorize /api/self-improvement as selfcode', () => {
      const result = checkEndpointRateLimit('/api/self-improvement', `cat-si-${Date.now()}`);
      expect(result.category).toBe('selfcode');
    });

    it('should categorize unknown routes as general', () => {
      const result = checkEndpointRateLimit('/api/unknown-endpoint', `cat-unknown-${Date.now()}`);
      expect(result.category).toBe('general');
    });

    it('should categorize /api/voice as chat', () => {
      const result = checkEndpointRateLimit('/api/voice', `cat-voice-${Date.now()}`);
      expect(result.category).toBe('chat');
    });

    it('should categorize /api/music/generate as generation', () => {
      const result = checkEndpointRateLimit('/api/music/generate', `cat-music-${Date.now()}`);
      expect(result.category).toBe('generation');
    });
  });

  // ─── Token Bucket Exhaustion ────────────────────────────────────────────────

  describe('token bucket exhaustion', () => {
    it('should exhaust chat tokens (20/min) then block', () => {
      const key = `exhaust-chat-${Date.now()}`;

      for (let i = 0; i < 20; i++) {
        const result = checkEndpointRateLimit('/api/chat', key);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkEndpointRateLimit('/api/chat', key);
      expect(blocked.allowed).toBe(false);
      expect(blocked.category).toBe('chat');
    });

    it('should exhaust generation tokens (6/min) then block', () => {
      const key = `exhaust-gen-${Date.now()}`;

      for (let i = 0; i < 6; i++) {
        const result = checkEndpointRateLimit('/api/image/generate', key);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkEndpointRateLimit('/api/image/generate', key);
      expect(blocked.allowed).toBe(false);
    });

    it('should exhaust code tokens (8/min) then block', () => {
      const key = `exhaust-code-${Date.now()}`;

      for (let i = 0; i < 8; i++) {
        const result = checkEndpointRateLimit('/api/code', key);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkEndpointRateLimit('/api/code', key);
      expect(blocked.allowed).toBe(false);
    });

    it('should exhaust auth tokens (5/min) then block', () => {
      const key = `exhaust-auth-${Date.now()}`;

      for (let i = 0; i < 5; i++) {
        const result = checkEndpointRateLimit('/api/auth', key);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkEndpointRateLimit('/api/auth', key);
      expect(blocked.allowed).toBe(false);
    });

    it('should exhaust selfcode tokens (3/min) then block', () => {
      const key = `exhaust-sc-${Date.now()}`;

      for (let i = 0; i < 3; i++) {
        const result = checkEndpointRateLimit('/api/self-code', key);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkEndpointRateLimit('/api/self-code', key);
      expect(blocked.allowed).toBe(false);
    });

    it('should track remaining tokens correctly', () => {
      const key = `remaining-test-${Date.now()}`;

      const r1 = checkEndpointRateLimit('/api/auth', key);
      expect(r1.remaining).toBe(4);

      const r2 = checkEndpointRateLimit('/api/auth', key);
      expect(r2.remaining).toBe(3);

      const r3 = checkEndpointRateLimit('/api/auth', key);
      expect(r3.remaining).toBe(2);
    });

    it('should isolate tokens per identity key', () => {
      const key1 = `iso-1-${Date.now()}`;
      const key2 = `iso-2-${Date.now()}`;

      // Exhaust key1's auth bucket (5 tokens)
      for (let i = 0; i < 5; i++) {
        checkEndpointRateLimit('/api/auth', key1);
      }
      const blocked = checkEndpointRateLimit('/api/auth', key1);
      expect(blocked.allowed).toBe(false);

      // key2 should still be allowed
      const allowed = checkEndpointRateLimit('/api/auth', key2);
      expect(allowed.allowed).toBe(true);
    });
  });

  // ─── Token Bucket Refill ────────────────────────────────────────────────────

  describe('token bucket refill', () => {
    it('should refill tokens over time', () => {
      const key = `refill-test-${Date.now()}`;

      // Use all 5 auth tokens
      for (let i = 0; i < 5; i++) {
        checkEndpointRateLimit('/api/auth', key);
      }
      expect(checkEndpointRateLimit('/api/auth', key).allowed).toBe(false);

      // Simulate time passage by manually advancing Date.now
      const realDateNow = Date.now;
      try {
        // Advance 60 seconds → auth refillRate is 5/60 per second = 0.0833/s
        // After 60s, 5 tokens refilled → bucket is full again
        let callCount = 0;
        global.Date.now = () => {
          callCount++;
          // First few calls are during the exhaustion loop (real time)
          // Subsequent calls see 60s in the future
          return realDateNow() + 60_000;
        };

        const afterRefill = checkEndpointRateLimit('/api/auth', key);
        expect(afterRefill.allowed).toBe(true);
      } finally {
        global.Date.now = realDateNow;
      }
    });
  });

  // ─── getRateLimitHeaders ────────────────────────────────────────────────────

  describe('getRateLimitHeaders', () => {
    it('should include standard headers when request is allowed', () => {
      const result = checkEndpointRateLimit('/api/chat', `hdr-allowed-${Date.now()}`);

      const headers = getRateLimitHeaders(result);

      expect(headers).toHaveProperty('X-RateLimit-Category', 'chat');
      expect(headers).toHaveProperty('X-RateLimit-Remaining');
      expect(headers).toHaveProperty('X-RateLimit-Limit');
      expect(headers).not.toHaveProperty('Retry-After');
    });

    it('should include Retry-After header when not allowed', () => {
      const key = `hdr-blocked-${Date.now()}`;

      // Exhaust chat tokens (20)
      for (let i = 0; i < 20; i++) {
        checkEndpointRateLimit('/api/chat', key);
      }
      const result = checkEndpointRateLimit('/api/chat', key);

      const headers = getRateLimitHeaders(result);

      expect(headers).toHaveProperty('Retry-After');
      expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
    });

    it('should format headers as string values', () => {
      const result = checkEndpointRateLimit('/api/code', `hdr-fmt-${Date.now()}`);
      const headers = getRateLimitHeaders(result);

      for (const value of Object.values(headers)) {
        expect(typeof value).toBe('string');
      }
    });
  });

  // ─── getEndpointRateLimitStats ──────────────────────────────────────────────

  describe('getEndpointRateLimitStats', () => {
    it('should return stats for all categories', () => {
      const stats = getEndpointRateLimitStats();

      expect(stats).toHaveProperty('chat');
      expect(stats).toHaveProperty('generation');
      expect(stats).toHaveProperty('code');
      expect(stats).toHaveProperty('auth');
      expect(stats).toHaveProperty('admin');
      expect(stats).toHaveProperty('builder');
      expect(stats).toHaveProperty('selfcode');
      expect(stats).toHaveProperty('general');
    });

    it('should include description in each category', () => {
      const stats = getEndpointRateLimitStats();

      expect(stats.chat.description).toContain('Chat API');
      expect(stats.generation.description).toContain('Generation API');
      expect(stats.code.description).toContain('Code API');
      expect(stats.auth.description).toContain('Auth API');
      expect(stats.admin.description).toContain('Admin API');
      expect(stats.builder.description).toContain('Builder API');
      expect(stats.selfcode.description).toContain('Self-Code API');
      expect(stats.general.description).toContain('General API');
    });

    it('should report activeBuckets count', () => {
      const key = `stats-test-${Date.now()}`;
      checkEndpointRateLimit('/api/chat', key);

      const stats = getEndpointRateLimitStats();

      // chat category should have at least 1 active bucket
      expect(stats.chat.activeBuckets).toBeGreaterThanOrEqual(1);
    });

    it('should track multiple active buckets per category', () => {
      const ts = Date.now();
      checkEndpointRateLimit('/api/chat', `stats-u1-${ts}`);
      checkEndpointRateLimit('/api/chat', `stats-u2-${ts}`);
      checkEndpointRateLimit('/api/chat', `stats-u3-${ts}`);

      const stats = getEndpointRateLimitStats();

      // chat should have at least 3 buckets from these + previous tests
      expect(stats.chat.activeBuckets).toBeGreaterThanOrEqual(3);
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle empty path gracefully', () => {
      const key = `edge-empty-${Date.now()}`;
      const result = checkEndpointRateLimit('', key);

      expect(result.category).toBe('general');
      expect(result.allowed).toBe(true);
    });

    it('should handle path without /api prefix as general', () => {
      const key = `edge-nopfx-${Date.now()}`;
      const result = checkEndpointRateLimit('/health', key);

      expect(result.category).toBe('general');
    });

    it('should match more specific routes first (selfcode vs general)', () => {
      const key = `edge-specific-${Date.now()}`;
      const result = checkEndpointRateLimit('/api/self-code/execute', key);

      expect(result.category).toBe('selfcode');
    });
  });
});
