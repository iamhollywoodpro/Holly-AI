/// <reference types="jest" />

/**
 * Safety Guardrails Test Suite
 *
 * Tests for src/lib/self-improvement/safety-guardrails.ts covering:
 *   - File access validation against RESTRICTED_FILES patterns
 *   - Risk level validation against HIGH_RISK and MEDIUM_RISK file patterns
 *   - Code safety checks for secret patterns and dangerous operations
 *   - Combined safety checks via performSafetyCheck
 *
 * No mocks needed -- these are pure functions.
 */

import {
  validateFileAccess,
  validateRiskLevel,
  validateCodeSafety,
  performSafetyCheck,
} from '@/lib/self-improvement/safety-guardrails';

// ═══════════════════════════════════════════════════════════════════════════════
// validateFileAccess
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateFileAccess', () => {
  // ── Restricted file patterns ─────────────────────────────────────────────

  describe('restricted files are blocked', () => {
    it('blocks .env files', () => {
      expect(validateFileAccess('.env').allowed).toBe(false);
      expect(validateFileAccess('.env').reason).toContain('restricted');
    });

    it('blocks .env.local', () => {
      const result = validateFileAccess('.env.local');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('.env.local');
    });

    it('blocks .env.production', () => {
      expect(validateFileAccess('.env.production').allowed).toBe(false);
    });

    it('blocks middleware.ts', () => {
      const result = validateFileAccess('middleware.ts');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('middleware.ts');
    });

    it('blocks prisma/schema.prisma', () => {
      const result = validateFileAccess('prisma/schema.prisma');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('prisma/schema.prisma');
    });

    it('blocks prisma/migrations/**', () => {
      expect(validateFileAccess('prisma/migrations/001_init.sql').allowed).toBe(false);
    });

    it('blocks auth route files (glob pattern)', () => {
      expect(validateFileAccess('app/api/auth/route.ts').allowed).toBe(false);
    });

    it('blocks self-improvement system files (prevent recursive modification)', () => {
      expect(validateFileAccess('src/lib/self-improvement/safety-guardrails.ts').allowed).toBe(false);
      expect(validateFileAccess('src/lib/self-improvement/engine.ts').allowed).toBe(false);
      expect(validateFileAccess('app/api/self-improvement/route.ts').allowed).toBe(false);
    });

    it('blocks CI/CD and deployment files', () => {
      expect(validateFileAccess('.github/workflows/ci.yml').allowed).toBe(false);
      expect(validateFileAccess('vercel.json').allowed).toBe(false);
      expect(validateFileAccess('next.config.js').allowed).toBe(false);
    });

    it('blocks package and typescript config files', () => {
      expect(validateFileAccess('package.json').allowed).toBe(false);
      expect(validateFileAccess('package-lock.json').allowed).toBe(false);
      expect(validateFileAccess('tsconfig.json').allowed).toBe(false);
    });
  });

  // ── Allowed file patterns ────────────────────────────────────────────────

  describe('safe files are allowed', () => {
    it('allows regular source files', () => {
      expect(validateFileAccess('src/lib/utils/helpers.ts').allowed).toBe(true);
    });

    it('allows component files', () => {
      expect(validateFileAccess('src/components/Button.tsx').allowed).toBe(true);
    });

    it('allows test files', () => {
      expect(validateFileAccess('__tests__/some-test.test.ts').allowed).toBe(true);
    });

    it('allows documentation files', () => {
      expect(validateFileAccess('docs/architecture.md').allowed).toBe(true);
    });

    it('allows non-restricted API routes', () => {
      // app/api/chat/** is HIGH_RISK but not RESTRICTED
      expect(validateFileAccess('app/api/chat/route.ts').allowed).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateRiskLevel
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateRiskLevel', () => {
  it('blocks low risk level when files require medium', () => {
    const result = validateRiskLevel(['app/api/route.ts'], 'low');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('medium');
  });

  it('blocks low risk level when files require high', () => {
    const result = validateRiskLevel(['src/lib/db.ts'], 'low');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('high');
  });

  it('blocks medium risk level when files require high', () => {
    const result = validateRiskLevel(['app/api/chat/route.ts'], 'medium');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('high');
  });

  it('passes when medium is declared for medium-risk files', () => {
    const result = validateRiskLevel(['app/api/route.ts'], 'medium');
    expect(result.allowed).toBe(true);
  });

  it('passes when high is declared for high-risk files', () => {
    const result = validateRiskLevel(['src/lib/db.ts'], 'high');
    expect(result.allowed).toBe(true);
  });

  it('passes when high is declared for medium-risk files', () => {
    const result = validateRiskLevel(['app/api/route.ts'], 'high');
    expect(result.allowed).toBe(true);
  });

  it('escalates to high when mixed medium and high files are present', () => {
    const result = validateRiskLevel(
      ['app/api/route.ts', 'src/lib/db.ts'],
      'medium'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('high');
  });

  it('passes with low risk for empty file list', () => {
    const result = validateRiskLevel([], 'low');
    expect(result.allowed).toBe(true);
  });

  it('returns file access denial if a restricted file is in the list', () => {
    const result = validateRiskLevel(['.env'], 'high');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('restricted');
  });

  it('includes warnings for medium-risk files', () => {
    const result = validateRiskLevel(['app/api/route.ts'], 'medium');
    expect(result.allowed).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some(w => w.includes('medium-risk'))).toBe(true);
  });

  it('includes warnings for high-risk files', () => {
    const result = validateRiskLevel(['src/lib/db.ts'], 'high');
    expect(result.allowed).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some(w => w.includes('high-risk'))).toBe(true);
  });

  it('allows low risk for non-sensitive source files', () => {
    const result = validateRiskLevel(['src/lib/utils/helpers.ts'], 'low');
    expect(result.allowed).toBe(true);
  });

  it('recognizes src/lib/ai/** as high-risk', () => {
    const result = validateRiskLevel(['src/lib/ai/prompt-builder.ts'], 'low');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('high');
  });

  it('recognizes app/api/billing/** as high-risk', () => {
    const result = validateRiskLevel(['app/api/billing/route.ts'], 'low');
    expect(result.allowed).toBe(false);
  });

  it('recognizes app/api/payment/** as high-risk', () => {
    const result = validateRiskLevel(['app/api/payment/charge.ts'], 'medium');
    expect(result.allowed).toBe(false);
  });

  it('recognizes app/api/user/** as high-risk', () => {
    const result = validateRiskLevel(['app/api/user/route.ts'], 'low');
    expect(result.allowed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// validateCodeSafety
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateCodeSafety', () => {
  // ── Secret patterns (blocking) ───────────────────────────────────────────

  describe('secret patterns block the change', () => {
    it('detects api_key= with hardcoded value', () => {
      const result = validateCodeSafety({
        'src/lib/config.ts': 'const api_key = "sk-12345abcdef"',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('hardcoded secrets');
    });

    it('detects api-key variant with dashes', () => {
      const result = validateCodeSafety({
        'config.ts': 'api-key = "abc123"',
      });
      expect(result.allowed).toBe(false);
    });

    it('detects password= with hardcoded value', () => {
      const result = validateCodeSafety({
        'auth.ts': 'const password = "supersecret123"',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('hardcoded secrets');
    });

    it('detects secret= with hardcoded value', () => {
      const result = validateCodeSafety({
        'env.ts': 'const secret = "my_jwt_secret"',
      });
      expect(result.allowed).toBe(false);
    });

    it('detects token= with hardcoded value (including false positives like csrfToken)', () => {
      // The regex matches token = 'value' patterns broadly
      const result = validateCodeSafety({
        'csrf.ts': 'const token = "some_token_value"',
      });
      expect(result.allowed).toBe(false);
    });

    it('detects secrets across multiple files', () => {
      const result = validateCodeSafety({
        'a.ts': 'const api_key = "sk-abc"',
        'b.ts': 'const password = "pass123"',
      });
      expect(result.allowed).toBe(false);
    });
  });

  // ── Dangerous patterns (warnings only, does not block) ───────────────────

  describe('dangerous patterns produce warnings but do not block', () => {
    it('warns about eval() usage', () => {
      const result = validateCodeSafety({
        'dynamic.ts': 'const result = eval("2 + 2")',
      });
      expect(result.allowed).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.some(w => w.includes('eval()'))).toBe(true);
    });

    it('warns about exec() usage', () => {
      const result = validateCodeSafety({
        'exec.ts': 'child_process.exec("ls -la")',
      });
      expect(result.allowed).toBe(true);
      expect(result.warnings!.some(w => w.includes('exec()'))).toBe(true);
    });

    it('warns about rm -rf usage', () => {
      const result = validateCodeSafety({
        'cleanup.sh': 'rm -rf /tmp/old_files',
      });
      expect(result.allowed).toBe(true);
      expect(result.warnings!.some(w => w.includes('rm -rf'))).toBe(true);
    });

    it('warns about DROP TABLE usage', () => {
      const result = validateCodeSafety({
        'migration.sql': 'DROP TABLE users;',
      });
      expect(result.allowed).toBe(true);
      expect(result.warnings!.some(w => w.includes('DROP TABLE'))).toBe(true);
    });

    it('accumulates multiple warnings from the same file', () => {
      const result = validateCodeSafety({
        'dangerous.ts': 'eval("code"); exec("cmd"); rm -rf /tmp',
      });
      expect(result.allowed).toBe(true);
      expect(result.warnings!.length).toBeGreaterThanOrEqual(3);
    });

    it('accumulates warnings across multiple files', () => {
      const result = validateCodeSafety({
        'a.ts': 'eval("x")',
        'b.ts': 'exec("y")',
      });
      expect(result.allowed).toBe(true);
      expect(result.warnings!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Clean code ───────────────────────────────────────────────────────────

  describe('clean code passes', () => {
    it('passes for code with no secrets or dangerous patterns', () => {
      const result = validateCodeSafety({
        'clean.ts': 'export function add(a: number, b: number) { return a + b; }',
      });
      expect(result.allowed).toBe(true);
      // validateCodeSafety returns an empty warnings array when none found
      expect(result.warnings).toEqual([]);
    });

    it('passes for empty input', () => {
      const result = validateCodeSafety({});
      expect(result.allowed).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('passes for empty file content', () => {
      const result = validateCodeSafety({ 'empty.ts': '' });
      expect(result.allowed).toBe(true);
      expect(result.warnings).toEqual([]);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// performSafetyCheck
// ═══════════════════════════════════════════════════════════════════════════════

describe('performSafetyCheck', () => {
  it('combines all three checks and passes for safe changes', () => {
    const result = performSafetyCheck(
      ['src/lib/utils/helpers.ts'],
      { 'src/lib/utils/helpers.ts': 'export const helper = () => true;' },
      'low'
    );
    expect(result.allowed).toBe(true);
  });

  it('short-circuits on file access denial', () => {
    const result = performSafetyCheck(
      ['.env', 'src/lib/utils/helpers.ts'],
      { 'src/lib/utils/helpers.ts': 'export const x = 1;' },
      'low'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('restricted');
  });

  it('short-circuits on first restricted file encountered', () => {
    const result = performSafetyCheck(
      ['src/lib/utils/helpers.ts', '.env'],
      {},
      'low'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('.env');
  });

  it('blocks on risk level mismatch', () => {
    const result = performSafetyCheck(
      ['src/lib/db.ts'],
      { 'src/lib/db.ts': 'export const db = {};' },
      'low'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Risk level mismatch');
  });

  it('blocks on code safety violation', () => {
    const result = performSafetyCheck(
      ['src/lib/utils/config.ts'],
      { 'src/lib/utils/config.ts': 'const password = "hardcoded"' },
      'low'
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('hardcoded secrets');
  });

  it('aggregates warnings from risk and code checks', () => {
    const result = performSafetyCheck(
      ['app/api/route.ts'],
      { 'app/api/route.ts': 'eval("console.log()")' },
      'medium'
    );
    expect(result.allowed).toBe(true);
    expect(result.warnings).toBeDefined();
    // Should have a medium-risk file warning and an eval() warning
    expect(result.warnings!.length).toBeGreaterThanOrEqual(1);
    const joined = result.warnings!.join(' ');
    expect(joined).toContain('eval()');
  });

  it('passes with undefined warnings when there are none', () => {
    const result = performSafetyCheck(
      ['src/lib/utils/clean.ts'],
      { 'src/lib/utils/clean.ts': 'export const clean = true;' },
      'low'
    );
    expect(result.allowed).toBe(true);
    expect(result.warnings).toBeUndefined();
  });

  it('handles empty file list and empty code changes', () => {
    const result = performSafetyCheck([], {}, 'low');
    expect(result.allowed).toBe(true);
  });

  it('checks code safety even when no risk warnings exist', () => {
    const result = performSafetyCheck(
      ['src/lib/utils/helpers.ts'],
      { 'src/lib/utils/helpers.ts': 'eval("x = 1")' },
      'low'
    );
    expect(result.allowed).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some(w => w.includes('eval()'))).toBe(true);
  });
});
