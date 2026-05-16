// ─────────────────────────────────────────────────────────────────────────────
// Per-Endpoint Rate Limiting — Phase 7.3 Security Hardening
// 
// Configurable rate limits per API route category:
//   - chat:       20 req/min (conversational AI)
//   - generation:  6 req/min (image/video/music generation — GPU-heavy)
//   - code:        8 req/min (code generation/review)
//   - auth:        5 req/min (login/register)
//   - admin:      30 req/min (admin dashboard)
//   - general:    60 req/min (everything else)
// ─────────────────────────────────────────────────────────────────────────────

import { RateLimiter } from './rate-limiter';

// ─── Endpoint Category Configuration ──────────────────────────────────────────

interface EndpointLimit {
  limiter: RateLimiter;
  description: string;
}

const ENDPOINT_LIMITS: Record<string, EndpointLimit> = {
  // Chat & conversation endpoints
  chat: {
    limiter: new RateLimiter({ maxTokens: 20, refillRate: 20 / 60 }),
    description: 'Chat API — 20 requests/minute per user',
  },
  // Heavy generation endpoints (GPU/external API calls)
  generation: {
    limiter: new RateLimiter({ maxTokens: 6, refillRate: 6 / 60 }),
    description: 'Generation API — 6 requests/minute per user',
  },
  // Code generation & review
  code: {
    limiter: new RateLimiter({ maxTokens: 8, refillRate: 8 / 60 }),
    description: 'Code API — 8 requests/minute per user',
  },
  // Authentication endpoints
  auth: {
    limiter: new RateLimiter({ maxTokens: 5, refillRate: 5 / 60 }),
    description: 'Auth API — 5 requests/minute per IP',
  },
  // Admin/dashboard endpoints
  admin: {
    limiter: new RateLimiter({ maxTokens: 30, refillRate: 30 / 60 }),
    description: 'Admin API — 30 requests/minute per user',
  },
  // Builder endpoints
  builder: {
    limiter: new RateLimiter({ maxTokens: 10, refillRate: 10 / 60 }),
    description: 'Builder API — 10 requests/minute per user',
  },
  // Self-modification endpoints (most restrictive)
  selfcode: {
    limiter: new RateLimiter({ maxTokens: 3, refillRate: 3 / 60 }),
    description: 'Self-Code API — 3 requests/minute per user',
  },
  // General fallback
  general: {
    limiter: new RateLimiter({ maxTokens: 60, refillRate: 1 }),
    description: 'General API — 60 requests/minute per IP',
  },
};

// ─── Route → Category Mapping ─────────────────────────────────────────────────

const ROUTE_CATEGORIES: Array<{ pattern: RegExp; category: string }> = [
  // Chat
  { pattern: /^\/api\/chat/, category: 'chat' },
  { pattern: /^\/api\/conversations/, category: 'chat' },
  { pattern: /^\/api\/voice/, category: 'chat' },
  { pattern: /^\/api\/multimodal/, category: 'chat' },

  // Generation (GPU-heavy)
  { pattern: /^\/api\/image\/generate/, category: 'generation' },
  { pattern: /^\/api\/video\/generate/, category: 'generation' },
  { pattern: /^\/api\/music\/generate/, category: 'generation' },
  { pattern: /^\/api\/music\/hybrid-studio/, category: 'generation' },
  { pattern: /^\/api\/media/, category: 'generation' },
  { pattern: /^\/api\/audio/, category: 'generation' },
  { pattern: /^\/api\/creative/, category: 'generation' },
  { pattern: /^\/api\/ar\//, category: 'generation' },

  // Code
  { pattern: /^\/api\/code/, category: 'code' },
  { pattern: /^\/api\/code-generation/, category: 'code' },
  { pattern: /^\/api\/codebase/, category: 'code' },

  // Auth
  { pattern: /^\/api\/auth/, category: 'auth' },

  // Admin
  { pattern: /^\/api\/admin/, category: 'admin' },
  { pattern: /^\/api\/monitoring/, category: 'admin' },
  { pattern: /^\/api\/analytics/, category: 'admin' },
  { pattern: /^\/api\/security/, category: 'admin' },
  { pattern: /^\/api\/audit/, category: 'admin' },

  // Builder
  { pattern: /^\/api\/builder/, category: 'builder' },

  // Self-code (most restrictive)
  { pattern: /^\/api\/self-code/, category: 'selfcode' },
  { pattern: /^\/api\/self-improvement/, category: 'selfcode' },
  { pattern: /^\/api\/autonomy/, category: 'selfcode' },
  { pattern: /^\/api\/autonomous/, category: 'selfcode' },
  { pattern: /^\/api\/self-healing/, category: 'selfcode' },
  { pattern: /^\/api\/evolution/, category: 'selfcode' },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  category: string;
  remaining: number;
  retryAfterMs: number;
  limit: string;
}

/**
 * Check rate limit for a given request path and identity key.
 * 
 * @param pathname - The API route path (e.g., /api/chat)
 * @param identityKey - User ID or IP address for bucket isolation
 * @returns Rate limit result with allowed/denied status and metadata
 */
export function checkEndpointRateLimit(
  pathname: string,
  identityKey: string,
): RateLimitResult {
  const category = categorizeRoute(pathname);
  const endpoint = ENDPOINT_LIMITS[category];
  const limiterKey = `${category}:${identityKey}`;

  const allowed = endpoint.limiter.check(limiterKey);
  const remaining = endpoint.limiter.remaining(limiterKey);
  const retryAfterMs = endpoint.limiter.retryAfter(limiterKey);

  return {
    allowed,
    category,
    remaining,
    retryAfterMs,
    limit: endpoint.description,
  };
}

/**
 * Get rate limit headers for a response.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Category': result.category,
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Limit': result.limit,
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(Math.ceil(result.retryAfterMs / 1000));
  }

  return headers;
}

/**
 * Categorize a route path into a rate limit category.
 */
function categorizeRoute(pathname: string): string {
  for (const { pattern, category } of ROUTE_CATEGORIES) {
    if (pattern.test(pathname)) return category;
  }
  return 'general';
}

/**
 * Get all endpoint categories and their current bucket counts (for monitoring).
 */
export function getEndpointRateLimitStats(): Record<string, { description: string; activeBuckets: number }> {
  const stats: Record<string, { description: string; activeBuckets: number }> = {};
  for (const [category, endpoint] of Object.entries(ENDPOINT_LIMITS)) {
    stats[category] = {
      description: endpoint.description,
      activeBuckets: endpoint.limiter.size,
    };
  }
  return stats;
}
