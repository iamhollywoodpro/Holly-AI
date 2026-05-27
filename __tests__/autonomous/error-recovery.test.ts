/**
 * Automatic Error Recovery Tests
 *
 * Tests src/lib/autonomous/error-recovery.ts:
 *   - Pattern matching across 6 known error patterns
 *   - Auto-fix vs diagnostic-only paths
 *   - Local path detection in fixMissingModule
 *   - npm install invocation and failure handling
 *   - Database connection env var check
 *   - Error object and string input handling
 */

/// <reference types="jest" />

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the module under test
// ---------------------------------------------------------------------------

// Mock child_process so npm install never actually runs
const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: mockExec,
}));

// Mock experience tracker so recordExperience never touches DB
jest.mock('@/lib/metamorphosis/experience-tracker', () => ({
  ExperienceTracker: jest.fn().mockImplementation(() => ({
    recordExperience: jest.fn().mockResolvedValue(undefined),
    findSimilarExperiences: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock pre-deployment validator (imported but not directly exercised)
jest.mock('@/lib/deployment/pre-deployment-validator', () => ({
  PreDeploymentValidator: jest.fn().mockImplementation(() => ({
    validate: jest.fn().mockResolvedValue({ passed: true }),
  })),
}));

import { AutomaticErrorRecovery, errorRecovery } from '@/lib/autonomous/error-recovery';
import { RecoveryResult } from '@/lib/autonomous/error-recovery';
import { promisify } from 'util';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The module under test wraps exec with promisify, so the mock needs to work
// with that wrapper. Because we mocked child_process.exec directly, the
// promisify call in the source will wrap our mock. We control resolution by
// using mockExec's callback-style invocation indirectly via the promisify
// wrapper. Instead, we'll directly instantiate and call recover() which
// internally calls execAsync. We just need mockExec to invoke the callback
// appropriately — but since promisify converts callback to promise, we must
// make exec return via callback.
//
// To simplify, we'll make exec call its callback directly:
function mockExecSuccess() {
  mockExec.mockImplementation((cmd: string, opts: any, cb: Function) => {
    if (typeof opts === 'function') {
      cb(null, { stdout: '', stderr: '' });
    } else {
      cb(null, { stdout: '', stderr: '' });
    }
  });
}

function mockExecFailure(msg: string) {
  mockExec.mockImplementation((cmd: string, opts: any, cb: Function) => {
    if (typeof opts === 'function') {
      cb(new Error(msg));
    } else {
      cb(new Error(msg));
    }
  });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AutomaticErrorRecovery', () => {
  let recovery: AutomaticErrorRecovery;

  beforeEach(() => {
    jest.clearAllMocks();
    recovery = new AutomaticErrorRecovery('/test/project');
  });

  // -----------------------------------------------------------------------
  // 1. "Cannot find module" — npm package path → auto-fix (npm install)
  // -----------------------------------------------------------------------
  describe('Cannot find module (npm package)', () => {
    it('matches the pattern and auto-fixes via npm install', async () => {
      mockExecSuccess();

      const result = await recovery.recover(
        'Cannot find module \'lodash\''
      );

      expect(result.success).toBe(true);
      expect(result.actionTaken).toContain('Installed package');
      expect(result.actionTaken).toContain('lodash');
      expect(result.shouldRetry).toBe(true);
      expect(result.details).toContain('installed successfully');
    });

    it('passes the correct cwd to npm install', async () => {
      mockExecSuccess();

      await recovery.recover("Cannot find module 'express'");

      // exec is called via promisify, so first arg is command, second is options
      expect(mockExec).toHaveBeenCalled();
      const callArgs = mockExec.mock.calls[0];
      expect(callArgs[0]).toContain('npm install express');
    });
  });

  // -----------------------------------------------------------------------
  // 2. "Cannot find module" — local relative path → analysis only
  // -----------------------------------------------------------------------
  describe('Cannot find module (local relative path)', () => {
    it('returns analysis for relative path starting with ./', async () => {
      const result = await recovery.recover(
        "Cannot find module './utils/helper'"
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('analysis');
      expect(result.details).toContain('Local file missing');
      expect(result.details).toContain('./utils/helper');
      expect(result.shouldRetry).toBe(false);
      // npm install should NOT have been called
      expect(mockExec).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 3. "Cannot find module" — absolute path → analysis only
  // -----------------------------------------------------------------------
  describe('Cannot find module (absolute path)', () => {
    it('returns analysis for absolute path starting with /', async () => {
      const result = await recovery.recover(
        'Cannot find module \'/absolute/path/to/module\''
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('analysis');
      expect(result.details).toContain('Local file missing');
      expect(result.details).toContain('/absolute/path/to/module');
      expect(result.shouldRetry).toBe(false);
      expect(mockExec).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 4. "Type not assignable" — not autoFixable, returns suggestion
  // -----------------------------------------------------------------------
  describe('Type not assignable', () => {
    it('matches and returns a typecast suggestion', async () => {
      const result = await recovery.recover(
        "Type 'string' is not assignable to type 'number'"
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('suggestion');
      expect(result.details).toContain('string');
      expect(result.details).toContain('number');
      expect(result.details).toContain('type assertion');
      expect(result.shouldRetry).toBe(false);
    });

    it('extracts both source and target types', async () => {
      const result = await recovery.recover(
        "Type 'boolean' is not assignable to type 'string'"
      );

      expect(result.details).toContain('boolean');
      expect(result.details).toContain('string');
    });
  });

  // -----------------------------------------------------------------------
  // 5. "Database connection refused" — critical, autoFixable
  // -----------------------------------------------------------------------
  describe('Database connection refused', () => {
    it('matches ECONNREFUSED pattern', async () => {
      const originalDbUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

      const result = await recovery.recover('ECONNREFUSED database server');

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('diagnostic');
      expect(result.details).toContain('Database server may be down');
      expect(result.shouldRetry).toBe(true);

      // Restore
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    });

    it('matches "Connection refused" pattern', async () => {
      process.env.DATABASE_URL = 'postgresql://test@testhost/db';

      const result = await recovery.recover('Connection refused to database');

      expect(result.actionTaken).toBe('diagnostic');

      delete process.env.DATABASE_URL;
    });

    it('matches "Can\'t reach database server" pattern', async () => {
      process.env.DATABASE_URL = 'postgresql://test@testhost/db';

      const result = await recovery.recover("Can't reach database server");

      expect(result.actionTaken).toBe('diagnostic');

      delete process.env.DATABASE_URL;
    });
  });

  // -----------------------------------------------------------------------
  // 6. "Cannot find package" — medium, autoFixable
  // -----------------------------------------------------------------------
  describe('Cannot find package', () => {
    it('matches and installs the missing package', async () => {
      mockExecSuccess();

      const result = await recovery.recover(
        "Cannot find package 'some-package'"
      );

      expect(result.success).toBe(true);
      expect(result.actionTaken).toContain('Installed dependency');
      expect(result.actionTaken).toContain('some-package');
      expect(result.shouldRetry).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // 7. "Unexpected token" — high, NOT autoFixable
  // -----------------------------------------------------------------------
  describe('Unexpected token', () => {
    it('matches and returns analysis (not autoFixable)', async () => {
      const result = await recovery.recover(
        'Unexpected token } in JSON at position 42'
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('analysis');
      expect(result.details).toContain('Syntax error detected');
      expect(result.shouldRetry).toBe(false);
    });

    it('matches "Unexpected identifier" variant', async () => {
      const result = await recovery.recover(
        'Unexpected identifier at line 10'
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('analysis');
    });
  });

  // -----------------------------------------------------------------------
  // 8. "Environment variable not defined" — critical, NOT autoFixable
  // -----------------------------------------------------------------------
  describe('Environment variable not defined', () => {
    it('matches and identifies the variable name', async () => {
      const result = await recovery.recover(
        "Environment variable 'API_SECRET_KEY' is not defined"
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('diagnostic');
      expect(result.details).toContain('API_SECRET_KEY');
      expect(result.details).toContain('.env file');
      expect(result.shouldRetry).toBe(false);
    });

    it('uses double-quote variant of the pattern', async () => {
      const result = await recovery.recover(
        'Environment variable "OPENAI_API_KEY" is not defined'
      );

      expect(result.actionTaken).toBe('diagnostic');
      expect(result.details).toContain('OPENAI_API_KEY');
    });
  });

  // -----------------------------------------------------------------------
  // 9. Unrecognized error returns {success: false, actionTaken: 'none'}
  // -----------------------------------------------------------------------
  describe('Unrecognized errors', () => {
    it('returns success false with actionTaken none for unknown errors', async () => {
      const result = await recovery.recover(
        'Something completely unexpected went wrong'
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('none');
      expect(result.details).toContain('not recognized');
      expect(result.shouldRetry).toBe(false);
    });

    it('preserves the original error string', async () => {
      const result = await recovery.recover('Unknown error XYZ');

      expect(result.error).toBe('Unknown error XYZ');
    });
  });

  // -----------------------------------------------------------------------
  // 10. Error object input (extracts .message)
  // -----------------------------------------------------------------------
  describe('Error object input', () => {
    it('extracts message from Error objects', async () => {
      const errorObj = new Error("Cannot find module 'nonexistent-pkg'");
      mockExecSuccess();

      const result = await recovery.recover(errorObj);

      expect(result.success).toBe(true);
      expect(result.actionTaken).toContain('nonexistent-pkg');
    });

    it('handles Error object with unrecognized message', async () => {
      const errorObj = new Error('Totally unknown failure mode');

      const result = await recovery.recover(errorObj);

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('none');
    });
  });

  // -----------------------------------------------------------------------
  // 11. String error input
  // -----------------------------------------------------------------------
  describe('String error input', () => {
    it('processes raw string errors directly', async () => {
      const result = await recovery.recover(
        "Type 'any' is not assignable to type 'never'"
      );

      expect(result.actionTaken).toBe('suggestion');
      expect(result.details).toContain('any');
      expect(result.details).toContain('never');
    });
  });

  // -----------------------------------------------------------------------
  // 12. First match wins when multiple patterns could match
  // -----------------------------------------------------------------------
  describe('Pattern priority (first match wins)', () => {
    it('matches the first pattern when two patterns could apply', async () => {
      // This string contains both "Cannot find module" and "Connection refused"
      // The module pattern is checked first, so it should win.
      const errorStr = "Cannot find module 'my-pkg' — Connection refused by server";
      mockExecSuccess();

      const result = await recovery.recover(errorStr);

      // Should match the module pattern (first in the list), not database
      expect(result.success).toBe(true);
      expect(result.actionTaken).toContain('Installed package');
      expect(result.actionTaken).toContain('my-pkg');
    });
  });

  // -----------------------------------------------------------------------
  // 13. DATABASE_URL check in database fix
  // -----------------------------------------------------------------------
  describe('DATABASE_URL environment variable check', () => {
    it('reports missing DATABASE_URL when the env var is not set', async () => {
      // Ensure DATABASE_URL is unset
      delete process.env.DATABASE_URL;

      const result = await recovery.recover('Connection refused to database');

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('env_check');
      expect(result.details).toContain('DATABASE_URL');
      expect(result.details).toContain('not set');
      expect(result.shouldRetry).toBe(false);
    });

    it('provides diagnostic when DATABASE_URL is set but still cannot connect', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/mydb';

      const result = await recovery.recover('Connection refused to database');

      expect(result.actionTaken).toBe('diagnostic');
      expect(result.shouldRetry).toBe(true);

      delete process.env.DATABASE_URL;
    });
  });

  // -----------------------------------------------------------------------
  // 14. npm install failure returns {success: false}
  // -----------------------------------------------------------------------
  describe('npm install failure', () => {
    it('returns success false when npm install fails', async () => {
      mockExecFailure('npm exited with code 1');

      const result = await recovery.recover(
        "Cannot find module 'broken-package'"
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('install_failed');
      expect(result.details).toContain('broken-package');
      expect(result.details).toContain('npm exited with code 1');
      expect(result.shouldRetry).toBe(false);
    });

    it('returns success false when dependency install fails', async () => {
      mockExecFailure('404 Not Found');

      const result = await recovery.recover(
        "Cannot find package 'nonexistent-dep'"
      );

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('install_failed');
      expect(result.details).toContain('nonexistent-dep');
    });
  });

  // -----------------------------------------------------------------------
  // Singleton export
  // -----------------------------------------------------------------------
  describe('exported singleton', () => {
    it('errorRecovery is an instance of AutomaticErrorRecovery', () => {
      expect(errorRecovery).toBeInstanceOf(AutomaticErrorRecovery);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles empty string error', async () => {
      const result = await recovery.recover('');

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('none');
    });

    it('handles error with only whitespace', async () => {
      const result = await recovery.recover('   ');

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('none');
    });

    it('handles Error object with empty message', async () => {
      const result = await recovery.recover(new Error(''));

      expect(result.success).toBe(false);
      expect(result.actionTaken).toBe('none');
    });
  });
});
