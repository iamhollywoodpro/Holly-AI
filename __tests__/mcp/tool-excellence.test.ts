import {
  ToolHealthMonitor,
  DEFAULT_HEALTH_CONFIG,
  ToolHealthRecord,
  HealthSummary,
} from '@/lib/mcp/tool-health-monitor';
import {
  validateTokenFormat,
  getTokenStatus,
  calculateBackoffDelay,
  isRetryableError,
  isRateLimitError,
  ResponseCache,
  buildGracefulResponse,
  canAttemptGithubOperation,
  DEFAULT_RETRY_CONFIG,
} from '@/lib/github/github-resilience';

// ─── Tool Health Monitor ────────────────────────────────────────────────────

describe('Tool Health Monitor', () => {
  describe('Configuration', () => {
    it('should use default configuration', () => {
      const monitor = new ToolHealthMonitor();
      expect(DEFAULT_HEALTH_CONFIG.alertThreshold).toBe(0.9);
      expect(DEFAULT_HEALTH_CONFIG.disableThreshold).toBe(0.5);
      expect(DEFAULT_HEALTH_CONFIG.minimumCalls).toBe(5);
      expect(DEFAULT_HEALTH_CONFIG.maxConsecutiveFailures).toBe(3);
    });

    it('should accept custom configuration', () => {
      const monitor = new ToolHealthMonitor({
        alertThreshold: 0.8,
        maxConsecutiveFailures: 5,
      });
      // Monitor should work with custom config
      monitor.recordSuccess('test');
      expect(monitor.isToolEnabled('test')).toBe(true);
    });
  });

  describe('Success/Failure Recording', () => {
    it('should record successful calls', () => {
      const monitor = new ToolHealthMonitor();
      monitor.recordSuccess('github_read');
      monitor.recordSuccess('github_read');

      const health = monitor.getToolHealth('github_read');
      expect(health.totalCalls).toBe(2);
      expect(health.successCalls).toBe(2);
      expect(health.failureCalls).toBe(0);
      expect(health.isEnabled).toBe(true);
    });

    it('should record failed calls', () => {
      const monitor = new ToolHealthMonitor();
      monitor.recordFailure('github_read', 'Network timeout');

      const health = monitor.getToolHealth('github_read');
      expect(health.totalCalls).toBe(1);
      expect(health.failureCalls).toBe(1);
      expect(health.lastError).toBe('Network timeout');
    });

    it('should track mixed success/failure calls', () => {
      const monitor = new ToolHealthMonitor();
      monitor.recordSuccess('tool_a');
      monitor.recordSuccess('tool_a');
      monitor.recordFailure('tool_a', 'Error');
      monitor.recordSuccess('tool_a');

      const health = monitor.getToolHealth('tool_a');
      expect(health.totalCalls).toBe(4);
      expect(health.successCalls).toBe(3);
      expect(health.failureCalls).toBe(1);
    });

    it('should track last success and failure timestamps', () => {
      const monitor = new ToolHealthMonitor();
      const before = Date.now();
      monitor.recordSuccess('tool');
      monitor.recordFailure('tool', 'err');
      const after = Date.now();

      const health = monitor.getToolHealth('tool');
      expect(health.lastSuccessAt).toBeGreaterThanOrEqual(before);
      expect(health.lastSuccessAt).toBeLessThanOrEqual(after);
      expect(health.lastFailureAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Success Rate Calculation', () => {
    it('should return 1 for tools with no data', () => {
      const monitor = new ToolHealthMonitor();
      expect(monitor.getSuccessRate('unknown_tool')).toBe(1);
    });

    it('should calculate correct success rate', () => {
      const monitor = new ToolHealthMonitor();
      // 3 successes, 1 failure = 0.75
      monitor.recordSuccess('tool');
      monitor.recordSuccess('tool');
      monitor.recordSuccess('tool');
      monitor.recordFailure('tool', 'err');

      expect(monitor.getSuccessRate('tool')).toBe(0.75);
    });

    it('should return 1 for 100% success rate', () => {
      const monitor = new ToolHealthMonitor();
      monitor.recordSuccess('tool');
      monitor.recordSuccess('tool');

      expect(monitor.getSuccessRate('tool')).toBe(1);
    });

    it('should return 0 for 0% success rate', () => {
      const monitor = new ToolHealthMonitor();
      monitor.recordFailure('tool', 'err1');
      monitor.recordFailure('tool', 'err2');

      expect(monitor.getSuccessRate('tool')).toBe(0);
    });
  });

  describe('Auto-Disable on Consecutive Failures', () => {
    it('should auto-disable after max consecutive failures', () => {
      const monitor = new ToolHealthMonitor({ maxConsecutiveFailures: 3 });
      monitor.recordFailure('tool', 'err1');
      monitor.recordFailure('tool', 'err2');
      monitor.recordFailure('tool', 'err3');

      expect(monitor.isToolEnabled('tool')).toBe(false);
      const health = monitor.getToolHealth('tool');
      expect(health.disabledReason).toContain('Consecutive failures: 3');
    });

    it('should NOT disable before reaching threshold', () => {
      const monitor = new ToolHealthMonitor({ maxConsecutiveFailures: 3 });
      monitor.recordFailure('tool', 'err1');
      monitor.recordFailure('tool', 'err2');

      expect(monitor.isToolEnabled('tool')).toBe(true);
    });

    it('should reset consecutive failures on success', () => {
      const monitor = new ToolHealthMonitor({ maxConsecutiveFailures: 3 });
      monitor.recordFailure('tool', 'err1');
      monitor.recordFailure('tool', 'err2');
      monitor.recordSuccess('tool'); // resets counter
      monitor.recordFailure('tool', 'err3');

      expect(monitor.isToolEnabled('tool')).toBe(true); // only 1 consecutive
    });
  });

  describe('Manual Enable/Disable', () => {
    it('should manually disable a tool', () => {
      const monitor = new ToolHealthMonitor();
      monitor.disableTool('tool', 'Maintenance mode');

      expect(monitor.isToolEnabled('tool')).toBe(false);
      const health = monitor.getToolHealth('tool');
      expect(health.disabledReason).toBe('Maintenance mode');
    });

    it('should re-enable a disabled tool', () => {
      const monitor = new ToolHealthMonitor();
      monitor.recordFailure('tool', 'err1');
      monitor.recordFailure('tool', 'err2');
      monitor.recordFailure('tool', 'err3');
      expect(monitor.isToolEnabled('tool')).toBe(false);

      monitor.enableTool('tool');
      expect(monitor.isToolEnabled('tool')).toBe(true);
    });

    it('should reset consecutive failures on re-enable', () => {
      const monitor = new ToolHealthMonitor({ maxConsecutiveFailures: 3 });
      monitor.recordFailure('tool', 'err1');
      monitor.recordFailure('tool', 'err2');
      monitor.recordFailure('tool', 'err3');
      monitor.enableTool('tool');

      // Now 2 more failures should NOT disable (consecutive was reset)
      monitor.recordFailure('tool', 'err4');
      monitor.recordFailure('tool', 'err5');
      expect(monitor.isToolEnabled('tool')).toBe(true);
    });
  });

  describe('Health Summary', () => {
    it('should generate a complete health summary', () => {
      const monitor = new ToolHealthMonitor({ minimumCalls: 2 });
      // Healthy tool
      monitor.recordSuccess('tool_a');
      monitor.recordSuccess('tool_a');
      // Degraded tool (below 90% with min 2 calls)
      monitor.recordSuccess('tool_b');
      monitor.recordFailure('tool_b', 'err');
      // Disabled tool
      monitor.disableTool('tool_c', 'Manual disable');

      const summary = monitor.getHealthSummary();
      expect(summary.totalTools).toBe(3);
      expect(summary.healthyTools).toBeGreaterThanOrEqual(1);
      expect(summary.disabledTools).toBe(1);
    });

    it('should sort tools alphabetically', () => {
      const monitor = new ToolHealthMonitor();
      monitor.recordSuccess('zebra');
      monitor.recordSuccess('alpha');
      monitor.recordSuccess('mid');

      const summary = monitor.getHealthSummary();
      expect(summary.tools[0].toolName).toBe('alpha');
      expect(summary.tools[1].toolName).toBe('mid');
      expect(summary.tools[2].toolName).toBe('zebra');
    });

    it('should handle empty monitor', () => {
      const monitor = new ToolHealthMonitor();
      const summary = monitor.getHealthSummary();
      expect(summary.totalTools).toBe(0);
      expect(summary.healthyTools).toBe(0);
    });
  });

  describe('Alerts', () => {
    it('should return degraded tools as alerts', () => {
      const monitor = new ToolHealthMonitor({ minimumCalls: 2, alertThreshold: 0.9 });
      // 1 success, 1 failure = 50% < 90% → degraded
      monitor.recordSuccess('degraded_tool');
      monitor.recordFailure('degraded_tool', 'err');

      // Healthy tool
      monitor.recordSuccess('healthy_tool');
      monitor.recordSuccess('healthy_tool');

      const alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].toolName).toBe('degraded_tool');
      expect(alerts[0].status).toBe('degraded');
    });

    it('should not alert on healthy tools', () => {
      const monitor = new ToolHealthMonitor({ minimumCalls: 2 });
      monitor.recordSuccess('tool');
      monitor.recordSuccess('tool');

      const alerts = monitor.getAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('should remove old records during cleanup', () => {
      const monitor = new ToolHealthMonitor({ windowMs: 100 }); // 100ms window
      monitor.recordSuccess('tool');

      // Wait for records to expire
      const wait = new Promise(resolve => setTimeout(resolve, 150));
      return wait.then(() => {
        monitor.cleanup();
        const health = monitor.getToolHealth('tool');
        expect(health.totalCalls).toBe(0);
      });
    });
  });
});

// ─── GitHub Token Resilience ────────────────────────────────────────────────

describe('GitHub Token Resilience', () => {
  describe('Token Validation', () => {
    it('should validate classic PAT format', () => {
      expect(validateTokenFormat('ghp_' + 'a'.repeat(36))).toBe(true);
    });

    it('should validate fine-grained PAT format', () => {
      expect(validateTokenFormat('github_pat_' + 'a'.repeat(82))).toBe(true);
    });

    it('should validate GitHub App token format', () => {
      expect(validateTokenFormat('ghs_' + 'a'.repeat(36))).toBe(true);
    });

    it('should validate user-to-server token format', () => {
      expect(validateTokenFormat('ghu_' + 'a'.repeat(36))).toBe(true);
    });

    it('should validate installation token format', () => {
      expect(validateTokenFormat('gho_' + 'a'.repeat(36))).toBe(true);
    });

    it('should validate refresh token format', () => {
      expect(validateTokenFormat('ghr_' + 'a'.repeat(36))).toBe(true);
    });

    it('should reject invalid token formats', () => {
      expect(validateTokenFormat('')).toBe(false);
      expect(validateTokenFormat('invalid_token')).toBe(false);
      expect(validateTokenFormat('ghp_short')).toBe(false);
      expect(validateTokenFormat('ghp_' + 'a'.repeat(35))).toBe(false); // too short
    });

    it('should reject non-string inputs', () => {
      expect(validateTokenFormat(null as any)).toBe(false);
      expect(validateTokenFormat(undefined as any)).toBe(false);
    });
  });

  describe('Token Status', () => {
    it('should return status for missing token', () => {
      const status = getTokenStatus(undefined);
      expect(status.isPresent).toBe(false);
      expect(status.isValidFormat).toBe(false);
    });

    it('should return status for valid token', () => {
      const status = getTokenStatus('ghp_' + 'a'.repeat(36));
      expect(status.isPresent).toBe(true);
      expect(status.isValidFormat).toBe(true);
      expect(status.lastValidatedAt).toBeGreaterThan(0);
    });

    it('should return status for invalid token', () => {
      const status = getTokenStatus('bad_token');
      expect(status.isPresent).toBe(true);
      expect(status.isValidFormat).toBe(false);
    });
  });

  describe('Exponential Backoff', () => {
    it('should increase delay with each attempt', () => {
      const delay0 = calculateBackoffDelay(0, { jitter: 0 });
      const delay1 = calculateBackoffDelay(1, { jitter: 0 });
      const delay2 = calculateBackoffDelay(2, { jitter: 0 });

      expect(delay1).toBeGreaterThan(delay0);
      expect(delay2).toBeGreaterThan(delay1);
    });

    it('should respect max delay', () => {
      const delay = calculateBackoffDelay(100, { maxDelayMs: 5000, jitter: 0, baseDelayMs: 1000 });
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('should use default config when none provided', () => {
      const delay = calculateBackoffDelay(1);
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs);
    });

    it('should apply jitter', () => {
      // Run multiple times to verify jitter variation
      const delays = new Set<number>();
      for (let i = 0; i < 10; i++) {
        delays.add(calculateBackoffDelay(1, { baseDelayMs: 1000, jitter: 0.5 }));
      }
      // With jitter, we should get at least some variation
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  describe('Retryable Error Detection', () => {
    it('should detect retryable errors', () => {
      expect(isRetryableError('Rate limit exceeded')).toBe(true);
      expect(isRetryableError('Request timeout')).toBe(true);
      expect(isRetryableError('Network error')).toBe(true);
      expect(isRetryableError('ECONNRESET')).toBe(true);
      expect(isRetryableError('ECONNREFUSED')).toBe(true);
      expect(isRetryableError('ETIMEDOUT')).toBe(true);
      expect(isRetryableError('Server error 503')).toBe(true);
      expect(isRetryableError('Bad gateway 502')).toBe(true);
      expect(isRetryableError('HTTP 500 Internal Server Error')).toBe(true);
      expect(isRetryableError('HTTP 429 Too Many Requests')).toBe(true);
      expect(isRetryableError('Abuse detection triggered')).toBe(true);
      expect(isRetryableError('Secondary rate limit')).toBe(true);
    });

    it('should not retry non-retryable errors', () => {
      expect(isRetryableError('Not Found')).toBe(false);
      expect(isRetryableError('Unauthorized')).toBe(false);
      expect(isRetryableError('Validation failed')).toBe(false);
      expect(isRetryableError('Bad request 400')).toBe(false);
    });
  });

  describe('Rate Limit Detection', () => {
    it('should detect rate limit errors', () => {
      expect(isRateLimitError('Rate limit exceeded')).toBe(true);
      expect(isRateLimitError('HTTP 429 Too Many Requests')).toBe(true);
      expect(isRateLimitError('Abuse detection triggered')).toBe(true);
      expect(isRateLimitError('Secondary rate limit hit')).toBe(true);
    });

    it('should not detect non-rate-limit errors', () => {
      expect(isRateLimitError('Not Found')).toBe(false);
      expect(isRateLimitError('Timeout')).toBe(false);
      expect(isRateLimitError('Network error')).toBe(false);
    });
  });

  describe('Response Cache', () => {
    it('should store and retrieve values', () => {
      const cache = new ResponseCache();
      cache.set('key1', { data: 'test' });
      expect(cache.get('key1')).toEqual({ data: 'test' });
    });

    it('should return null for missing keys', () => {
      const cache = new ResponseCache();
      expect(cache.get('missing')).toBeNull();
    });

    it('should expire entries after TTL', () => {
      const cache = new ResponseCache(50); // 50ms TTL
      cache.set('key1', 'value');

      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(cache.get('key1')).toBeNull();
          resolve();
        }, 100);
      });
    });

    it('should support custom TTL per entry', () => {
      const cache = new ResponseCache(5000); // 5s default
      cache.set('short', 'value', 50); // 50ms custom TTL

      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(cache.get('short')).toBeNull();
          resolve();
        }, 100);
      });
    });

    it('should check existence with has()', () => {
      const cache = new ResponseCache();
      cache.set('key1', 'value');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });

    it('should delete entries', () => {
      const cache = new ResponseCache();
      cache.set('key1', 'value');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should report size', () => {
      const cache = new ResponseCache();
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });

    it('should clear all entries', () => {
      const cache = new ResponseCache();
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
    });

    it('should cleanup expired entries', () => {
      const cache = new ResponseCache(50);
      cache.set('expired', 'value');
      cache.set('fresh', 'value', 60000); // 1 minute TTL

      return new Promise<void>(resolve => {
        setTimeout(() => {
          const removed = cache.cleanup();
          expect(removed).toBe(1);
          expect(cache.has('fresh')).toBe(true);
          expect(cache.has('expired')).toBe(false);
          resolve();
        }, 100);
      });
    });
  });

  describe('Graceful Degradation', () => {
    it('should build response for missing token', () => {
      const resp = buildGracefulResponse('read file', 'no_token');
      expect(resp.ok).toBe(false);
      expect(resp.error).toContain('read file');
      expect(resp.suggestion).toContain('GITHUB_TOKEN');
    });

    it('should build response for invalid token', () => {
      const resp = buildGracefulResponse('create issue', 'invalid_token');
      expect(resp.ok).toBe(false);
      expect(resp.suggestion).toContain('github.com/settings/tokens');
    });

    it('should build response for rate limit', () => {
      const resp = buildGracefulResponse('list repos', 'rate_limit');
      expect(resp.ok).toBe(false);
      expect(resp.suggestion).toContain('rate limit');
    });

    it('should build response for network error', () => {
      const resp = buildGracefulResponse('push', 'network');
      expect(resp.ok).toBe(false);
      expect(resp.suggestion).toContain('network');
    });

    it('should build default response for unknown reason', () => {
      const resp = buildGracefulResponse('operation', 'unknown_error');
      expect(resp.ok).toBe(false);
      expect(resp.suggestion).toContain('Try again later');
    });
  });

  describe('Operation Attempt Check', () => {
    it('should reject missing token', () => {
      const result = canAttemptGithubOperation(undefined);
      expect(result.canAttempt).toBe(false);
      expect(result.reason).toBe('no_token');
    });

    it('should reject invalid token format', () => {
      const result = canAttemptGithubOperation('bad_token');
      expect(result.canAttempt).toBe(false);
      expect(result.reason).toBe('invalid_token');
    });

    it('should accept valid token', () => {
      const result = canAttemptGithubOperation('ghp_' + 'a'.repeat(36));
      expect(result.canAttempt).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});
