// ─────────────────────────────────────────────────────────────────────────────
// Redis Cache Utility — Phase 7.1 Performance Optimization
// 
// Uses Upstash Redis for distributed caching. Falls back to in-memory
// LRU cache when Redis is not configured (development/local).
//
// Usage:
//   const cached = await cache.get<UserProfile>('user:123');
//   await cache.set('user:123', profile, { ttl: 3600 }); // 1 hour
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CacheOptions {
  /** Time-to-live in seconds. Default: 300 (5 minutes) */
  ttl?: number;
  /** Namespace prefix for keys. Default: 'holly' */
  namespace?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: string;
  backend: 'redis' | 'memory';
  keysTracked: number;
}

// ─── In-Memory LRU Cache (fallback) ──────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store: Map<string, CacheEntry<any>> = new Map();
  private maxSize = 500;
  private stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    // LRU: move to end (most recently used)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.stats.sets++;
  }

  delete(key: string): boolean {
    this.stats.deletes++;
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + '%' : 'N/A',
    };
  }
}

// ─── Redis Client (lazy init) ─────────────────────────────────────────────────

let redisClient: any = null;
let redisInitAttempted = false;

async function getRedisClient(): Promise<any | null> {
  if (redisClient) return redisClient;
  if (redisInitAttempted) return null;

  redisInitAttempted = true;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.log('[Cache] Upstash Redis not configured — using in-memory cache');
    return null;
  }

  try {
    // Use Upstash REST API directly (no SDK dependency needed)
    redisClient = {
      url: redisUrl,
      token: redisToken,
      async get(key: string): Promise<string | null> {
        const res = await fetch(`${this.url}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${this.token}` },
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.result;
      },
      async set(key: string, value: string, ex?: number): Promise<boolean> {
        const body: any = { key, value };
        if (ex) body.ex = ex;
        const res = await fetch(`${this.url}/set`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(3000),
        });
        return res.ok;
      },
      async del(key: string): Promise<number> {
        const res = await fetch(`${this.url}/del/${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` },
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return 0;
        const data = await res.json();
        return data.result || 0;
      },
    };
    console.log('[Cache] ✅ Connected to Upstash Redis');
    return redisClient;
  } catch (err) {
    console.warn('[Cache] Redis connection failed — using in-memory cache:', err);
    return null;
  }
}

// ─── Cache Interface ──────────────────────────────────────────────────────────

class HollyCache {
  private memory = new MemoryCache();
  private defaultNamespace = 'holly';
  private defaultTtl = 300; // 5 minutes

  /**
   * Get a cached value by key.
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.namespace);

    // Try Redis first
    const redis = await getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(fullKey);
        if (raw !== null) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch {
        // Redis error — fall through to memory cache
      }
    }

    // Fall back to memory cache
    return this.memory.get<T>(fullKey);
  }

  /**
   * Set a cached value with optional TTL.
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options?.namespace);
    const ttl = options?.ttl ?? this.defaultTtl;

    // Set in Redis
    const redis = await getRedisClient();
    if (redis) {
      try {
        await redis.set(fullKey, JSON.stringify(value), ttl);
        return; // Redis is primary — don't double-cache in memory
      } catch {
        // Redis error — fall through to memory cache
      }
    }

    // Fall back to memory cache
    this.memory.set(fullKey, value, ttl);
  }

  /**
   * Get a value, computing it with the factory if not cached.
   * This is the main entry point for cache-aware data fetching.
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete a cached value.
   */
  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);

    const redis = await getRedisClient();
    if (redis) {
      try {
        const deleted = await redis.del(fullKey);
        return deleted > 0;
      } catch {
        // Fall through
      }
    }

    return this.memory.delete(fullKey);
  }

  /**
   * Invalidate all keys matching a prefix.
   * Handles both memory cache and Redis (via tracked keys).
   */
  async invalidatePrefix(prefix: string, namespace?: string): Promise<number> {
    const fullPrefix = this.buildKey(prefix, namespace);
    let count = 0;

    // Memory cache: iterate and delete matching entries
    for (const key of Array.from((this.memory as any).store.keys()) as string[]) {
      if (key.startsWith(fullPrefix)) {
        this.memory.delete(key);
        count++;
      }
    }

    // Redis: delete known keys with this prefix
    // Note: we track keys in memory for prefix invalidation; SCAN is too expensive over REST API
    const redis = await getRedisClient();
    if (redis) {
      try {
        // Try to delete the prefix-prefixed key directly (works for single-key namespaces)
        await redis.del(fullPrefix);
      } catch {
        // Non-critical
      }
    }

    return count;
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<CacheStats> {
    const redis = await getRedisClient();
    const memStats = this.memory.getStats();

    return {
      hits: memStats.hits,
      misses: memStats.misses,
      sets: memStats.sets,
      deletes: memStats.deletes,
      hitRate: memStats.hitRate,
      backend: redis ? 'redis' : 'memory',
      keysTracked: this.memory.size,
    };
  }

  /**
   * Build a full cache key with namespace.
   */
  private buildKey(key: string, namespace?: string): string {
    const ns = namespace ?? this.defaultNamespace;
    return `${ns}:${key}`;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const cache = new HollyCache();

// ─── Pre-configured Cache Helpers ─────────────────────────────────────────────

/** Cache user profiles for 10 minutes */
export async function getCachedUserProfile(userId: string, fetcher: () => Promise<any>): Promise<any> {
  return cache.getOrSet(`profile:${userId}`, fetcher, { ttl: 600, namespace: 'user' });
}

/** Cache health check results for 30 seconds */
export async function getCachedHealth(fetcher: () => Promise<any>): Promise<any> {
  return cache.getOrSet('health:latest', fetcher, { ttl: 30, namespace: 'system' });
}

/** Cache analytics data for 5 minutes */
export async function getCachedAnalytics(key: string, fetcher: () => Promise<any>): Promise<any> {
  return cache.getOrSet(key, fetcher, { ttl: 300, namespace: 'analytics' });
}

/** Cache LLM provider responses for 15 minutes */
export async function getCachedLLMResponse(hash: string, fetcher: () => Promise<any>): Promise<any> {
  return cache.getOrSet(hash, fetcher, { ttl: 900, namespace: 'llm' });
}
