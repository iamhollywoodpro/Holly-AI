/// <reference types="jest" />

/**
 * Multi-Tenant User Context Cache Test Suite
 *
 * Tests for src/lib/multi-tenant/user-context-cache.ts covering:
 *   - LRU caching with TTL expiration and eviction
 *   - Cache invalidation (single + full)
 *   - User-scoped query helpers
 *   - Batch context loading
 *   - Cache stats and connection pool config
 *   - Profile pre-warming
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Setup
// ═══════════════════════════════════════════════════════════════════════════════

const mockUserFindUnique = jest.fn();
const mockUserFindMany = jest.fn();
const mockRelProfileFindFirst = jest.fn();
const mockLearningProfileFindFirst = jest.fn();
const mockUserPreferencesFindFirst = jest.fn();
const mockTasteProfileFindFirst = jest.fn();
const mockRelContextFindFirst = jest.fn();
const mockRelMemoryFindMany = jest.fn();
const mockConversationFindMany = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
    },
    relationshipProfile: {
      findFirst: mockRelProfileFindFirst,
    },
    userLearningProfile: {
      findFirst: mockLearningProfileFindFirst,
    },
    userPreferences: {
      findFirst: mockUserPreferencesFindFirst,
    },
    tasteProfile: {
      findFirst: mockTasteProfileFindFirst,
    },
    relationshipContext: {
      findFirst: mockRelContextFindFirst,
    },
    relationshipMemory: {
      findMany: mockRelMemoryFindMany,
    },
    conversation: {
      findMany: mockConversationFindMany,
    },
  },
}));

jest.mock('@/lib/cache/redis-cache', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Imports
// ═══════════════════════════════════════════════════════════════════════════════

import {
  getUserContext,
  invalidateUserCache,
  invalidateAllCaches,
  prewarmActiveUsers,
  userScoped,
  batchGetUserContexts,
  getCacheStats,
  getPoolConfig,
  getOptimizedDatabaseUrl,
} from '@/lib/multi-tenant/user-context-cache';

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Create a full set of mock DB return values for a user context load. */
function mockFullUserLoad(userId: string) {
  mockUserFindUnique.mockResolvedValue({
    id: userId,
    clerkUserId: `clerk_${userId}`,
    name: 'Test User',
    email: 'test@example.com',
    imageUrl: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  });
  mockRelProfileFindFirst.mockResolvedValue({
    relationshipDepth: 5,
    trustLevel: 4,
    communicationStyle: { style: 'casual' },
    personalityModel: {},
    expertiseAreas: ['tech'],
    activeGoals: ['learn'],
    coreValues: ['honesty'],
    boundaries: [],
    totalInteractions: 100,
    totalConversations: 50,
    profileVersion: 1,
  });
  mockLearningProfileFindFirst.mockResolvedValue({
    commonTopics: ['ai'],
    communicationStyle: 'direct',
    preferredResponseLength: 'medium',
    interests: ['coding'],
    expertise: {},
  });
  mockUserPreferencesFindFirst.mockResolvedValue({
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'ISO',
  });
  mockTasteProfileFindFirst.mockResolvedValue({
    tone: 7,
    verbosity: 5,
    humor: 3,
    technical: 8,
    emoji: 2,
    topTopics: ['ai'],
    formats: ['text'],
  });
  mockRelContextFindFirst.mockResolvedValue({
    recentTopics: ['topic1', 'topic2'],
    activeProjects: ['project1'],
  });
  mockRelMemoryFindMany.mockResolvedValue([
    { key: 'mem1', content: 'memory content' },
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Test Suite
// ═══════════════════════════════════════════════════════════════════════════════

describe('Multi-Tenant User Context Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    invalidateAllCaches();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getUserContext
  // ─────────────────────────────────────────────────────────────────────────

  describe('getUserContext', () => {
    it('loads from DB on first call', async () => {
      mockFullUserLoad('user-1');

      const ctx = await getUserContext('user-1');

      // Should have called all 7 parallel queries
      expect(mockUserFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } })
      );
      expect(mockRelProfileFindFirst).toHaveBeenCalled();
      expect(mockLearningProfileFindFirst).toHaveBeenCalled();
      expect(mockUserPreferencesFindFirst).toHaveBeenCalled();
      expect(mockTasteProfileFindFirst).toHaveBeenCalled();
      expect(mockRelContextFindFirst).toHaveBeenCalled();
      expect(mockRelMemoryFindMany).toHaveBeenCalled();

      // Verify the returned shape
      expect(ctx.user).toBeTruthy();
      expect(ctx.user!.id).toBe('user-1');
      expect(ctx.user!.email).toBe('test@example.com');
      expect(ctx.relationship).toBeTruthy();
      expect(ctx.relationship!.trustLevel).toBe(4);
      expect(ctx.learning).toBeTruthy();
      expect(ctx.preferences).toBeTruthy();
      expect(ctx.taste).toBeTruthy();
      expect(ctx.recentTopics).toEqual(['topic1', 'topic2']);
      expect(ctx.activeProjects).toEqual(['project1']);
      expect(ctx.semanticMemories).toEqual([{ key: 'mem1', content: 'memory content' }]);
    });

    it('caches and returns on second call without DB hit', async () => {
      mockFullUserLoad('user-2');

      // First call hits DB
      await getUserContext('user-2');
      const dbCallCount = mockUserFindUnique.mock.calls.length;

      // Second call should use cache
      const ctx = await getUserContext('user-2');

      expect(mockUserFindUnique.mock.calls.length).toBe(dbCallCount);
      expect(ctx.user!.id).toBe('user-2');
    });

    it('returns null user fields when user not found in DB', async () => {
      mockUserFindUnique.mockResolvedValue(null);
      mockRelProfileFindFirst.mockResolvedValue(null);
      mockLearningProfileFindFirst.mockResolvedValue(null);
      mockUserPreferencesFindFirst.mockResolvedValue(null);
      mockTasteProfileFindFirst.mockResolvedValue(null);
      mockRelContextFindFirst.mockResolvedValue(null);
      mockRelMemoryFindMany.mockResolvedValue([]);

      const ctx = await getUserContext('ghost-user');

      expect(ctx.user).toBeNull();
      expect(ctx.relationship).toBeNull();
      expect(ctx.learning).toBeNull();
      expect(ctx.preferences).toBeNull();
      expect(ctx.taste).toBeNull();
      expect(ctx.recentTopics).toEqual([]);
      expect(ctx.activeProjects).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LRU TTL Expiration
  // ─────────────────────────────────────────────────────────────────────────

  describe('LRU TTL expiration', () => {
    it('triggers DB reload after TTL expires', async () => {
      jest.useFakeTimers();

      mockFullUserLoad('user-ttl');

      // First call populates cache with current (faked) time
      await getUserContext('user-ttl');
      expect(mockUserFindUnique).toHaveBeenCalledTimes(1);

      // Advance past TTL (5 minutes + 1ms)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);

      mockFullUserLoad('user-ttl');
      await getUserContext('user-ttl');

      // Should have reloaded from DB
      expect(mockUserFindUnique).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LRU Eviction
  // ─────────────────────────────────────────────────────────────────────────

  describe('LRU eviction when cache full (200 users)', () => {
    it('evicts oldest entry when cache reaches max capacity', async () => {
      // Fill cache with 200 users
      for (let i = 0; i < 200; i++) {
        const userId = `user-evict-${i}`;
        mockFullUserLoad(userId);
        await getUserContext(userId);
      }

      const statsBefore = getCacheStats();
      expect(statsBefore.users).toBe(200);

      // Adding user 201 should evict the oldest (user-evict-0)
      mockFullUserLoad('user-evict-200');
      await getUserContext('user-evict-200');

      const statsAfter = getCacheStats();
      expect(statsAfter.users).toBe(200);

      // Loading the evicted user again should hit DB (cache miss)
      jest.clearAllMocks();
      mockFullUserLoad('user-evict-0');
      await getUserContext('user-evict-0');
      expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // invalidateUserCache
  // ─────────────────────────────────────────────────────────────────────────

  describe('invalidateUserCache', () => {
    it('removes a specific user from cache', async () => {
      mockFullUserLoad('user-inval');
      await getUserContext('user-inval');
      expect(getCacheStats().users).toBe(1);

      invalidateUserCache('user-inval');
      expect(getCacheStats().users).toBe(0);

      // Next load should hit DB again
      jest.clearAllMocks();
      mockFullUserLoad('user-inval');
      await getUserContext('user-inval');
      expect(mockUserFindUnique).toHaveBeenCalledTimes(1);
    });

    it('does not affect other cached users', async () => {
      mockFullUserLoad('user-a');
      await getUserContext('user-a');
      mockFullUserLoad('user-b');
      await getUserContext('user-b');
      expect(getCacheStats().users).toBe(2);

      invalidateUserCache('user-a');
      expect(getCacheStats().users).toBe(1);

      // user-b should still be cached
      jest.clearAllMocks();
      mockFullUserLoad('user-b');
      const ctx = await getUserContext('user-b');
      expect(mockUserFindUnique).not.toHaveBeenCalled();
      expect(ctx.user!.id).toBe('user-b');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // invalidateAllCaches
  // ─────────────────────────────────────────────────────────────────────────

  describe('invalidateAllCaches', () => {
    it('clears all cached users', async () => {
      mockFullUserLoad('user-c1');
      await getUserContext('user-c1');
      mockFullUserLoad('user-c2');
      await getUserContext('user-c2');
      expect(getCacheStats().users).toBe(2);

      invalidateAllCaches();
      expect(getCacheStats().users).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // userScoped
  // ─────────────────────────────────────────────────────────────────────────

  describe('userScoped', () => {
    it('merges userId into where clause', () => {
      const query = { select: { id: true } };
      const result = userScoped('user-123', query);

      expect(result.where).toEqual({ userId: 'user-123' });
      expect(result.select).toEqual({ id: true });
    });

    it('preserves existing where conditions', () => {
      const query = {
        where: { status: 'active', category: 'general' },
        select: { id: true },
      };
      const result = userScoped('user-456', query);

      expect(result.where).toEqual({
        status: 'active',
        category: 'general',
        userId: 'user-456',
      });
      expect(result.select).toEqual({ id: true });
    });

    it('overwrites userId in existing where clause', () => {
      const query = {
        where: { userId: 'wrong-user' },
      };
      const result = userScoped('user-correct', query);

      expect(result.where.userId).toBe('user-correct');
    });

    it('handles empty query object', () => {
      const result = userScoped('user-789', {});
      expect(result.where).toEqual({ userId: 'user-789' });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // batchGetUserContexts
  // ─────────────────────────────────────────────────────────────────────────

  describe('batchGetUserContexts', () => {
    it('loads multiple users in parallel', async () => {
      const users = ['batch-1', 'batch-2', 'batch-3'];
      // Set up mocks to return appropriate data per userId
      mockUserFindUnique.mockImplementation(({ where }) =>
        Promise.resolve({
          id: where.id,
          clerkUserId: `clerk_${where.id}`,
          name: 'Test User',
          email: `${where.id}@test.com`,
          imageUrl: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-06-01'),
        })
      );
      mockRelProfileFindFirst.mockResolvedValue(null);
      mockLearningProfileFindFirst.mockResolvedValue(null);
      mockUserPreferencesFindFirst.mockResolvedValue(null);
      mockTasteProfileFindFirst.mockResolvedValue(null);
      mockRelContextFindFirst.mockResolvedValue(null);
      mockRelMemoryFindMany.mockResolvedValue([]);

      const results = await batchGetUserContexts(users);

      expect(results.size).toBe(3);
      expect(results.get('batch-1')).toBeTruthy();
      expect(results.get('batch-1')!.user!.id).toBe('batch-1');
      expect(results.get('batch-2')).toBeTruthy();
      expect(results.get('batch-2')!.user!.id).toBe('batch-2');
      expect(results.get('batch-3')).toBeTruthy();
      expect(results.get('batch-3')!.user!.id).toBe('batch-3');
    });

    it('skips failed loads silently', async () => {
      mockFullUserLoad('batch-ok');
      // Make one user fail
      mockUserFindUnique
        .mockResolvedValueOnce({
          id: 'batch-ok',
          clerkUserId: null,
          name: 'OK',
          email: 'ok@test.com',
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockRejectedValueOnce(new Error('DB error'));
      mockRelProfileFindFirst
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('DB error'));
      mockLearningProfileFindFirst
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('DB error'));
      mockUserPreferencesFindFirst
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('DB error'));
      mockTasteProfileFindFirst
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('DB error'));
      mockRelContextFindFirst
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('DB error'));
      mockRelMemoryFindMany
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('DB error'));

      const results = await batchGetUserContexts(['batch-ok', 'batch-fail']);

      // Should only contain the successful user
      expect(results.has('batch-ok')).toBe(true);
      expect(results.has('batch-fail')).toBe(false);
    });

    it('returns empty map for empty input array', async () => {
      const results = await batchGetUserContexts([]);
      expect(results.size).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getCacheStats
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCacheStats', () => {
    it('returns correct counts after cache operations', async () => {
      // Capture baseline stats (module singleton persists across tests)
      const baseline = getCacheStats();

      // Load a user (causes one miss)
      mockFullUserLoad('stats-user');
      await getUserContext('stats-user');

      const stats1 = getCacheStats();
      expect(stats1.users).toBe(baseline.users + 1);
      expect(stats1.misses).toBe(baseline.misses + 1);

      // Hit the cache
      await getUserContext('stats-user');
      const stats2 = getCacheStats();
      expect(stats2.hits).toBe(baseline.hits + 1);
      expect(stats2.users).toBe(baseline.users + 1);

      // Invalidate
      invalidateUserCache('stats-user');
      const stats3 = getCacheStats();
      expect(stats3.invalidations).toBe(baseline.invalidations + 1);
      expect(stats3.users).toBe(baseline.users);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getPoolConfig
  // ─────────────────────────────────────────────────────────────────────────

  describe('getPoolConfig', () => {
    const originalNodeEnv = (process.env as any).NODE_ENV;

    afterEach(() => {
      (process.env as any).NODE_ENV = originalNodeEnv;
    });

    it('returns production config when NODE_ENV is production', () => {
      (process.env as any).NODE_ENV = 'production';
      const config = getPoolConfig();
      expect(config.connection_limit).toBe(20);
      expect(config.pool_timeout).toBe(30);
    });

    it('returns development config when NODE_ENV is not production', () => {
      (process.env as any).NODE_ENV = 'development';
      const config = getPoolConfig();
      expect(config.connection_limit).toBe(5);
      expect(config.pool_timeout).toBe(30);
    });

    it('returns development config when NODE_ENV is test', () => {
      (process.env as any).NODE_ENV = 'test';
      const config = getPoolConfig();
      expect(config.connection_limit).toBe(5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOptimizedDatabaseUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe('getOptimizedDatabaseUrl', () => {
    const originalDbUrl = process.env.DATABASE_URL;
    const originalNodeEnv = (process.env as any).NODE_ENV;

    afterEach(() => {
      process.env.DATABASE_URL = originalDbUrl;
      (process.env as any).NODE_ENV = originalNodeEnv;
    });

    it('appends pool params to a URL without existing query string', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
      (process.env as any).NODE_ENV = 'development';
      const url = getOptimizedDatabaseUrl();
      expect(url).toBe(
        'postgresql://user:pass@host:5432/db?connection_limit=5&pool_timeout=30'
      );
    });

    it('appends pool params with & when URL already has query string', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db?sslmode=require';
      (process.env as any).NODE_ENV = 'development';
      const url = getOptimizedDatabaseUrl();
      expect(url).toBe(
        'postgresql://user:pass@host:5432/db?sslmode=require&connection_limit=5&pool_timeout=30'
      );
    });

    it('uses production pool limits when NODE_ENV is production', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
      (process.env as any).NODE_ENV = 'production';
      const url = getOptimizedDatabaseUrl();
      expect(url).toContain('connection_limit=20');
    });

    it('returns empty string when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      const url = getOptimizedDatabaseUrl();
      expect(url).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // prewarmActiveUsers
  // ─────────────────────────────────────────────────────────────────────────

  describe('prewarmActiveUsers', () => {
    it('loads top active users into cache', async () => {
      // Mock active users query
      const activeUserIds = Array.from({ length: 5 }, (_, i) => ({ id: `active-${i}` }));
      mockUserFindMany.mockResolvedValue(activeUserIds);

      // Mock getUserContext DB calls for each user
      for (let i = 0; i < 5; i++) {
        mockFullUserLoad(`active-${i}`);
      }

      const result = await prewarmActiveUsers();

      expect(result.warmed).toBe(5);
      expect(result.errors).toHaveLength(0);
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50, // PREWARM_TOP_N
          select: { id: true },
          orderBy: { updatedAt: 'desc' },
        })
      );

      // Verify users are cached
      expect(getCacheStats().users).toBe(5);
    });

    it('continues loading when some users fail', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: 'good-1' },
        { id: 'bad-1' },
        { id: 'good-2' },
      ]);

      // good-1 loads fine
      mockFullUserLoad('good-1');

      // bad-1 fails on the user query
      mockUserFindUnique
        .mockResolvedValueOnce({
          id: 'good-1', clerkUserId: null, name: 'G1', email: 'g1@test.com',
          imageUrl: null, createdAt: new Date(), updatedAt: new Date(),
        })
        .mockRejectedValueOnce(new Error('DB connection lost'))
        .mockResolvedValueOnce({
          id: 'good-2', clerkUserId: null, name: 'G2', email: 'g2@test.com',
          imageUrl: null, createdAt: new Date(), updatedAt: new Date(),
        });

      mockRelProfileFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockLearningProfileFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockUserPreferencesFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockTasteProfileFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockRelContextFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockRelMemoryFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await prewarmActiveUsers();

      expect(result.warmed).toBe(2);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('bad-1');
    });

    it('returns error when active users query fails', async () => {
      mockUserFindMany.mockRejectedValue(new Error('Network failure'));

      const result = await prewarmActiveUsers();

      expect(result.warmed).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('Prewarm failed');
    });

    it('returns empty results when no active users exist', async () => {
      mockUserFindMany.mockResolvedValue([]);

      const result = await prewarmActiveUsers();

      expect(result.warmed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Cache hit/miss counters
  // ─────────────────────────────────────────────────────────────────────────

  describe('Cache hit/miss counters', () => {
    it('increments miss on first load and hit on cached load', async () => {
      mockFullUserLoad('counter-user');

      const baseline = getCacheStats();

      // First load -> miss
      await getUserContext('counter-user');
      let stats = getCacheStats();
      expect(stats.misses).toBe(baseline.misses + 1);
      expect(stats.hits).toBe(baseline.hits);

      // Second load -> hit
      await getUserContext('counter-user');
      stats = getCacheStats();
      expect(stats.hits).toBe(baseline.hits + 1);
      expect(stats.misses).toBe(baseline.misses + 1);

      // Third load -> hit
      await getUserContext('counter-user');
      stats = getCacheStats();
      expect(stats.hits).toBe(baseline.hits + 2);
    });

    it('counts miss on TTL-expired entry access', async () => {
      jest.useFakeTimers();
      mockFullUserLoad('ttl-counter');

      const baseline = getCacheStats();

      // Load and cache
      await getUserContext('ttl-counter');
      let stats = getCacheStats();
      expect(stats.misses).toBe(baseline.misses + 1);

      // Access within TTL -> hit
      await getUserContext('ttl-counter');
      stats = getCacheStats();
      expect(stats.hits).toBe(baseline.hits + 1);

      // Advance past TTL
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      mockFullUserLoad('ttl-counter');

      // Access after TTL -> miss (reloads from DB)
      await getUserContext('ttl-counter');
      stats = getCacheStats();
      expect(stats.misses).toBe(baseline.misses + 2);

      jest.useRealTimers();
    });
  });
});
