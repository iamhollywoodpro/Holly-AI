/**
 * GitHub Resilience + Commit Message Generator + PR Template Generator — Tests
 *
 * Tests pure-logic GitHub utilities (no API calls, no mocking needed).
 * Covers: token validation, backoff, caching, commit messages, PR templates.
 */

import {
  validateTokenFormat,
  getTokenStatus,
  calculateBackoffDelay,
  isRetryableError,
  isRateLimitError,
  buildGracefulResponse,
  canAttemptGithubOperation,
  ResponseCache,
} from '@/lib/github/github-resilience';

import {
  generateCommitMessage,
  getCommitTypeEmoji,
  getCommitTypeDescription,
  validateCommitMessage,
} from '@/lib/github/commit-message-generator';

import {
  generatePRTemplate,
  generateQuickTemplate,
} from '@/lib/github/pr-template-generator';

// ─── GitHub Resilience ─────────────────────────────────────────────────────

describe('GitHub Resilience', () => {
  describe('validateTokenFormat', () => {
    it('should accept classic PAT format', () => {
      expect(validateTokenFormat('ghp_' + 'a'.repeat(36))).toBe(true);
    });

    it('should accept fine-grained PAT format', () => {
      expect(validateTokenFormat('github_pat_' + 'a'.repeat(82))).toBe(true);
    });

    it('should accept GitHub App token format', () => {
      expect(validateTokenFormat('ghs_' + 'a'.repeat(36))).toBe(true);
    });

    it('should accept user-to-server token', () => {
      expect(validateTokenFormat('ghu_' + 'a'.repeat(36))).toBe(true);
    });

    it('should accept installation token', () => {
      expect(validateTokenFormat('gho_' + 'a'.repeat(36))).toBe(true);
    });

    it('should accept refresh token', () => {
      expect(validateTokenFormat('ghr_' + 'a'.repeat(36))).toBe(true);
    });

    it('should reject empty string', () => {
      expect(validateTokenFormat('')).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validateTokenFormat(undefined as any)).toBe(false);
    });

    it('should reject random string', () => {
      expect(validateTokenFormat('random_token_123')).toBe(false);
    });

    it('should reject token that is too short', () => {
      expect(validateTokenFormat('ghp_abc')).toBe(false);
    });
  });

  describe('getTokenStatus', () => {
    it('should return present and valid for good token', () => {
      const status = getTokenStatus('ghp_' + 'a'.repeat(36));
      expect(status.isPresent).toBe(true);
      expect(status.isValidFormat).toBe(true);
      expect(status.lastValidatedAt).toBeGreaterThan(0);
    });

    it('should return not present for undefined', () => {
      const status = getTokenStatus(undefined);
      expect(status.isPresent).toBe(false);
      expect(status.isValidFormat).toBe(false);
      expect(status.lastValidatedAt).toBeNull();
    });

    it('should return invalid format for bad token', () => {
      const status = getTokenStatus('bad_token');
      expect(status.isPresent).toBe(true);
      expect(status.isValidFormat).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should increase delay exponentially', () => {
      const d0 = calculateBackoffDelay(0, { jitter: 0 });
      const d1 = calculateBackoffDelay(1, { jitter: 0 });
      const d2 = calculateBackoffDelay(2, { jitter: 0 });

      expect(d1).toBeGreaterThan(d0);
      expect(d2).toBeGreaterThan(d1);
    });

    it('should respect maxDelayMs cap', () => {
      const delay = calculateBackoffDelay(100, { maxDelayMs: 5000, baseDelayMs: 1000, jitter: 0 });
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('should add jitter', () => {
      // Without jitter, attempt 0 = 1000ms exactly. With jitter, it varies.
      const delays = new Set<number>();
      for (let i = 0; i < 20; i++) {
        delays.add(calculateBackoffDelay(0, { baseDelayMs: 1000, maxDelayMs: 30000, jitter: 0.1 }));
      }
      // With jitter, we should get different values
      expect(delays.size).toBeGreaterThan(1);
    });

    it('should never return negative', () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const delay = calculateBackoffDelay(attempt);
        expect(delay).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('isRetryableError', () => {
    it('should detect rate limit errors', () => {
      expect(isRetryableError('rate limit exceeded')).toBe(true);
    });

    it('should detect timeout errors', () => {
      expect(isRetryableError('Request timeout')).toBe(true);
    });

    it('should detect network errors', () => {
      expect(isRetryableError('network error')).toBe(true);
    });

    it('should detect ECONNRESET', () => {
      expect(isRetryableError('ECONNRESET')).toBe(true);
    });

    it('should detect 500 errors', () => {
      expect(isRetryableError('500 Internal Server Error')).toBe(true);
    });

    it('should detect 429 errors', () => {
      expect(isRetryableError('429 Too Many Requests')).toBe(true);
    });

    it('should detect abuse detection', () => {
      expect(isRetryableError('abuse detection mechanism triggered')).toBe(true);
    });

    it('should reject non-retryable errors', () => {
      expect(isRetryableError('404 Not Found')).toBe(false);
    });

    it('should reject 401 errors', () => {
      expect(isRetryableError('401 Unauthorized')).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should detect rate limit', () => {
      expect(isRateLimitError('rate limit exceeded')).toBe(true);
    });

    it('should detect 429', () => {
      expect(isRateLimitError('429 Too Many Requests')).toBe(true);
    });

    it('should detect abuse detection', () => {
      expect(isRateLimitError('abuse detection')).toBe(true);
    });

    it('should not detect timeout', () => {
      expect(isRateLimitError('timeout')).toBe(false);
    });
  });

  describe('buildGracefulResponse', () => {
    it('should build no_token response', () => {
      const resp = buildGracefulResponse('fetch repos', 'no_token');
      expect(resp.ok).toBe(false);
      expect(resp.error).toContain('fetch repos');
      expect(resp.suggestion).toContain('GITHUB_TOKEN');
    });

    it('should build invalid_token response', () => {
      const resp = buildGracefulResponse('fetch repos', 'invalid_token');
      expect(resp.suggestion).toContain('github.com/settings/tokens');
    });

    it('should build rate_limit response', () => {
      const resp = buildGracefulResponse('fetch repos', 'rate_limit');
      expect(resp.suggestion).toContain('rate limit');
    });

    it('should build default response for unknown reason', () => {
      const resp = buildGracefulResponse('fetch repos', 'something_else');
      expect(resp.suggestion).toContain('Try again later');
    });
  });

  describe('canAttemptGithubOperation', () => {
    it('should allow with valid token', () => {
      const result = canAttemptGithubOperation('ghp_' + 'a'.repeat(36));
      expect(result.canAttempt).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject when no token', () => {
      const result = canAttemptGithubOperation(undefined);
      expect(result.canAttempt).toBe(false);
      expect(result.reason).toBe('no_token');
    });

    it('should reject invalid token format', () => {
      const result = canAttemptGithubOperation('invalid_token');
      expect(result.canAttempt).toBe(false);
      expect(result.reason).toBe('invalid_token');
    });
  });

  describe('ResponseCache', () => {
    it('should store and retrieve values', () => {
      const cache = new ResponseCache();
      cache.set('key1', { data: 'hello' });
      expect(cache.get('key1')).toEqual({ data: 'hello' });
    });

    it('should return null for missing keys', () => {
      const cache = new ResponseCache();
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should expire entries after TTL', () => {
      const cache = new ResponseCache(100); // 100ms TTL
      cache.set('key1', 'data', 50); // 50ms TTL
      expect(cache.get('key1')).toBe('data');

      // Wait for expiry
      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(cache.get('key1')).toBeNull();
          resolve();
        }, 60);
      });
    });

    it('should report has() correctly', () => {
      const cache = new ResponseCache();
      cache.set('key1', 'data');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete entries', () => {
      const cache = new ResponseCache();
      cache.set('key1', 'data');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should cleanup expired entries', () => {
      const cache = new ResponseCache(100);
      cache.set('key1', 'data1', 50);
      cache.set('key2', 'data2', 50);
      cache.set('key3', 'data3', 10000);

      return new Promise<void>(resolve => {
        setTimeout(() => {
          const removed = cache.cleanup();
          expect(removed).toBe(2);
          expect(cache.size).toBe(1);
          resolve();
        }, 60);
      });
    });

    it('should clear all entries', () => {
      const cache = new ResponseCache();
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.clear();
      expect(cache.size).toBe(0);
    });

    it('should report size', () => {
      const cache = new ResponseCache();
      expect(cache.size).toBe(0);
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      expect(cache.size).toBe(2);
    });
  });
});

// ─── Commit Message Generator ──────────────────────────────────────────────

describe('Commit Message Generator', () => {
  describe('generateCommitMessage', () => {
    it('should handle empty file list', () => {
      const result = generateCommitMessage([]);
      expect(result.type).toBe('chore');
      expect(result.fullMessage).toContain('chore:');
    });

    it('should detect feat for new files', () => {
      const result = generateCommitMessage([
        { filename: 'src/new-feature.ts', status: 'added', additions: 50, deletions: 0, changes: 50 },
      ]);
      expect(result.type).toBe('feat');
      expect(result.subject).toContain('add');
      expect(result.fullMessage).toContain('feat');
    });

    it('should detect fix for bug-related files', () => {
      const result = generateCommitMessage([
        { filename: 'src/bugfix-login.ts', status: 'modified', additions: 5, deletions: 3, changes: 8 },
      ]);
      expect(result.type).toBe('fix');
    });

    it('should detect test for test files', () => {
      const result = generateCommitMessage([
        { filename: '__tests__/auth.test.ts', status: 'modified', additions: 20, deletions: 0, changes: 20 },
      ]);
      expect(result.type).toBe('test');
    });

    it('should detect docs for markdown files', () => {
      const result = generateCommitMessage([
        { filename: 'README.md', status: 'modified', additions: 10, deletions: 5, changes: 15 },
      ]);
      expect(result.type).toBe('docs');
    });

    it('should detect refactor for deleted files', () => {
      const result = generateCommitMessage([
        { filename: 'src/old-module.ts', status: 'removed', additions: 0, deletions: 100, changes: 100 },
      ]);
      expect(result.type).toBe('refactor');
      expect(result.subject).toContain('remove');
    });

    it('should detect style for CSS files', () => {
      const result = generateCommitMessage([
        { filename: 'styles/theme.css', status: 'modified', additions: 5, deletions: 5, changes: 10 },
      ]);
      expect(result.type).toBe('style');
    });

    it('should detect chore for config files', () => {
      const result = generateCommitMessage([
        { filename: 'jest.config.json', status: 'modified', additions: 2, deletions: 1, changes: 3 },
      ]);
      expect(result.type).toBe('chore');
    });

    it('should generate multi-file subject', () => {
      const result = generateCommitMessage([
        { filename: 'a.ts', status: 'added', additions: 10, deletions: 0, changes: 10 },
        { filename: 'b.ts', status: 'modified', additions: 5, deletions: 2, changes: 7 },
      ]);
      expect(result.subject).toContain('add 1 file');
      expect(result.subject).toContain('update 1 file');
    });

    it('should include scope from common path', () => {
      const result = generateCommitMessage([
        { filename: 'src/lib/auth/login.ts', status: 'modified', additions: 5, deletions: 2, changes: 7 },
        { filename: 'src/lib/auth/logout.ts', status: 'modified', additions: 3, deletions: 1, changes: 4 },
      ]);
      // Common path is src/lib/auth, scope should be "auth"
      expect(result.scope).toBeDefined();
    });

    it('should generate body with file stats for small changes', () => {
      const result = generateCommitMessage([
        { filename: 'file1.ts', status: 'added', additions: 10, deletions: 0, changes: 10 },
      ]);
      expect(result.body).toContain('file1.ts');
      expect(result.body).toContain('+10');
    });

    it('should generate summary body for large changes', () => {
      const files = Array.from({ length: 5 }, (_, i) => ({
        filename: `file${i}.ts`, status: 'modified', additions: 10, deletions: 5, changes: 15,
      }));
      const result = generateCommitMessage(files);
      expect(result.body).toContain('5 files changed');
      expect(result.body).toContain('50 insertions');
    });

    it('should build full conventional commit message', () => {
      const result = generateCommitMessage([
        { filename: 'new-feature.ts', status: 'added', additions: 100, deletions: 0, changes: 100 },
      ]);
      expect(result.fullMessage).toMatch(/^feat/);
    });
  });

  describe('getCommitTypeEmoji', () => {
    it('should return correct emojis', () => {
      expect(getCommitTypeEmoji('feat')).toBe('✨');
      expect(getCommitTypeEmoji('fix')).toBe('🐛');
      expect(getCommitTypeEmoji('docs')).toBe('📝');
      expect(getCommitTypeEmoji('test')).toBe('✅');
      expect(getCommitTypeEmoji('chore')).toBe('🔧');
    });

    it('should return default emoji for unknown type', () => {
      expect(getCommitTypeEmoji('unknown')).toBe('📦');
    });
  });

  describe('getCommitTypeDescription', () => {
    it('should return descriptions', () => {
      expect(getCommitTypeDescription('feat')).toContain('feature');
      expect(getCommitTypeDescription('fix')).toContain('bug fix');
    });

    it('should return default for unknown', () => {
      expect(getCommitTypeDescription('unknown')).toContain('codebase');
    });
  });

  describe('validateCommitMessage', () => {
    it('should accept valid message', () => {
      expect(validateCommitMessage('feat: add new feature').valid).toBe(true);
    });

    it('should reject empty message', () => {
      expect(validateCommitMessage('').valid).toBe(false);
    });

    it('should reject too short message', () => {
      expect(validateCommitMessage('short').valid).toBe(false);
    });

    it('should reject too long message', () => {
      expect(validateCommitMessage('a'.repeat(501)).valid).toBe(false);
    });
  });
});

// ─── PR Template Generator ─────────────────────────────────────────────────

describe('PR Template Generator', () => {
  const baseCommit = (message: string): any => ({
    sha: 'abc1234567890',
    message,
    author: 'Steve',
    date: '2026-05-27',
  });

  const baseFile = (filename: string, status: any = 'modified'): any => ({
    filename,
    status,
    additions: 10,
    deletions: 5,
    changes: 15,
  });

  describe('generatePRTemplate', () => {
    it('should detect feature PR type', () => {
      const template = generatePRTemplate(
        [baseCommit('feat: add new plugin')],
        [baseFile('src/plugin.ts')],
        'feature-branch',
      );
      expect(template.type).toBe('feature');
    });

    it('should detect bugfix PR type', () => {
      const template = generatePRTemplate(
        [baseCommit('fix: resolve auth bug')],
        [baseFile('src/auth.ts')],
        'fix-branch',
      );
      expect(template.type).toBe('bugfix');
    });

    it('should generate title from single commit', () => {
      const template = generatePRTemplate(
        [baseCommit('feat: add Spotify integration')],
        [],
        'spotify',
      );
      expect(template.title).toContain('Add Spotify integration');
    });

    it('should generate body with checklist', () => {
      const template = generatePRTemplate(
        [baseCommit('feat: add feature')],
        [baseFile('src/feature.ts', 'added')],
        'feature',
      );
      expect(template.body).toContain('## Checklist');
      expect(template.body).toContain('Self-review');
    });

    it('should include files changed section', () => {
      const template = generatePRTemplate(
        [baseCommit('feat: add feature')],
        [baseFile('src/feature.ts', 'added')],
        'feature',
      );
      expect(template.body).toContain('## Files Changed');
      expect(template.body).toContain('src/feature.ts');
    });

    it('should include branch info', () => {
      const template = generatePRTemplate(
        [baseCommit('chore: update deps')],
        [],
        'deps-update',
        'develop',
      );
      expect(template.body).toContain('deps-update');
      expect(template.body).toContain('develop');
    });

    it('should include commits section for multiple commits', () => {
      const template = generatePRTemplate(
        [baseCommit('feat: first'), baseCommit('feat: second')],
        [],
        'feature',
      );
      expect(template.body).toContain('## Commits');
      expect(template.body).toContain('abc1234');
    });

    it('should summarize files for large changesets', () => {
      const files = Array.from({ length: 25 }, (_, i) => baseFile(`file${i}.ts`));
      const template = generatePRTemplate(
        [baseCommit('feat: big feature')],
        files,
        'feature',
      );
      expect(template.body).toContain('25 files changed');
    });

    it('should detect refactor type', () => {
      const template = generatePRTemplate(
        [baseCommit('refactor: clean up auth module')],
        [],
        'refactor',
      );
      expect(template.type).toBe('refactor');
    });

    it('should detect test type', () => {
      const template = generatePRTemplate(
        [baseCommit('test: add integration tests')],
        [],
        'tests',
      );
      expect(template.type).toBe('test');
    });
  });

  describe('generateQuickTemplate', () => {
    it('should return title and type only', () => {
      const result = generateQuickTemplate([baseCommit('feat: new thing')]);
      expect(result.type).toBe('feature');
      expect(result.title).toBeTruthy();
      expect((result as any).body).toBeUndefined();
    });

    it('should detect type from commit messages', () => {
      const result = generateQuickTemplate([baseCommit('fix: patch security hole')]);
      expect(result.type).toBe('bugfix');
    });
  });
});
