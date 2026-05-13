/**
 * GitHub Token Resilience — Graceful degradation, caching, and retry logic for GitHub API
 *
 * Features:
 * - Token validation and health checking
 * - Response caching with TTL
 * - Retry with exponential backoff
 * - Rate limit awareness
 * - Graceful degradation when token is missing
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RetryConfig {
  /** Maximum number of retry attempts. Default: 3 */
  maxRetries: number;
  /** Base delay in ms for exponential backoff. Default: 1000 */
  baseDelayMs: number;
  /** Maximum delay in ms. Default: 30000 */
  maxDelayMs: number;
  /** Jitter factor (0-1). Default: 0.1 */
  jitter: number;
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

export interface TokenStatus {
  isPresent: boolean;
  isValidFormat: boolean;
  rateLimitRemaining: number | null;
  rateLimitReset: number | null;
  lastValidatedAt: number | null;
}

export interface ResilienceResult<T> {
  data: T | null;
  fromCache: boolean;
  attempts: number;
  error: string | null;
  rateLimitHit: boolean;
}

// ─── Default Configuration ──────────────────────────────────────────────────

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: 0.1,
};

const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ─── Token Validation ───────────────────────────────────────────────────────

/**
 * Validate GitHub token format.
 * Accepts:
 * - Classic PAT: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40 chars)
 * - Fine-grained PAT: github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * - GitHub App token: ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * - User-to-server token: ghu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * - Installation token: gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * - Refresh token: ghr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  const patterns = [
    /^ghp_[a-zA-Z0-9]{36}$/,           // Classic PAT
    /^github_pat_[a-zA-Z0-9_]{82}$/,    // Fine-grained PAT
    /^ghs_[a-zA-Z0-9]{36}$/,           // GitHub App token
    /^ghu_[a-zA-Z0-9]{36}$/,           // User-to-server
    /^gho_[a-zA-Z0-9]{36}$/,           // Installation token
    /^ghr_[a-zA-Z0-9]{36}$/,           // Refresh token
  ];

  return patterns.some(pattern => pattern.test(token));
}

/**
 * Check token status.
 */
export function getTokenStatus(token: string | undefined): TokenStatus {
  return {
    isPresent: !!token,
    isValidFormat: token ? validateTokenFormat(token) : false,
    rateLimitRemaining: null,
    rateLimitReset: null,
    lastValidatedAt: token ? Date.now() : null,
  };
}

// ─── Exponential Backoff ────────────────────────────────────────────────────

/**
 * Calculate delay for exponential backoff with jitter.
 */
export function calculateBackoffDelay(
  attempt: number,
  config: Partial<RetryConfig> = {},
): number {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const exponentialDelay = fullConfig.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, fullConfig.maxDelayMs);
  const jitterRange = cappedDelay * fullConfig.jitter;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Determine if an error is retryable.
 */
export function isRetryableError(error: string): boolean {
  const retryablePatterns = [
    /rate limit/i,
    /timeout/i,
    /network/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /503/i,
    /502/i,
    /500/i,
    /429/i,
    /abuse detection/i,
    /secondary rate limit/i,
  ];

  return retryablePatterns.some(pattern => pattern.test(error));
}

/**
 * Determine if the error is a rate limit error.
 */
export function isRateLimitError(error: string): boolean {
  return /rate limit/i.test(error) || /429/.test(error) || /abuse detection/i.test(error);
}

// ─── Response Cache ─────────────────────────────────────────────────────────

export class ResponseCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = DEFAULT_CACHE_TTL) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Get a cached response if it exists and hasn't expired.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Store a response in the cache.
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
    });
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove a specific key from the cache.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all expired entries.
   */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.cachedAt > entry.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of entries in the cache (including potentially expired).
   */
  get size(): number {
    return this.cache.size;
  }
}

// ─── Graceful Degradation ───────────────────────────────────────────────────

/**
 * Build a graceful error response when GitHub API is unavailable.
 */
export function buildGracefulResponse(operation: string, reason: string): {
  ok: false;
  error: string;
  suggestion: string;
} {
  const suggestions: Record<string, string> = {
    'no_token': 'Set the GITHUB_TOKEN environment variable with a valid GitHub Personal Access Token.',
    'invalid_token': 'The GITHUB_TOKEN format is invalid. Generate a new token at https://github.com/settings/tokens.',
    'rate_limit': 'GitHub API rate limit exceeded. Wait a few minutes or use a token with higher rate limits.',
    'network': 'Unable to reach GitHub API. Check your network connection.',
    'default': 'Try again later or check your GitHub configuration.',
  };

  return {
    ok: false,
    error: `GitHub ${operation} failed: ${reason}`,
    suggestion: suggestions[reason] || suggestions['default'],
  };
}

/**
 * Check if a GitHub operation can be attempted.
 */
export function canAttemptGithubOperation(token: string | undefined): {
  canAttempt: boolean;
  reason?: string;
} {
  if (!token) {
    return { canAttempt: false, reason: 'no_token' };
  }

  if (!validateTokenFormat(token)) {
    return { canAttempt: false, reason: 'invalid_token' };
  }

  return { canAttempt: true };
}
