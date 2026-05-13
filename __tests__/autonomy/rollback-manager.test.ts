/**
 * Rollback Manager Tests
 *
 * Tests the DB-backed rollback state persistence logic.
 * Uses mock Prisma client to avoid database dependency.
 */

/// <reference types="jest" />

// Build the mock object BEFORE jest.mock so it's available in the factory
const mockSelfCodeRollback = {
  create: jest.fn(),
  update: jest.fn(),
  findUnique: jest.fn(),
  findMany: jest.fn(),
  deleteMany: jest.fn(),
  updateMany: jest.fn(),
  count: jest.fn(),
};

// Mock prisma before any imports
jest.mock('@/lib/db', () => ({
  prisma: {
    selfCodeRollback: mockSelfCodeRollback,
  },
}));

// Mock fs operations
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('original file content'),
  existsSync: jest.fn().mockReturnValue(true),
  writeFileSync: jest.fn(),
}));

jest.mock('@/lib/logging/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

describe('Rollback Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPendingChange', () => {
    it('should create a rollback record with correct fields', async () => {
      const mockRecord = {
        id: 'rollback-123',
        userId: 'user-1',
        planId: 'plan-1',
        filePath: 'src/lib/consciousness/test.ts',
        changeType: 'fix',
        riskLevel: 'low',
        status: 'pending',
        originalHash: expect.any(String),
        backupPath: '/backup/test.ts.bak',
        expiresAt: expect.any(Date),
      };

      mockSelfCodeRollback.create.mockResolvedValue(mockRecord);

      const { recordPendingChange } = await import('@/lib/autonomy/rollback-manager');

      const id = await recordPendingChange({
        userId: 'user-1',
        planId: 'plan-1',
        filePath: 'src/lib/consciousness/test.ts',
        changeType: 'fix',
        riskLevel: 'low',
        backupPath: '/backup/test.ts.bak',
      });

      expect(id).toBe('rollback-123');
      expect(mockSelfCodeRollback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            planId: 'plan-1',
            filePath: 'src/lib/consciousness/test.ts',
            changeType: 'fix',
            riskLevel: 'low',
            status: 'pending',
          }),
        }),
      );
    });

    it('should set expiry to 30 days from now', async () => {
      mockSelfCodeRollback.create.mockResolvedValue({ id: 'r1' });

      const { recordPendingChange } = await import('@/lib/autonomy/rollback-manager');

      const beforeDate = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
      await recordPendingChange({
        userId: 'user-1',
        planId: 'plan-1',
        filePath: 'test.ts',
        changeType: 'fix',
        riskLevel: 'low',
        backupPath: '/backup/test.bak',
      });
      const afterDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);

      const call = mockSelfCodeRollback.create.mock.calls[0][0];
      expect(call.data.expiresAt.getTime()).toBeGreaterThan(beforeDate.getTime());
      expect(call.data.expiresAt.getTime()).toBeLessThan(afterDate.getTime());
    });
  });

  describe('markApplied', () => {
    it('should update status to applied with timestamp', async () => {
      mockSelfCodeRollback.update.mockResolvedValue({});

      const { markApplied } = await import('@/lib/autonomy/rollback-manager');
      await markApplied('rollback-123');

      expect(mockSelfCodeRollback.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rollback-123' },
          data: expect.objectContaining({
            status: 'applied',
            appliedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('rollbackPlan', () => {
    it('should roll back all applied changes for a plan in reverse order', async () => {
      const appliedRecords = [
        { id: 'r1', filePath: 'a.ts', status: 'applied', backupPath: '/b1', appliedAt: new Date('2026-01-01') },
        { id: 'r2', filePath: 'b.ts', status: 'applied', backupPath: '/b2', appliedAt: new Date('2026-01-02') },
      ];

      mockSelfCodeRollback.findMany.mockResolvedValue(appliedRecords);
      mockSelfCodeRollback.findUnique.mockResolvedValue(appliedRecords[0]);
      mockSelfCodeRollback.update.mockResolvedValue({});

      const { rollbackPlan } = await import('@/lib/autonomy/rollback-manager');
      const count = await rollbackPlan('plan-1');

      expect(mockSelfCodeRollback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { planId: 'plan-1', status: 'applied' },
          orderBy: { appliedAt: 'desc' },
        }),
      );
    });
  });

  describe('getRollbackStats', () => {
    it('should return correct statistics', async () => {
      mockSelfCodeRollback.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(5)   // applied
        .mockResolvedValueOnce(3)   // rolledBack
        .mockResolvedValueOnce(1)   // pending
        .mockResolvedValueOnce(1);  // expired

      const { getRollbackStats } = await import('@/lib/autonomy/rollback-manager');
      const stats = await getRollbackStats('user-1');

      expect(stats).toEqual({
        total: 10,
        applied: 5,
        rolledBack: 3,
        pending: 1,
        expired: 1,
      });
    });
  });

  describe('cleanupExpiredRollbacks', () => {
    it('should delete expired records with terminal status', async () => {
      mockSelfCodeRollback.deleteMany.mockResolvedValue({ count: 5 });
      mockSelfCodeRollback.updateMany.mockResolvedValue({ count: 2 });

      const { cleanupExpiredRollbacks } = await import('@/lib/autonomy/rollback-manager');
      const count = await cleanupExpiredRollbacks();

      expect(count).toBe(5);
      expect(mockSelfCodeRollback.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: expect.any(Object),
          }),
        }),
      );
    });
  });
});
