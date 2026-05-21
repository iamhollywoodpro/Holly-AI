/**
 * Phase 17: Multi-User Isolation and Scaling
 *
 * Per-user context caching, profile pre-warming, connection pooling,
 * and multi-tenant query helpers. Ensures response time doesn't
 * degrade as users grow.
 *
 * Architecture:
 * - UserContextCache: LRU cache keyed by userId for hot paths
 * - Profile pre-warming: loads active users on startup + interval
 * - Multi-tenant query helpers: enforce userId filtering
 * - Cache invalidation: on profile update, memory change, etc.
 */

import { prisma } from '@/lib/db';
import { cache, type CacheOptions } from '@/lib/cache/redis-cache';

// ── Types ──────────────────────────────────────────────────────────────

interface CachedUserProfile {
  id: string;
  clerkUserId: string | null;
  name: string | null;
  email: string;
  imageUrl: string | null;
  createdAt: string;
  lastActiveAt: string;
}

interface CachedRelationshipProfile {
  relationshipDepth: number;
  trustLevel: number;
  communicationStyle: Record<string, unknown>;
  personalityModel: Record<string, unknown>;
  expertiseAreas: string[];
  activeGoals: string[];
  coreValues: string[];
  boundaries: string[];
  totalInteractions: number;
  totalConversations: number;
  profileVersion: number;
}

interface CachedLearningProfile {
  commonTopics: string[];
  communicationStyle: string;
  preferredResponseLength: string;
  interests: string[];
  expertise: Record<string, unknown>;
}

interface CachedPreferences {
  theme: string;
  language: string;
  timezone: string | null;
  dateFormat: string;
}

interface CachedTasteProfile {
  tone: number;
  verbosity: number;
  humor: number;
  technical: number;
  emoji: number;
  topTopics: string[];
  formats: string[];
}

interface CachedContext {
  user: CachedUserProfile | null;
  relationship: CachedRelationshipProfile | null;
  learning: CachedLearningProfile | null;
  preferences: CachedPreferences | null;
  taste: CachedTasteProfile | null;
  recentTopics: string[];
  activeProjects: string[];
  cachedAt: number;
  ttl: number; // ms
}

interface CacheStats {
  users: number;
  hits: number;
  misses: number;
  invalidations: number;
  prewarmingRuns: number;
  lastPrewarmAt: string | null;
}

// ── Constants ──────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHED_USERS = 200;
const PREWARM_INTERVAL = 10 * 60 * 1000; // 10 minutes
const PREWARM_TOP_N = 50; // top 50 active users

// ── In-Memory Cache (fast LRU for per-request) ─────────────────────────

class UserContextLRU {
  private cache = new Map<string, CachedContext>();
  private stats = { hits: 0, misses: 0, invalidations: 0, prewarmingRuns: 0, lastPrewarmAt: null as string | null };

  get(userId: string): CachedContext | null {
    const entry = this.cache.get(userId);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() - entry.cachedAt > entry.ttl) {
      this.cache.delete(userId);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    // Move to end (LRU refresh)
    this.cache.delete(userId);
    this.cache.set(userId, entry);
    return entry;
  }

  set(userId: string, context: CachedContext): void {
    if (this.cache.size >= MAX_CACHED_USERS) {
      // Evict oldest entry (first in map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(userId, context);
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
    this.stats.invalidations++;
  }

  invalidateAll(): void {
    this.cache.clear();
    this.stats.invalidations += this.cache.size;
  }

  getStats(): CacheStats & { users: number } {
    return {
      users: this.cache.size,
      ...this.stats,
    };
  }

  recordPrewarm(): void {
    this.stats.prewarmingRuns++;
    this.stats.lastPrewarmAt = new Date().toISOString();
  }
}

const userCache = new UserContextLRU();

// ── Load Context for a User ────────────────────────────────────────────

export async function getUserContext(userId: string): Promise<CachedContext> {
  // Check LRU cache first
  const cached = userCache.get(userId);
  if (cached) return cached;

  // Load from DB (parallel queries)
  const [
    user,
    relProfile,
    learningProfile,
    preferences,
    tasteProfile,
    relContext,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, clerkUserId: true, name: true, email: true,
        imageUrl: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.relationshipProfile.findFirst({
      where: { userId },
    }),
    prisma.userLearningProfile.findFirst({
      where: { userId },
    }),
    prisma.userPreferences.findFirst({
      where: { userId },
    }),
    prisma.tasteProfile.findFirst({
      where: { userId },
    }),
    prisma.relationshipContext.findFirst({
      where: { userId },
    }),
  ]);

  const context: CachedContext = {
    user: user ? {
      id: user.id,
      clerkUserId: user.clerkUserId,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: user.updatedAt.toISOString(),
    } : null,
    relationship: relProfile ? {
      relationshipDepth: relProfile.relationshipDepth,
      trustLevel: relProfile.trustLevel,
      communicationStyle: (relProfile.communicationStyle ?? {}) as Record<string, unknown>,
      personalityModel: (relProfile.personalityModel ?? {}) as Record<string, unknown>,
      expertiseAreas: Array.isArray(relProfile.expertiseAreas) ? relProfile.expertiseAreas as string[] : [],
      activeGoals: Array.isArray(relProfile.activeGoals) ? relProfile.activeGoals as string[] : [],
      coreValues: Array.isArray(relProfile.coreValues) ? relProfile.coreValues as string[] : [],
      boundaries: Array.isArray(relProfile.boundaries) ? relProfile.boundaries as string[] : [],
      totalInteractions: relProfile.totalInteractions,
      totalConversations: relProfile.totalConversations,
      profileVersion: relProfile.profileVersion,
    } : null,
    learning: learningProfile ? {
      commonTopics: learningProfile.commonTopics,
      communicationStyle: learningProfile.communicationStyle,
      preferredResponseLength: learningProfile.preferredResponseLength,
      interests: learningProfile.interests,
      expertise: (learningProfile.expertise ?? {}) as Record<string, unknown>,
    } : null,
    preferences: preferences ? {
      theme: preferences.theme,
      language: preferences.language,
      timezone: preferences.timezone,
      dateFormat: preferences.dateFormat,
    } : null,
    taste: tasteProfile ? {
      tone: tasteProfile.tone,
      verbosity: tasteProfile.verbosity,
      humor: tasteProfile.humor,
      technical: tasteProfile.technical,
      emoji: tasteProfile.emoji,
      topTopics: tasteProfile.topTopics,
      formats: tasteProfile.formats,
    } : null,
    recentTopics: Array.isArray((relContext as Record<string, unknown> | null)?.recentTopics)
      ? (relContext as Record<string, unknown> | null)!.recentTopics as string[] : [],
    activeProjects: Array.isArray((relContext as Record<string, unknown> | null)?.activeProjects)
      ? (relContext as Record<string, unknown> | null)!.activeProjects as string[] : [],
    cachedAt: Date.now(),
    ttl: CACHE_TTL,
  };

  userCache.set(userId, context);
  return context;
}

// ── Cache Invalidation ─────────────────────────────────────────────────

export function invalidateUserCache(userId: string): void {
  userCache.invalidate(userId);
}

export function invalidateAllCaches(): void {
  userCache.invalidateAll();
}

// ── Profile Pre-warming ────────────────────────────────────────────────

export async function prewarmActiveUsers(): Promise<{
  warmed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let warmed = 0;

  try {
    // Find most active users by recent conversations
    const activeUsers = await prisma.user.findMany({
      where: {
        conversations: {
          some: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
      },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
      take: PREWARM_TOP_N,
    });

    for (const u of activeUsers) {
      try {
        await getUserContext(u.id);
        warmed++;
      } catch (err) {
        errors.push(`User ${u.id}: ${(err as Error).message}`);
      }
    }

    userCache.recordPrewarm();
    console.log(`[MultiTenant] Pre-warmed ${warmed}/${activeUsers.length} active user contexts`);
  } catch (err) {
    errors.push(`Prewarm failed: ${(err as Error).message}`);
    console.error('[MultiTenant] Prewarm failed:', err);
  }

  return { warmed, errors };
}

// ── Multi-Tenant Query Helpers ─────────────────────────────────────────

/**
 * Wraps a Prisma query with userId filtering.
 * Ensures no query accidentally leaks cross-user data.
 */
export function userScoped<T extends Record<string, unknown>>(
  userId: string,
  query: T,
): T & { where: { userId: string } } {
  return {
    ...query,
    where: {
      ...(query.where as Record<string, unknown> ?? {}),
      userId,
    },
  } as T & { where: { userId: string } };
}

/**
 * Batch load multiple users' contexts in parallel.
 * Useful for admin dashboards or multi-user features.
 */
export async function batchGetUserContexts(
  userIds: string[],
): Promise<Map<string, CachedContext>> {
  const results = new Map<string, CachedContext>();
  await Promise.all(
    userIds.map(async (id) => {
      try {
        results.set(id, await getUserContext(id));
      } catch {
        // Skip failed loads silently
      }
    })
  );
  return results;
}

// ── Cache Stats ────────────────────────────────────────────────────────

export function getCacheStats(): CacheStats & { users: number } {
  return userCache.getStats();
}

// ── Connection Pool Config ─────────────────────────────────────────────

/**
 * Returns recommended Prisma connection pool settings for Neon PostgreSQL.
 * Call this from the Prisma datasource URL config.
 */
export function getPoolConfig(): {
  connection_limit: number;
  pool_timeout: number;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    connection_limit: isProduction ? 20 : 5,
    pool_timeout: 30,
  };
}

/**
 * Returns the optimized DATABASE_URL with connection pooling params appended.
 */
export function getOptimizedDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return '';

  const pool = getPoolConfig();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}connection_limit=${pool.connection_limit}&pool_timeout=${pool.pool_timeout}`;
}
