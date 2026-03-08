/**
 * HOLLY Rate Limiter
 * Prevents abuse of AI and other expensive endpoints
 * 
 * Hybrid implementation:
 * - Uses Vercel KV (Redis) in production when available
 * - Falls back to in-memory storage for development
 */

import { NextRequest, NextResponse } from 'next/server';
import { hollyLogger } from './logger';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
  keyGenerator?: (req: NextRequest, userId: string) => string;  // Custom key generator
}

interface RequestLog {
  timestamps: number[];
}

// Type definition for Vercel KV client (matches @vercel/kv interface)
type VercelKVClient = {
  get: <T = unknown>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, options?: { ex?: number; px?: number }) => Promise<'OK' | null>;
  del: (key: string) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
};

// Storage abstraction interface
interface RateLimitStore {
  get(key: string): Promise<RequestLog | null>;
  set(key: string, value: RequestLog, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPattern(pattern: string): Promise<void>;
  getAllStats(): Promise<{ totalKeys: number; totalRequests: number; oldestTimestamp: number | null }>;
}

// ============================================================================
// Vercel KV Storage Implementation
// ============================================================================

class KVStore implements RateLimitStore {
  private kv: VercelKVClient;

  constructor(kvClient: VercelKVClient) {
    this.kv = kvClient;
  }

  async get(key: string): Promise<RequestLog | null> {
    try {
      const data = await this.kv.get<RequestLog>(`ratelimit:${key}`);
      return data || null;
    } catch (error) {
      hollyLogger.api.error('KV get failed for rate limit', error, { key });
      return null;
    }
  }

  async set(key: string, value: RequestLog, ttlMs?: number): Promise<void> {
    try {
      // Set TTL to 1 hour by default, or use provided TTL
      const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : 3600;
      await this.kv.set(`ratelimit:${key}`, value, { ex: ttlSeconds });
    } catch (error) {
      hollyLogger.api.error('KV set failed for rate limit', error, { key });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.del(`ratelimit:${key}`);
    } catch (error) {
      hollyLogger.api.error('KV delete failed for rate limit', error, { key });
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.kv.keys(`ratelimit:${pattern}`);
      if (keys.length > 0) {
        // Delete keys one by one since KV doesn't support batch delete
        await Promise.all(keys.map(key => this.kv.del(key)));
      }
    } catch (error) {
      hollyLogger.api.error('KV deleteByPattern failed for rate limit', error, { pattern });
    }
  }

  async getAllStats(): Promise<{ totalKeys: number; totalRequests: number; oldestTimestamp: number | null }> {
    try {
      const keys = await this.kv.keys('ratelimit:*');
      let totalRequests = 0;
      let oldestTimestamp: number | null = null;

      // Note: This is expensive for large-scale use, but acceptable for monitoring
      for (const key of keys.slice(0, 100)) { // Limit to 100 keys for performance
        const data = await this.kv.get<RequestLog>(key);
        if (data?.timestamps?.length) {
          totalRequests += data.timestamps.length;
          const oldest = Math.min(...data.timestamps);
          if (!oldestTimestamp || oldest < oldestTimestamp) {
            oldestTimestamp = oldest;
          }
        }
      }

      return { totalKeys: keys.length, totalRequests, oldestTimestamp };
    } catch (error) {
      hollyLogger.api.error('KV getAllStats failed for rate limit', error);
      return { totalKeys: 0, totalRequests: 0, oldestTimestamp: null };
    }
  }
}

// ============================================================================
// In-Memory Storage Implementation (Fallback)
// ============================================================================

class MemoryStore implements RateLimitStore {
  private store = new Map<string, RequestLog>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
    hollyLogger.api.warn('Rate limiter using in-memory storage. This will NOT work correctly in serverless environments (Vercel, AWS Lambda). Consider setting up Vercel KV for production.');
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(this.store.entries());
      for (const [key, log] of entries) {
        // Remove entries older than 1 hour
        log.timestamps = log.timestamps.filter(t => now - t < 3600000);
        if (log.timestamps.length === 0) {
          this.store.delete(key);
        }
      }
    }, 300000);
  }

  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async get(key: string): Promise<RequestLog | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: RequestLog): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }

  async getAllStats(): Promise<{ totalKeys: number; totalRequests: number; oldestTimestamp: number | null }> {
    let totalRequests = 0;
    let oldestTimestamp: number | null = null;

    const values = Array.from(this.store.values());
    for (const log of values) {
      totalRequests += log.timestamps.length;
      if (log.timestamps.length > 0) {
        const oldest = Math.min(...log.timestamps);
        if (!oldestTimestamp || oldest < oldestTimestamp) {
          oldestTimestamp = oldest;
        }
      }
    }

    return {
      totalKeys: this.store.size,
      totalRequests,
      oldestTimestamp
    };
  }
}

// ============================================================================
// Store Initialization
// ============================================================================

let store: RateLimitStore | null = null;
let storeType: 'kv' | 'memory' = 'memory';

/**
 * Detect and initialize the appropriate store
 */
async function initializeStore(): Promise<RateLimitStore> {
  if (store) return store;

  // Check for Vercel KV environment variables
  const kvRestApiUrl = process.env.KV_REST_API_URL;
  const kvRestApiToken = process.env.KV_REST_API_TOKEN;

  if (kvRestApiUrl && kvRestApiToken) {
    try {
      // Dynamically import @vercel/kv to avoid errors if not installed
      // Using a dynamic import with a catch for missing module
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const kvModule = await importFunction('@vercel/kv') as { kv: VercelKVClient } | null;
      
      if (kvModule && kvModule.kv) {
        const kv = kvModule.kv;
        
        // Test the connection with a simple operation
        await kv.get('__test_connection__');
        
        store = new KVStore(kv);
        storeType = 'kv';
        hollyLogger.api.info('Rate limiter initialized with Vercel KV storage');
        return store;
      }
    } catch (error) {
      // Check if the error is because the module is not installed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isModuleNotFoundError = errorMessage.includes("Cannot find module") || 
                                     errorMessage.includes("Failed to resolve") ||
                                     errorMessage.includes("MODULE_NOT_FOUND");
      
      if (isModuleNotFoundError) {
        hollyLogger.api.warn('@vercel/kv module not installed, falling back to in-memory storage. Install @vercel/kv for production rate limiting.');
      } else {
        hollyLogger.api.warn('Vercel KV detected but connection failed, falling back to in-memory storage', {
          error: errorMessage
        });
      }
    }
  }

  // Fall back to in-memory storage
  store = new MemoryStore();
  storeType = 'memory';
  return store;
}

/**
 * Helper function to dynamically import a module
 * Returns null if the module cannot be found
 */
async function importFunction(moduleName: string): Promise<unknown> {
  try {
    // Using require.resolve to check if module exists first
    // Then dynamic import for the actual loading
    return await new Function('module', 'return import(module)')(moduleName);
  } catch {
    return null;
  }
}

// Initialize store on module load (non-blocking)
initializeStore().catch(error => {
  hollyLogger.api.error('Failed to initialize rate limit store', error);
  // Ensure we have a fallback
  if (!store) {
    store = new MemoryStore();
    storeType = 'memory';
  }
});

/**
 * Get the current store, initializing if needed
 */
async function getStore(): Promise<RateLimitStore> {
  if (!store) {
    return await initializeStore();
  }
  return store;
}

// ============================================================================
// Rate Limiting Functions
// ============================================================================

/**
 * Create a rate limiter with the given configuration
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please slow down.',
    keyGenerator = (req, userId) => `rate:${userId}:${req.nextUrl.pathname}`
  } = config;

  return async (
    req: NextRequest,
    userId: string
  ): Promise<NextResponse | null> => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const key = keyGenerator(req, userId);

    try {
      const currentStore = await getStore();

      // Get or create request log
      let log = await currentStore.get(key);
      if (!log) {
        log = { timestamps: [] };
      }

      // Filter to current window
      log.timestamps = log.timestamps.filter(time => time > windowStart);

      // Check if limit exceeded
      if (log.timestamps.length >= maxRequests) {
        const oldestRequest = log.timestamps[0];
        const retryAfter = Math.ceil((oldestRequest - windowStart) / 1000);

        return NextResponse.json(
          {
            error: message,
            code: 'RATE_LIMITED',
            retryAfter,
            limit: maxRequests,
            remaining: 0,
            reset: new Date(oldestRequest + windowMs).toISOString()
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(maxRequests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil((oldestRequest + windowMs) / 1000))
            }
          }
        );
      }

      // Record this request
      log.timestamps.push(now);
      await currentStore.set(key, log, windowMs * 2); // TTL is 2x the window

      // Return null to indicate request should proceed
      return null;
    } catch (error) {
      // On error, allow the request to proceed (fail-open)
      hollyLogger.api.error('Rate limit check failed, allowing request', error, { key, userId });
      return null;
    }
  };
}

/**
 * Get remaining requests for a user/endpoint
 */
export async function getRemainingRequests(
  req: NextRequest,
  userId: string,
  config: RateLimitConfig
): Promise<{ remaining: number; reset: Date }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `rate:${userId}:${req.nextUrl.pathname}`;

  try {
    const currentStore = await getStore();
    const log = await currentStore.get(key);
    
    if (!log) {
      return {
        remaining: config.maxRequests,
        reset: new Date(now + config.windowMs)
      };
    }

    const currentCount = log.timestamps.filter(t => t > windowStart).length;
    const oldestRequest = log.timestamps.find(t => t > windowStart) || now;

    return {
      remaining: Math.max(0, config.maxRequests - currentCount),
      reset: new Date(oldestRequest + config.windowMs)
    };
  } catch (error) {
    hollyLogger.api.error('Failed to get remaining requests', error, { key, userId });
    return {
      remaining: config.maxRequests,
      reset: new Date(now + config.windowMs)
    };
  }
}

// ============================================================================
// Predefined Rate Limiters
// ============================================================================

/**
 * AI Rate Limiter - 20 requests per minute
 * For /api/chat and other AI endpoints
 */
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 20,
  message: 'Too many AI requests. Please wait a moment before continuing.'
});

/**
 * Strict Rate Limiter - 5 requests per minute
 * For sensitive operations like code generation, deployments
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 5,
  message: 'This action is rate limited. Please wait before trying again.'
});

/**
 * Upload Rate Limiter - 10 uploads per minute
 * For file uploads
 */
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many uploads. Please wait before uploading more files.'
});

/**
 * Music Generation Rate Limiter - 10 per minute
 * For music generation endpoints
 */
export const musicRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many music generation requests. Please wait a moment.'
});

/**
 * Image Generation Rate Limiter - 15 per minute
 * For image generation endpoints
 */
export const imageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'Too many image generation requests. Please wait a moment.'
});

/**
 * GitHub Rate Limiter - 30 per minute
 * For GitHub API operations
 */
export const githubRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many GitHub requests. Please slow down.'
});

/**
 * Default API Rate Limiter - 60 per minute
 * For general API endpoints
 */
export const defaultRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Too many requests. Please slow down.'
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clear rate limit for a specific user (admin function)
 */
export async function clearRateLimit(userId: string, pathname?: string): Promise<void> {
  try {
    const currentStore = await getStore();
    
    if (pathname) {
      await currentStore.delete(`rate:${userId}:${pathname}`);
    } else {
      // Clear all rate limits for this user
      await currentStore.deleteByPattern(`rate:${userId}:`);
    }
  } catch (error) {
    hollyLogger.api.error('Failed to clear rate limit', error, { userId, pathname });
  }
}

/**
 * Get rate limit stats for monitoring
 */
export async function getRateLimitStats(): Promise<{
  totalKeys: number;
  totalRequests: number;
  oldestEntry: Date | null;
  storeType: 'kv' | 'memory';
}> {
  try {
    const currentStore = await getStore();
    const stats = await currentStore.getAllStats();
    
    return {
      totalKeys: stats.totalKeys,
      totalRequests: stats.totalRequests,
      oldestEntry: stats.oldestTimestamp ? new Date(stats.oldestTimestamp) : null,
      storeType
    };
  } catch (error) {
    hollyLogger.api.error('Failed to get rate limit stats', error);
    return {
      totalKeys: 0,
      totalRequests: 0,
      oldestEntry: null,
      storeType
    };
  }
}

/**
 * Get the current store type (for debugging/monitoring)
 */
export function getStoreType(): 'kv' | 'memory' {
  return storeType;
}
