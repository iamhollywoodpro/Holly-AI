/**
 * Rate Limiter for Work Log Creation
 * 
 * Prevents log spam by:
 * - Limiting logs per user per minute
 * - Debouncing rapid identical logs
 * - Batching multiple logs
 * 
 * @author HOLLY AI System
 */

interface RateLimitConfig {
  maxLogsPerMinute: number;
  debounceDuration: number; // milliseconds
}

interface UserLogState {
  count: number;
  resetTime: number;
  lastLog: {
    title: string;
    timestamp: number;
  } | null;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxLogsPerMinute: 60, // Max 60 logs per user per minute
  debounceDuration: 1000, // 1 second debounce for identical logs
};

// In-memory store (could be Redis in production)
const userStates = new Map<string, UserLogState>();

/**
 * Check if user can create a log
 */
export function canCreateLog(
  userId: string,
  title: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; reason?: string } {
  const { maxLogsPerMinute, debounceDuration } = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  // Get or create user state
  let state = userStates.get(userId);
  if (!state || now > state.resetTime) {
    state = {
      count: 0,
      resetTime: now + 60000, // Reset in 1 minute
      lastLog: null,
    };
    userStates.set(userId, state);
  }

  // Check rate limit
  if (state.count >= maxLogsPerMinute) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${maxLogsPerMinute} logs per minute`,
    };
  }

  // Check for duplicate log (debounce)
  if (state.lastLog && state.lastLog.title === title) {
    const timeSinceLastLog = now - state.lastLog.timestamp;
    if (timeSinceLastLog < debounceDuration) {
      return {
        allowed: false,
        reason: `Duplicate log within ${debounceDuration}ms (debounced)`,
      };
    }
  }

  // Update state
  state.count++;
  state.lastLog = { title, timestamp: now };
  userStates.set(userId, state);

  return { allowed: true };
}

/**
 * Reset rate limit for a user (for testing)
 */
export function resetRateLimit(userId: string): void {
  userStates.delete(userId);
}

/**
 * Get current rate limit status for a user
 */
export function getRateLimitStatus(userId: string): {
  logsCreated: number;
  maxLogsPerMinute: number;
  resetsIn: number; // milliseconds
} {
  const state = userStates.get(userId);
  const now = Date.now();

  if (!state || now > state.resetTime) {
    return {
      logsCreated: 0,
      maxLogsPerMinute: DEFAULT_CONFIG.maxLogsPerMinute,
      resetsIn: 60000,
    };
  }

  return {
    logsCreated: state.count,
    maxLogsPerMinute: DEFAULT_CONFIG.maxLogsPerMinute,
    resetsIn: state.resetTime - now,
  };
}

/**
 * Cleanup old entries (run periodically)
 */
export function cleanupRateLimiter(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  
  userStates.forEach((state, userId) => {
    if (now > state.resetTime) {
      toDelete.push(userId);
    }
  });
  
  toDelete.forEach(userId => userStates.delete(userId));
}

// Auto-cleanup every 5 minutes
setInterval(cleanupRateLimiter, 300000);
