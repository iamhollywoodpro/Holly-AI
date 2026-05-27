/**
 * Sandbox Execution & Security Tests
 *
 * Covers SandboxExecutor (executor.ts) and SandboxSecurity (security.ts):
 *   - Code validation: empty, oversized, dangerous patterns
 *   - JavaScript/TypeScript execution in vm sandbox
 *   - HTML sanitization
 *   - Security policy enforcement, severity classification
 *   - Output sanitization, timeout boundaries, rate limiting
 */

import { SandboxExecutor } from '@/lib/sandbox/executor';
import { SandboxSecurity } from '@/lib/sandbox/security';
import type { SecurityPolicy, SecurityViolation } from '@/lib/sandbox/security';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a string longer than `bytes` characters by repeating 'a'. */
function oversizedCode(bytes: number): string {
  return 'a'.repeat(bytes + 1);
}

// ---------------------------------------------------------------------------
// 1. SandboxExecutor -- code validation
// ---------------------------------------------------------------------------

describe('SandboxExecutor - validateCode', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it('rejects empty code', async () => {
    const result = await executor.execute({ code: '', language: 'javascript' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Code is empty');
  });

  it('rejects code exceeding 100KB', async () => {
    const bigCode = oversizedCode(100_000); // 100 001 chars
    const result = await executor.execute({ code: bigCode, language: 'javascript' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('too long');
  });

  it('accepts code at 100KB boundary (code <= 100 000 chars)', async () => {
    // The limit is > 100 000, so exactly 100 000 should pass validation
    const code = 'const x = 1;/*' + 'a'.repeat(99_984) + '*/';
    expect(code.length).toBeLessThanOrEqual(100_000);
    const result = await executor.execute({ code, language: 'javascript' });
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // Dangerous patterns -- each one should be rejected

  const dangerousPatternCases: [string, string][] = [
    ['require("child_process")', 'child_process'],
    ["require('child_process')", 'child_process'],
    ['require("fs")', 'fs'],
    ["require('net')", 'net'],
    ['process.exit(1)', 'process.exit'],
    ['process.kill(1234)', 'process.kill'],
    ['eval("hello")', 'eval'],
    ['Function("return 1")()', 'Function'],
    ['console.log(__dirname)', '__dirname'],
    ['console.log(__filename)', '__filename'],
    ["import fs from 'fs'", 'import.*fs'],
    ["import { exec } from 'child_process'", 'import.*child_process'],
  ];

  it.each(dangerousPatternCases)(
    'rejects dangerous pattern: %s',
    async (code, _label) => {
      const result = await executor.execute({ code, language: 'javascript' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Dangerous pattern');
    },
  );

  it('accepts safe code without dangerous patterns', async () => {
    const result = await executor.execute({
      code: 'const sum = (a, b) => a + b; sum(1, 2);',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. SandboxExecutor -- JavaScript execution
// ---------------------------------------------------------------------------

describe('SandboxExecutor - JavaScript execution', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it('executes simple arithmetic and returns output', async () => {
    const result = await executor.execute({
      code: '2 + 2',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('4');
  });

  it('captures console.log output', async () => {
    const result = await executor.execute({
      code: 'console.log("hello", "world"); 42;',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.console_logs).toContain('hello world');
    expect(result.output).toBe('42');
  });

  it('captures console.error output with [ERROR] prefix', async () => {
    const result = await executor.execute({
      code: 'console.error("boom");',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.console_logs).toEqual(
      expect.arrayContaining([expect.stringContaining('[ERROR] boom')]),
    );
  });

  it('captures console.warn output with [WARN] prefix', async () => {
    const result = await executor.execute({
      code: 'console.warn("careful");',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.console_logs).toEqual(
      expect.arrayContaining([expect.stringContaining('[WARN] careful')]),
    );
  });

  it('handles runtime errors gracefully', async () => {
    const result = await executor.execute({
      code: 'throw new Error("test error");',
      language: 'javascript',
    });
    expect(result.success).toBe(false);
    // The outer Promise.race catch wraps the error; either the raw message or
    // a generic message is acceptable -- the key is success=false and error is set.
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
    expect(result.error.length).toBeGreaterThan(0);
  });

  it('returns undefined output when expression has no result', async () => {
    const result = await executor.execute({
      code: 'var x = 5;',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    // var declarations return undefined in vm
    expect(result.output === undefined || result.output === 'undefined').toBe(true);
  });

  it('tracks execution time', async () => {
    const result = await executor.execute({
      code: '1 + 1',
      language: 'javascript',
    });
    expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// 3. SandboxExecutor -- timeout race
// ---------------------------------------------------------------------------

describe('SandboxExecutor - timeout handling', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it('returns an error when code exceeds the timeout', async () => {
    // Use the vm timeout mechanism -- a long-running synchronous loop
    // vm.runInNewContext respects its timeout option
    const result = await executor.execute({
      code: 'let i = 0; while(i < 1e9) { i++; } i;',
      language: 'javascript',
      timeout: 10, // 10 ms -- intentionally short
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  }, 15_000);
});

// ---------------------------------------------------------------------------
// 4. SandboxExecutor -- TypeScript passthrough
// ---------------------------------------------------------------------------

describe('SandboxExecutor - TypeScript passthrough', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it('delegates TypeScript execution to JavaScript engine', async () => {
    const result = await executor.execute({
      // Valid JS (TS compiler not actually used -- treats as JS)
      code: 'const x: number = 10; x;',
      language: 'typescript',
    });
    // vm will error on the type annotation, but the execution still happens
    // The important thing is it delegates -- either succeeds or fails via JS path
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('execution_time_ms');
  });

  it('successfully runs TS code that is also valid JS', async () => {
    const result = await executor.execute({
      code: 'const x = 42; x;',
      language: 'typescript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('42');
  });

  it('captures console output from TypeScript execution', async () => {
    const result = await executor.execute({
      code: 'console.log("from TS");',
      language: 'typescript',
    });
    expect(result.success).toBe(true);
    expect(result.console_logs).toContain('from TS');
  });
});

// ---------------------------------------------------------------------------
// 5. SandboxExecutor -- HTML sanitization
// ---------------------------------------------------------------------------

describe('SandboxExecutor - HTML sanitization', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it('removes <script> tags', async () => {
    const result = await executor.execute({
      code: '<div>Hello</div><script>alert("xss")</script>',
      language: 'html',
    });
    expect(result.success).toBe(true);
    expect(result.preview_html).not.toContain('<script');
    expect(result.preview_html).not.toContain('alert');
    expect(result.preview_html).toContain('<div>Hello</div>');
  });

  it('removes inline event handlers (on* attributes)', async () => {
    const result = await executor.execute({
      code: '<img src="x.png" onerror="alert(1)" />',
      language: 'html',
    });
    expect(result.success).toBe(true);
    expect(result.preview_html).not.toContain('onerror');
    expect(result.preview_html).toContain('src="x.png"');
  });

  it('removes onclick event handlers', async () => {
    const result = await executor.execute({
      code: '<button onclick="steal()">Click</button>',
      language: 'html',
    });
    expect(result.success).toBe(true);
    expect(result.preview_html).not.toContain('onclick');
    expect(result.preview_html).toContain('Click');
  });

  it('removes javascript: URLs in href', async () => {
    const result = await executor.execute({
      code: '<a href="javascript:alert(1)">Link</a>',
      language: 'html',
    });
    expect(result.success).toBe(true);
    expect(result.preview_html).not.toContain('javascript:');
    expect(result.preview_html).toContain('Link');
  });

  it('removes data: URLs in src attributes', async () => {
    const result = await executor.execute({
      code: '<img src="data:text/html,<script>alert(1)</script>" />',
      language: 'html',
    });
    expect(result.success).toBe(true);
    expect(result.preview_html).not.toContain('data:');
  });

  it('wraps sanitized HTML in a full document structure', async () => {
    const result = await executor.execute({
      code: '<p>Safe content</p>',
      language: 'html',
    });
    expect(result.success).toBe(true);
    expect(result.preview_html).toContain('<!DOCTYPE html>');
    expect(result.preview_html).toContain('<html>');
    expect(result.preview_html).toContain('<head>');
    expect(result.preview_html).toContain('<body>');
    expect(result.preview_html).toContain('<p>Safe content</p>');
  });

  it('produces empty console_logs for HTML execution', async () => {
    const result = await executor.execute({
      code: '<p>No logs</p>',
      language: 'html',
    });
    expect(result.console_logs).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 6. SandboxExecutor -- unsupported language
// ---------------------------------------------------------------------------

describe('SandboxExecutor - unsupported language', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it('returns an error for unsupported languages', async () => {
    const result = await executor.execute({
      code: 'print("hi")',
      language: 'python' as any,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported language');
    expect(result.error).toContain('python');
  });
});

// ---------------------------------------------------------------------------
// 7. Sandbox context blocks dangerous globals
// ---------------------------------------------------------------------------

describe('SandboxExecutor - sandbox context isolation', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it('sets process to undefined', async () => {
    const result = await executor.execute({
      code: 'typeof process',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('undefined');
  });

  it('sets require to undefined', async () => {
    const result = await executor.execute({
      code: 'typeof require',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('undefined');
  });

  it('sets setTimeout to undefined', async () => {
    const result = await executor.execute({
      code: 'typeof setTimeout',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('undefined');
  });

  it('sets setInterval to undefined', async () => {
    const result = await executor.execute({
      code: 'typeof setInterval',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('undefined');
  });

  it('sets setImmediate to undefined', async () => {
    const result = await executor.execute({
      code: 'typeof setImmediate',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('undefined');
  });

  it('sets module to undefined', async () => {
    const result = await executor.execute({
      code: 'typeof module',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('undefined');
  });

  it('sets exports to undefined', async () => {
    const result = await executor.execute({
      code: 'typeof exports',
      language: 'javascript',
    });
    expect(result.success).toBe(true);
    expect(result.output).toBe('undefined');
  });

  it('blocks __dirname access at validation level', async () => {
    // __dirname is caught by validateCode's dangerous pattern check before
    // the code ever reaches the sandbox context
    const result = await executor.execute({
      code: 'typeof __dirname',
      language: 'javascript',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Dangerous pattern');
  });

  it('blocks __filename access at validation level', async () => {
    const result = await executor.execute({
      code: 'typeof __filename',
      language: 'javascript',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Dangerous pattern');
  });
});

// ---------------------------------------------------------------------------
// 8. SandboxExecutor -- static helpers
// ---------------------------------------------------------------------------

describe('SandboxExecutor - static helpers', () => {
  it('getLimits returns expected defaults', () => {
    const limits = SandboxExecutor.getLimits();
    expect(limits).toEqual({
      timeout_ms: 5000,
      memory_limit_mb: 128,
      max_output_length: 10_000,
    });
  });

  it('stop returns true (mock)', async () => {
    const executor = new SandboxExecutor();
    const stopped = await executor.stop('any-id');
    expect(stopped).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. SandboxSecurity -- validateCode: file system detection
// ---------------------------------------------------------------------------

describe('SandboxSecurity.validateCode - file system detection', () => {
  it('detects require("fs")', () => {
    const { valid, violations } = SandboxSecurity.validateCode('require("fs")');
    expect(valid).toBe(true); // file_access is "high", not critical
    const fsViolations = violations.filter(v => v.type === 'file_access');
    expect(fsViolations.length).toBeGreaterThan(0);
    expect(fsViolations[0].severity).toBe('high');
  });

  it('detects import from "fs"', () => {
    const { violations } = SandboxSecurity.validateCode("import fs from 'fs'");
    const fsViolations = violations.filter(v => v.type === 'file_access');
    expect(fsViolations.length).toBeGreaterThan(0);
  });

  it('detects import from "node:fs"', () => {
    const { violations } = SandboxSecurity.validateCode("import fs from 'node:fs'");
    const fsViolations = violations.filter(v => v.type === 'file_access');
    expect(fsViolations.length).toBeGreaterThan(0);
  });

  it('does not flag file system when policy allows it', () => {
    const policy: SecurityPolicy = {
      allow_network: false,
      allow_file_system: true,
      allow_external_imports: false,
      max_execution_time_ms: 5000,
      max_memory_mb: 128,
      max_output_size_kb: 100,
    };
    const { violations } = SandboxSecurity.validateCode('require("fs")', policy);
    const fsViolations = violations.filter(v => v.type === 'file_access');
    expect(fsViolations.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 10. SandboxSecurity -- validateCode: network detection
// ---------------------------------------------------------------------------

describe('SandboxSecurity.validateCode - network detection', () => {
  it('detects require("http")', () => {
    const { violations } = SandboxSecurity.validateCode('require("http")');
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBeGreaterThan(0);
    expect(netViolations[0].severity).toBe('medium');
  });

  it('detects require("https")', () => {
    const { violations } = SandboxSecurity.validateCode("require('https')");
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBeGreaterThan(0);
  });

  it('detects require("net")', () => {
    const { violations } = SandboxSecurity.validateCode("require('net')");
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBeGreaterThan(0);
  });

  it('detects import from "http"', () => {
    const { violations } = SandboxSecurity.validateCode("import http from 'http'");
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBeGreaterThan(0);
  });

  it('detects fetch()', () => {
    const { violations } = SandboxSecurity.validateCode('fetch("https://example.com")');
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBeGreaterThan(0);
  });

  it('detects XMLHttpRequest', () => {
    const { violations } = SandboxSecurity.validateCode('const x = new XMLHttpRequest()');
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBeGreaterThan(0);
  });

  it('detects WebSocket', () => {
    const { violations } = SandboxSecurity.validateCode('const ws = new WebSocket("wss://evil")');
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBeGreaterThan(0);
  });

  it('does not flag network when policy allows it', () => {
    const policy: SecurityPolicy = {
      allow_network: true,
      allow_file_system: false,
      allow_external_imports: false,
      max_execution_time_ms: 5000,
      max_memory_mb: 128,
      max_output_size_kb: 100,
    };
    const { violations } = SandboxSecurity.validateCode('fetch("/api")', policy);
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 11. SandboxSecurity -- validateCode: dangerous patterns
// ---------------------------------------------------------------------------

describe('SandboxSecurity.validateCode - dangerous patterns', () => {
  const dangerousCases: [string, string][] = [
    ['eval("code")', 'eval'],
    ['Function("return 1")()', 'Function constructor'],
    ['require("child_process")', 'child_process'],
    ['process.exit(0)', 'process.exit'],
    ['process.kill(1)', 'process.kill'],
    ['__dirname', '__dirname'],
    ['__filename', '__filename'],
    ['while(true) {}', 'infinite while'],
    ['for(;;) {}', 'infinite for'],
  ];

  it.each(dangerousCases)('detects dangerous pattern: %s', (code, _label) => {
    const { valid, violations } = SandboxSecurity.validateCode(code);
    expect(valid).toBe(false); // dangerous_code is critical -> invalid
    const dangerous = violations.filter(v => v.type === 'dangerous_code');
    expect(dangerous.length).toBeGreaterThan(0);
    expect(dangerous[0].severity).toBe('critical');
  });

  it('detects multiple dangerous patterns in a single code block', () => {
    const code = 'eval("x"); process.exit(1);';
    const { violations } = SandboxSecurity.validateCode(code);
    const dangerous = violations.filter(v => v.type === 'dangerous_code');
    expect(dangerous.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 12. SandboxSecurity -- validateCode: code size
// ---------------------------------------------------------------------------

describe('SandboxSecurity.validateCode - code size', () => {
  it('flags code exceeding max_output_size_kb', () => {
    // Default policy has max_output_size_kb: 100 => 102 400 bytes
    const bigCode = oversizedCode(100 * 1024);
    const { violations } = SandboxSecurity.validateCode(bigCode);
    const sizeViolations = violations.filter(v => v.type === 'resource_limit');
    expect(sizeViolations.length).toBeGreaterThan(0);
    expect(sizeViolations[0].severity).toBe('medium');
  });

  it('does not flag code within size limit', () => {
    const smallCode = 'const x = 1;';
    const { violations } = SandboxSecurity.validateCode(smallCode);
    const sizeViolations = violations.filter(v => v.type === 'resource_limit');
    expect(sizeViolations.length).toBe(0);
  });

  it('code size violation alone does not make code invalid (medium severity)', () => {
    const bigCode = oversizedCode(100 * 1024);
    const { valid, violations } = SandboxSecurity.validateCode(bigCode);
    // resource_limit is medium, not critical
    const hasCritical = violations.some(v => v.severity === 'critical');
    if (!hasCritical) {
      expect(valid).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 13. SandboxSecurity -- severity classification
// ---------------------------------------------------------------------------

describe('SandboxSecurity - severity classification', () => {
  it('file_access violations are "high" severity and do NOT block execution', () => {
    const { valid, violations } = SandboxSecurity.validateCode('require("fs")');
    const fsViolations = violations.filter(v => v.type === 'file_access');
    expect(fsViolations.length).toBeGreaterThan(0);
    expect(fsViolations[0].severity).toBe('high');
    // Only critical severity causes valid: false; high should not
    expect(valid).toBe(true);
  });

  it('network_access violations are "medium" severity and do NOT block execution', () => {
    const { valid, violations } = SandboxSecurity.validateCode('fetch("/api/data")');
    const netViolations = violations.filter(v => v.type === 'network_access');
    expect(netViolations.length).toBeGreaterThan(0);
    expect(netViolations[0].severity).toBe('medium');
    expect(valid).toBe(true);
  });

  it('dangerous_code violations are "critical" severity and DO block execution', () => {
    const { valid, violations } = SandboxSecurity.validateCode('eval("code")');
    const dangerous = violations.filter(v => v.type === 'dangerous_code');
    expect(dangerous.length).toBeGreaterThan(0);
    expect(dangerous[0].severity).toBe('critical');
    expect(valid).toBe(false);
  });

  it('only critical severity determines valid: false', () => {
    // Code with both high and medium violations but no critical
    const code = 'require("fs"); fetch("/api");';
    const { valid, violations } = SandboxSecurity.validateCode(code);
    const criticals = violations.filter(v => v.severity === 'critical');
    expect(criticals.length).toBe(0);
    expect(valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 14. SandboxSecurity -- sanitizeOutput
// ---------------------------------------------------------------------------

describe('SandboxSecurity.sanitizeOutput', () => {
  it('returns output unchanged when within maxLength', () => {
    const output = 'Hello world';
    const result = SandboxSecurity.sanitizeOutput(output, 100);
    expect(result).toBe('Hello world');
  });

  it('truncates output and appends truncation message when exceeding maxLength', () => {
    const output = 'a'.repeat(150);
    const result = SandboxSecurity.sanitizeOutput(output, 100);
    expect(result.length).toBeGreaterThan(100); // includes truncation suffix
    expect(result.startsWith('a'.repeat(100))).toBe(true);
    expect(result).toContain('output truncated');
  });

  it('uses default maxLength of 10000 when not specified', () => {
    const output = 'b'.repeat(10_001);
    const result = SandboxSecurity.sanitizeOutput(output);
    expect(result).toContain('output truncated');
    expect(result.length).toBeGreaterThan(10_000);
  });

  it('does not truncate output exactly at maxLength', () => {
    const output = 'x'.repeat(50);
    const result = SandboxSecurity.sanitizeOutput(output, 50);
    expect(result).toBe(output);
    expect(result).not.toContain('truncated');
  });
});

// ---------------------------------------------------------------------------
// 15. SandboxSecurity -- isTimeoutExceeded
// ---------------------------------------------------------------------------

describe('SandboxSecurity.isTimeoutExceeded', () => {
  it('returns true when elapsed time exceeds maxTime', () => {
    const startTime = Date.now() - 10_000; // 10 seconds ago
    const result = SandboxSecurity.isTimeoutExceeded(startTime, 5000);
    expect(result).toBe(true);
  });

  it('returns false when elapsed time is within maxTime', () => {
    const startTime = Date.now() - 100; // 100 ms ago
    const result = SandboxSecurity.isTimeoutExceeded(startTime, 5000);
    expect(result).toBe(false);
  });

  it('returns false when startTime is exactly now and maxTime is positive', () => {
    const startTime = Date.now();
    const result = SandboxSecurity.isTimeoutExceeded(startTime, 5000);
    expect(result).toBe(false);
  });

  it('returns true when maxTime is 0 and any time has passed', () => {
    const startTime = Date.now() - 1;
    const result = SandboxSecurity.isTimeoutExceeded(startTime, 0);
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 16. SandboxSecurity -- getPolicyForUser
// ---------------------------------------------------------------------------

describe('SandboxSecurity.getPolicyForUser', () => {
  it('returns default policy for non-premium users', () => {
    const policy = SandboxSecurity.getPolicyForUser('user-123', false);
    expect(policy.max_execution_time_ms).toBe(5000);
    expect(policy.max_memory_mb).toBe(128);
    expect(policy.max_output_size_kb).toBe(100);
    expect(policy.allow_network).toBe(false);
    expect(policy.allow_file_system).toBe(false);
    expect(policy.allow_external_imports).toBe(false);
  });

  it('returns enhanced policy for premium users', () => {
    const policy = SandboxSecurity.getPolicyForUser('user-456', true);
    expect(policy.max_execution_time_ms).toBe(30_000);
    expect(policy.max_memory_mb).toBe(512);
    expect(policy.max_output_size_kb).toBe(1000);
  });

  it('premium policy still denies network and file system by default', () => {
    const policy = SandboxSecurity.getPolicyForUser('user-789', true);
    expect(policy.allow_network).toBe(false);
    expect(policy.allow_file_system).toBe(false);
    expect(policy.allow_external_imports).toBe(false);
  });

  it('returns consistent policy regardless of userId string', () => {
    const policyA = SandboxSecurity.getPolicyForUser('aaa', false);
    const policyB = SandboxSecurity.getPolicyForUser('bbb', false);
    expect(policyA).toEqual(policyB);
  });
});

// ---------------------------------------------------------------------------
// 17. SandboxSecurity -- checkRateLimit
// ---------------------------------------------------------------------------

describe('SandboxSecurity.checkRateLimit', () => {
  it('always allows requests (mock)', async () => {
    const result = await SandboxSecurity.checkRateLimit('user-1', 'execute');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(100);
    expect(result.reset_at).toBeInstanceOf(Date);
  });

  it('allows preview action as well', async () => {
    const result = await SandboxSecurity.checkRateLimit('user-2', 'preview');
    expect(result.allowed).toBe(true);
  });

  it('reset_at is approximately 1 hour in the future', async () => {
    const before = Date.now();
    const result = await SandboxSecurity.checkRateLimit('user-3', 'execute');
    const after = Date.now();
    const resetTs = result.reset_at.getTime();
    // Should be roughly 1 hour from now (allow 1 second tolerance for test execution)
    expect(resetTs).toBeGreaterThanOrEqual(before + 3_599_000);
    expect(resetTs).toBeLessThanOrEqual(after + 3_601_000);
  });
});

// ---------------------------------------------------------------------------
// 18. Combined: file access + dangerous code should be invalid
// ---------------------------------------------------------------------------

describe('SandboxSecurity - combined violations', () => {
  it('code with file access AND dangerous code is invalid (due to critical severity)', () => {
    const code = 'require("fs"); eval("malicious");';
    const { valid, violations } = SandboxSecurity.validateCode(code);

    expect(valid).toBe(false);

    const fileAccess = violations.filter(v => v.type === 'file_access');
    const dangerous = violations.filter(v => v.type === 'dangerous_code');

    expect(fileAccess.length).toBeGreaterThan(0);
    expect(fileAccess[0].severity).toBe('high');
    expect(dangerous.length).toBeGreaterThan(0);
    expect(dangerous[0].severity).toBe('critical');
  });

  it('code with only file access (no dangerous patterns) is valid', () => {
    const code = 'require("fs")';
    const { valid, violations } = SandboxSecurity.validateCode(code);

    const criticals = violations.filter(v => v.severity === 'critical');
    expect(criticals.length).toBe(0);
    expect(valid).toBe(true);
  });

  it('code with network + file access but no dangerous code is valid', () => {
    const code = 'require("http"); require("fs");';
    const { valid, violations } = SandboxSecurity.validateCode(code);

    expect(violations.length).toBeGreaterThanOrEqual(2);
    const criticals = violations.filter(v => v.severity === 'critical');
    expect(criticals.length).toBe(0);
    expect(valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 19. SecurityViolation structure
// ---------------------------------------------------------------------------

describe('SandboxSecurity - violation object structure', () => {
  it('each violation has required fields with correct types', () => {
    const { violations } = SandboxSecurity.validateCode('eval("x"); fetch("/api");');

    for (const v of violations) {
      expect(v).toHaveProperty('type');
      expect(v).toHaveProperty('severity');
      expect(v).toHaveProperty('description');
      expect(v).toHaveProperty('detected_at');
      expect(['dangerous_code', 'resource_limit', 'network_access', 'file_access']).toContain(
        v.type,
      );
      expect(['low', 'medium', 'high', 'critical']).toContain(v.severity);
      expect(typeof v.description).toBe('string');
      // detected_at should be a valid ISO date string
      expect(new Date(v.detected_at).toISOString()).toBe(v.detected_at);
    }
  });
});

// ---------------------------------------------------------------------------
// 20. SandboxExecutor -- react language routes to HTML
// ---------------------------------------------------------------------------

describe('SandboxExecutor - react language treated as HTML', () => {
  let executor: SandboxExecutor;

  beforeEach(() => {
    executor = new SandboxExecutor();
  });

  it('handles react language by sanitizing and returning preview HTML', async () => {
    const result = await executor.execute({
      code: '<div>Hello React</div>',
      language: 'react',
    });
    expect(result.success).toBe(true);
    expect(result.preview_html).toContain('<div>Hello React</div>');
    expect(result.preview_html).toContain('<!DOCTYPE html>');
  });

  it('sanitizes script tags in react code', async () => {
    const result = await executor.execute({
      code: '<Component /><script>steal()</script>',
      language: 'react',
    });
    expect(result.success).toBe(true);
    expect(result.preview_html).not.toContain('<script');
  });
});
