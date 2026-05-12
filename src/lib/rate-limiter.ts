/**
 * Simple in-memory rate limiter.
 * 
 * Uses a sliding-window counter per key (IP or userId).
 * No external deps needed — works in Docker without Redis.
 * 
 * Usage:
 *   const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 30 });
 *   const allowed = limiter.check(userId);
 */

interface RateBucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private buckets = new Map<string, RateBucket>();

  constructor(opts: { windowMs: number; maxRequests: number }) {
    this.windowMs = opts.windowMs;
    this.maxRequests = opts.maxRequests;

    // Prune expired buckets every 5 minutes to prevent memory leaks
    setInterval(() => this.prune(), 5 * 60 * 1000);
  }

  /**
   * Check if a request is allowed.
   * Returns { allowed, remaining, resetAt }
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    // Reset bucket if window expired
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count++;

    const allowed = bucket.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - bucket.count);

    return { allowed, remaining, resetAt: bucket.resetAt };
  }

  private prune() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}

// ── Pre-configured limiters ──────────────────────────────────────────────────

/** Chat API: 30 messages per minute per user */
export const chatLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 30 });

/** General API: 100 requests per minute per IP */
export const apiLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 100 });

/** Auth routes: 10 attempts per minute per IP */
export const authLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 10 });

/**
 * Extract rate-limit key from a Next.js Request.
 * Uses userId (from Clerk header) if available, falls back to IP.
 */
export function getRateLimitKey(request: Request): string {
  // Try to get user ID from Clerk auth header
  const authHeader = request.headers.get('x-clerk-user-id');
  if (authHeader) return `user:${authHeader}`;

  // Fall back to IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

/**
 * Apply rate limiting to a Next.js API route.
 * Returns a Response (429) if rate limited, or null if allowed.
 */
export function applyRateLimit(
  request: Request,
  limiter: RateLimiter = apiLimiter,
): Response | null {
  const key = getRateLimitKey(request);
  const result = limiter.check(key);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
        },
      },
    );
  }

  return null;
}