/**
 * HOLLY Rate Limiter — Token Bucket Implementation
 *
 * In-memory rate limiter for API routes. Each unique key (IP, userId, etc.)
 * gets a bucket that refills tokens over time.
 *
 * Usage:
 *   const limiter = new RateLimiter({ maxTokens: 10, refillRate: 2 });
 *   if (!limiter.check(ip)) return Response.json({ error: 'Rate limited' }, { status: 429 });
 */

export interface RateLimiterConfig {
  /** Maximum tokens per bucket */
  maxTokens: number;
  /** Tokens refilled per second */
  refillRate: number;
  /** Max bucket age in ms before cleanup (default: 1 hour) */
  maxAgeMs?: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private buckets: Map<string, Bucket> = new Map();
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly maxAgeMs: number;
  private lastCleanup = Date.now();

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.maxAgeMs = config.maxAgeMs ?? 3600_000; // 1 hour default
  }

  /**
   * Check if a request is allowed for the given key.
   * Returns true if allowed, false if rate limited.
   */
  check(key: string): boolean {
    this.maybeCleanup();
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket) {
      // New bucket — start with maxTokens - 1 (this request consumes one)
      this.buckets.set(key, { tokens: this.maxTokens - 1, lastRefill: now });
      return true;
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    const refilled = elapsed * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + refilled);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens for a key (without consuming one).
   */
  remaining(key: string): number {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket) return this.maxTokens;

    const elapsed = (now - bucket.lastRefill) / 1000;
    const refilled = elapsed * this.refillRate;
    return Math.min(this.maxTokens, Math.floor(bucket.tokens + refilled));
  }

  /**
   * Get time until next token is available (in ms).
   */
  retryAfter(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.tokens >= 1) return 0;

    const deficit = 1 - bucket.tokens;
    return Math.ceil((deficit / this.refillRate) * 1000);
  }

  /**
   * Reset a specific key's bucket.
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Get total number of active buckets (for monitoring).
   */
  get size(): number {
    return this.buckets.size;
  }

  /**
   * Periodically remove stale buckets to prevent memory leaks.
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 60_000) return; // Cleanup at most once per minute
    this.lastCleanup = now;

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > this.maxAgeMs) {
        this.buckets.delete(key);
      }
    }
  }
}

// ── Pre-configured limiters for common use cases ────────────────────────────

/** Chat API: 20 messages per minute per user */
export const chatRateLimiter = new RateLimiter({
  maxTokens: 20,
  refillRate: 20 / 60, // ~0.33 tokens/sec = 20 per minute
});

/** General API: 60 requests per minute per IP */
export const apiRateLimiter = new RateLimiter({
  maxTokens: 60,
  refillRate: 1, // 1 token/sec = 60 per minute
});

/** Auth endpoints: 5 attempts per minute per IP */
export const authRateLimiter = new RateLimiter({
  maxTokens: 5,
  refillRate: 5 / 60, // ~0.08 tokens/sec = 5 per minute
});
