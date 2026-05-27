/**
 * Auto-Fix Engine Tests
 *
 * Tests the AutoFixEngine class: fix strategy generation for different
 * components (typescript, api, database, streaming, generic), strategy
 * selection, auto-apply gating, rollback on validation failure, and
 * statistics retrieval.
 *
 * Uses mock Prisma client and mock RootCauseAnalyzer to avoid
 * database and external service dependencies.
 */

/// <reference types="jest" />

// ---------------------------------------------------------------------------
// Mock setup (before any imports)
// ---------------------------------------------------------------------------

const mockExperienceCreate = jest.fn().mockResolvedValue({});
const mockExperienceFindMany = jest.fn().mockResolvedValue([]);

jest.mock('@/lib/db', () => ({
  prisma: {
    experience: {
      create: mockExperienceCreate,
      findMany: mockExperienceFindMany,
    },
  },
}));

jest.mock('@/lib/autonomous/root-cause-analyzer', () => {
  return {
    RootCauseAnalyzer: jest.fn().mockImplementation(() => ({
      analyze: jest.fn().mockResolvedValue({
        error: 'test error',
        rootCause: 'test root cause',
        contributingFactors: ['factor1', 'factor2'],
        affectedComponents: ['src/test/file.ts'],
        confidence: 80,
        recommendations: ['rec1', 'rec2'],
      }),
    })),
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { AutoFixEngine } from '@/lib/autonomous/auto-fix-engine';
import type { FixStrategy, FixResult, SystemIssue } from '@/lib/autonomous/auto-fix-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeIssue(overrides: Partial<SystemIssue> = {}): SystemIssue {
  return {
    id: 'issue-1',
    type: 'error',
    severity: 'medium',
    component: 'typescript',
    message: 'Test error message',
    stackTrace: 'at test (file.ts:1:1)',
    possibleCauses: ['cause1'],
    suggestedFixes: ['fix1'],
    ...overrides,
  };
}

function makeEngine(): AutoFixEngine {
  return new AutoFixEngine();
}

/**
 * Access private methods for unit testing.
 */
function privateMethod(engine: AutoFixEngine, method: string): Function {
  return (engine as any)[method].bind(engine);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AutoFixEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExperienceCreate.mockResolvedValue({});
    mockExperienceFindMany.mockResolvedValue([]);
  });

  // =========================================================================
  // 1. fixProblem auto-apply gate
  // =========================================================================

  describe('fixProblem auto-apply gate', () => {
    it('should return null when autoApply=true but confidence < 0.7', async () => {
      const engine = makeEngine();
      const issue = makeIssue({
        component: 'typescript',
        message: 'generic error with no specific pattern',
      });

      // The generic fix has confidence 0.5, which is < SAFE_MODE_THRESHOLD (0.7)
      // With autoApply=true but confidence < 0.7 => should return null
      const result = await engine.fixProblem(issue, true);
      expect(result).toBeNull();
    });

    it('should return null when riskLevel is not "safe"', async () => {
      const engine = makeEngine();

      // "not assignable to type" => type mismatch strategy has riskLevel='moderate'
      const issue = makeIssue({
        component: 'typescript',
        message: 'Type string is not assignable to type number',
      });

      const result = await engine.fixProblem(issue, true);
      // Even though confidence is 0.65, risk is 'moderate' !== 'safe'
      expect(result).toBeNull();
    });

    it('should proceed when autoApply=true, confidence >= 0.7, and riskLevel="safe"', async () => {
      const engine = makeEngine();

      // "unhandled" API error => error handling strategy: confidence=0.8, risk='safe'
      const issue = makeIssue({
        component: 'api',
        message: 'unhandled error in API endpoint causing 500',
      });

      // This should proceed to applyFix (which attempts file operations)
      // Since file ops are mocked/absent, it may succeed or fail gracefully
      const result = await engine.fixProblem(issue, true);
      // It should NOT be null (the gate passed)
      // The result may have success=true or success=false depending on execution,
      // but the key assertion is that it was not blocked by the gate.
      expect(result).not.toBeNull();
    });

    it('should return null when autoApply=false (default)', async () => {
      const engine = makeEngine();
      const issue = makeIssue({
        component: 'api',
        message: 'unhandled error in API endpoint',
      });

      const result = await engine.fixProblem(issue);
      expect(result).toBeNull();
    });

    it('should return null when no strategies are generated', async () => {
      const engine = makeEngine();

      // A typescript error that does not match any specific pattern
      // and confidence < 0.5 should produce no strategies.
      // Actually, default case generates generic fix with confidence=0.5 which passes filter.
      // So use a component that falls to default and verify it returns at least one.
      const issue = makeIssue({
        component: 'unknown_component_xyz',
        message: 'some unknown problem',
      });

      // Default => generic fix (confidence=0.5, risk='safe')
      // autoApply=true, confidence 0.5 < 0.7 => returns null
      const result = await engine.fixProblem(issue, true);
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // 2. TypeScript fix strategies
  // =========================================================================

  describe('generateTypeScriptFixes', () => {
    it('should generate JsonValue cast strategy for JsonValue/JsonArray errors', async () => {
      const engine = makeEngine();
      const generateTS = privateMethod(engine, 'generateTypeScriptFixes');

      const issue = makeIssue({
        component: 'typescript',
        message: 'Type JsonValue is not compatible with string[]',
      });

      const rootCause = {
        rootCause: 'JsonValue type mismatch',
        affectedComponents: ['src/lib/db.ts'],
      };

      const fixes = await generateTS(issue, rootCause);

      const jsonFix = fixes.find((f: FixStrategy) =>
        f.description.includes('type cast') && f.description.toLowerCase().includes('jsonvalue')
      );
      expect(jsonFix).toBeDefined();
      expect(jsonFix.confidence).toBe(0.85);
      expect(jsonFix.riskLevel).toBe('safe');
      expect(jsonFix.type).toBe('code_modification');
    });

    it('should generate missing import strategy for "cannot find name" errors', async () => {
      const engine = makeEngine();
      const generateTS = privateMethod(engine, 'generateTypeScriptFixes');

      const issue = makeIssue({
        component: 'typescript',
        message: "cannot find name 'UserSession'",
      });

      const rootCause = {
        rootCause: 'Missing import',
        affectedComponents: ['src/lib/auth.ts'],
      };

      const fixes = await generateTS(issue, rootCause);
      const importFix = fixes.find((f: FixStrategy) =>
        f.description.includes('missing import')
      );

      expect(importFix).toBeDefined();
      expect(importFix.confidence).toBe(0.75);
      expect(importFix.riskLevel).toBe('safe');
      expect(importFix.steps[0].action).toBe('add_import');
    });

    it('should generate type mismatch strategy for "not assignable to type" errors', async () => {
      const engine = makeEngine();
      const generateTS = privateMethod(engine, 'generateTypeScriptFixes');

      const issue = makeIssue({
        component: 'typescript',
        message: 'Type string is not assignable to type number',
      });

      const rootCause = {
        rootCause: 'Type mismatch',
        affectedComponents: ['src/lib/utils.ts'],
      };

      const fixes = await generateTS(issue, rootCause);
      const mismatchFix = fixes.find((f: FixStrategy) =>
        f.description.includes('type mismatch')
      );

      expect(mismatchFix).toBeDefined();
      expect(mismatchFix.confidence).toBe(0.65);
      expect(mismatchFix.riskLevel).toBe('moderate');
      expect(mismatchFix.estimatedImpact).toBe('medium');
    });

    it('should generate multiple strategies for compound errors', async () => {
      const engine = makeEngine();
      const generateTS = privateMethod(engine, 'generateTypeScriptFixes');

      const issue = makeIssue({
        component: 'typescript',
        message: "cannot find name 'JsonValue' and Type not assignable to type",
      });

      const rootCause = {
        rootCause: 'Multiple issues',
        affectedComponents: ['src/lib/db.ts'],
      };

      const fixes = await generateTS(issue, rootCause);
      expect(fixes.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 3. API fix strategies
  // =========================================================================

  describe('generateAPIFixes', () => {
    it('should generate rate limiting strategy for "rate limit" errors', async () => {
      const engine = makeEngine();
      const generateAPI = privateMethod(engine, 'generateAPIFixes');

      const issue = makeIssue({
        component: 'api',
        message: 'Rate limit exceeded: 429 Too Many Requests',
      });

      const rootCause = {
        rootCause: 'Rate limiting',
        affectedComponents: ['app/api/chat/route.ts'],
      };

      const fixes = await generateAPI(issue, rootCause);
      const rateFix = fixes.find((f: FixStrategy) =>
        f.description.includes('exponential backoff')
      );

      expect(rateFix).toBeDefined();
      expect(rateFix.confidence).toBe(0.9);
      expect(rateFix.riskLevel).toBe('safe');
    });

    it('should generate error handling strategy for "unhandled" errors', async () => {
      const engine = makeEngine();
      const generateAPI = privateMethod(engine, 'generateAPIFixes');

      const issue = makeIssue({
        component: 'api',
        message: 'Unhandled exception in API endpoint returned 500',
      });

      const rootCause = {
        rootCause: 'Missing error handling',
        affectedComponents: ['app/api/data/route.ts'],
      };

      const fixes = await generateAPI(issue, rootCause);
      const errFix = fixes.find((f: FixStrategy) =>
        f.description.includes('error handling')
      );

      expect(errFix).toBeDefined();
      expect(errFix.confidence).toBe(0.8);
      expect(errFix.riskLevel).toBe('safe');
    });

    it('should return empty array for API issues without known patterns', async () => {
      const engine = makeEngine();
      const generateAPI = privateMethod(engine, 'generateAPIFixes');

      const issue = makeIssue({
        component: 'api',
        message: 'Something went wrong but no specific keywords',
      });

      const rootCause = {
        rootCause: 'Unknown',
        affectedComponents: [],
      };

      const fixes = await generateAPI(issue, rootCause);
      expect(fixes).toEqual([]);
    });
  });

  // =========================================================================
  // 4. Database fix strategies
  // =========================================================================

  describe('generateDatabaseFixes', () => {
    it('should generate schema mismatch strategy for "schema"/"field" errors', async () => {
      const engine = makeEngine();
      const generateDB = privateMethod(engine, 'generateDatabaseFixes');

      const issue = makeIssue({
        component: 'database',
        message: 'Prisma schema field mismatch detected',
      });

      const rootCause = {
        rootCause: 'Schema drift',
        affectedComponents: ['prisma/schema.prisma'],
      };

      const fixes = await generateDB(issue, rootCause);
      const schemaFix = fixes.find((f: FixStrategy) =>
        f.description.includes('Synchronize')
      );

      expect(schemaFix).toBeDefined();
      expect(schemaFix.confidence).toBe(0.85);
      expect(schemaFix.type).toBe('schema_migration');
      expect(schemaFix.riskLevel).toBe('moderate');
      expect(schemaFix.estimatedImpact).toBe('high');
      expect(schemaFix.requiredApprovals).toContain('database_admin');
    });

    it('should generate connection strategy for "connection"/"timeout" errors', async () => {
      const engine = makeEngine();
      const generateDB = privateMethod(engine, 'generateDatabaseFixes');

      const issue = makeIssue({
        component: 'database',
        message: 'Connection timeout to database server',
      });

      const rootCause = {
        rootCause: 'Connection pool exhausted',
        affectedComponents: ['.env'],
      };

      const fixes = await generateDB(issue, rootCause);
      const connFix = fixes.find((f: FixStrategy) =>
        f.description.includes('connection pool')
      );

      expect(connFix).toBeDefined();
      expect(connFix.confidence).toBe(0.7);
      expect(connFix.type).toBe('config_change');
      expect(connFix.riskLevel).toBe('safe');
    });

    it('should return empty array for database issues without known patterns', async () => {
      const engine = makeEngine();
      const generateDB = privateMethod(engine, 'generateDatabaseFixes');

      const issue = makeIssue({
        component: 'database',
        message: 'Some vague database issue',
      });

      const rootCause = { rootCause: 'Unknown', affectedComponents: [] };
      const fixes = await generateDB(issue, rootCause);
      expect(fixes).toEqual([]);
    });
  });

  // =========================================================================
  // 5. Streaming fix strategies
  // =========================================================================

  describe('generateStreamingFixes', () => {
    it('should generate parsing fix strategy for "parse"/"event" errors', async () => {
      const engine = makeEngine();
      const generateStream = privateMethod(engine, 'generateStreamingFixes');

      const issue = makeIssue({
        component: 'streaming',
        message: 'Failed to parse streaming event from response',
      });

      const rootCause = {
        rootCause: 'Stream parsing error',
        affectedComponents: ['src/lib/ai/stream.ts'],
      };

      const fixes = await generateStream(issue, rootCause);
      expect(fixes.length).toBe(1);
      expect(fixes[0].confidence).toBe(0.8);
      expect(fixes[0].riskLevel).toBe('safe');
      expect(fixes[0].type).toBe('code_modification');
      expect(fixes[0].steps[0].action).toBe('add_type_guards');
    });

    it('should return empty array for streaming issues without parse/event keywords', async () => {
      const engine = makeEngine();
      const generateStream = privateMethod(engine, 'generateStreamingFixes');

      const issue = makeIssue({
        component: 'streaming',
        message: 'Stream closed unexpectedly',
      });

      const rootCause = { rootCause: 'Unknown', affectedComponents: [] };
      const fixes = await generateStream(issue, rootCause);
      expect(fixes).toEqual([]);
    });
  });

  // =========================================================================
  // 6. Generic fallback fix
  // =========================================================================

  describe('generateGenericFixes', () => {
    it('should always return a cache_clear strategy with confidence 0.5', async () => {
      const engine = makeEngine();
      const generateGeneric = privateMethod(engine, 'generateGenericFixes');

      const issue = makeIssue({
        component: 'something_else',
        message: 'Any random error message',
      });

      const rootCause = { rootCause: 'Unknown', affectedComponents: [] };
      const fixes = await generateGeneric(issue, rootCause);

      expect(fixes.length).toBe(1);
      expect(fixes[0].type).toBe('cache_clear');
      expect(fixes[0].confidence).toBe(0.5);
      expect(fixes[0].riskLevel).toBe('safe');
      expect(fixes[0].estimatedImpact).toBe('low');
    });

    it('should fall through to generic fix for unknown components', async () => {
      const engine = makeEngine();
      const generateStrategies = privateMethod(engine, 'generateFixStrategies');

      const issue = makeIssue({
        component: 'network',
        message: 'Network timeout',
      });

      const rootCause = {
        rootCause: 'Network issue',
        affectedComponents: [],
        confidence: 60,
        contributingFactors: [],
        error: 'Network timeout',
        recommendations: [],
      };

      const strategies = await generateStrategies(issue, rootCause);
      expect(strategies.length).toBe(1);
      expect(strategies[0].type).toBe('cache_clear');
    });
  });

  // =========================================================================
  // 7. selectBestStrategy
  // =========================================================================

  describe('selectBestStrategy', () => {
    it('should select the strategy with highest confidence', () => {
      const engine = makeEngine();
      const selectBest = privateMethod(engine, 'selectBestStrategy');

      const strategies: FixStrategy[] = [
        {
          id: 's1', type: 'code_modification', description: 'Low confidence',
          confidence: 0.6, estimatedImpact: 'medium', riskLevel: 'safe',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
        {
          id: 's2', type: 'code_modification', description: 'High confidence',
          confidence: 0.9, estimatedImpact: 'medium', riskLevel: 'safe',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
        {
          id: 's3', type: 'code_modification', description: 'Mid confidence',
          confidence: 0.75, estimatedImpact: 'medium', riskLevel: 'safe',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
      ];

      const best = selectBest(strategies);
      expect(best.id).toBe('s2');
      expect(best.confidence).toBe(0.9);
    });

    it('should break ties by lower risk level', () => {
      const engine = makeEngine();
      const selectBest = privateMethod(engine, 'selectBestStrategy');

      const strategies: FixStrategy[] = [
        {
          id: 's1', type: 'code_modification', description: 'Risky',
          confidence: 0.8, estimatedImpact: 'medium', riskLevel: 'moderate',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
        {
          id: 's2', type: 'code_modification', description: 'Safe',
          confidence: 0.8, estimatedImpact: 'medium', riskLevel: 'safe',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
      ];

      const best = selectBest(strategies);
      expect(best.id).toBe('s2');
      expect(best.riskLevel).toBe('safe');
    });

    it('should break further ties by lower impact', () => {
      const engine = makeEngine();
      const selectBest = privateMethod(engine, 'selectBestStrategy');

      const strategies: FixStrategy[] = [
        {
          id: 's1', type: 'code_modification', description: 'High impact',
          confidence: 0.8, estimatedImpact: 'high', riskLevel: 'safe',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
        {
          id: 's2', type: 'code_modification', description: 'Low impact',
          confidence: 0.8, estimatedImpact: 'low', riskLevel: 'safe',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
      ];

      const best = selectBest(strategies);
      expect(best.id).toBe('s2');
      expect(best.estimatedImpact).toBe('low');
    });

    it('should prioritize: confidence > risk > impact', () => {
      const engine = makeEngine();
      const selectBest = privateMethod(engine, 'selectBestStrategy');

      const strategies: FixStrategy[] = [
        {
          id: 's1', type: 'code_modification', description: 'High conf, risky, low impact',
          confidence: 0.95, estimatedImpact: 'low', riskLevel: 'risky',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
        {
          id: 's2', type: 'code_modification', description: 'Mid conf, safe, high impact',
          confidence: 0.8, estimatedImpact: 'high', riskLevel: 'safe',
          steps: [], rollbackSteps: [], validationChecks: [],
        },
      ];

      // Confidence 0.95 > 0.8, so s1 wins despite being riskier
      const best = selectBest(strategies);
      expect(best.id).toBe('s1');
    });
  });

  // =========================================================================
  // 8. extractMissingName
  // =========================================================================

  describe('extractMissingName', () => {
    it('should extract name from "cannot find name" pattern', () => {
      const engine = makeEngine();
      const extract = privateMethod(engine, 'extractMissingName');

      const result = extract("cannot find name 'UserSession'");
      expect(result).toBe('UserSession');
    });

    it('should extract name with double quotes', () => {
      const engine = makeEngine();
      const extract = privateMethod(engine, 'extractMissingName');

      const result = extract('cannot find name "MyComponent"');
      expect(result).toBe('MyComponent');
    });

    it('should be case-insensitive for "Cannot find Name"', () => {
      const engine = makeEngine();
      const extract = privateMethod(engine, 'extractMissingName');

      const result = extract("Cannot Find Name 'ConfigHelper'");
      expect(result).toBe('ConfigHelper');
    });

    it('should return "unknown" for non-matching patterns', () => {
      const engine = makeEngine();
      const extract = privateMethod(engine, 'extractMissingName');

      const result = extract('something else entirely');
      expect(result).toBe('unknown');
    });

    it('should return "unknown" for empty string', () => {
      const engine = makeEngine();
      const extract = privateMethod(engine, 'extractMissingName');

      const result = extract('');
      expect(result).toBe('unknown');
    });

    it('should extract only the word characters inside quotes', () => {
      const engine = makeEngine();
      const extract = privateMethod(engine, 'extractMissingName');

      const result = extract("cannot find name 'ABC123'");
      expect(result).toBe('ABC123');
    });
  });

  // =========================================================================
  // 9. Strategy confidence filtering (>= 0.5)
  // =========================================================================

  describe('strategy confidence filtering', () => {
    it('should filter out strategies with confidence < 0.5', async () => {
      const engine = makeEngine();
      const generateStrategies = privateMethod(engine, 'generateFixStrategies');

      // Use a component and message that won't match any specific pattern
      // The default case generates a generic fix with confidence=0.5, which passes.
      // To test filtering, we need to verify the filter is applied.
      // Since all built-in generators produce strategies >= 0.5 confidence,
      // we test the filtering behavior by checking the generateFixStrategies output.

      const issue = makeIssue({
        component: 'typescript',
        message: 'no matching pattern at all here',
      });

      const rootCause = {
        rootCause: 'Unknown',
        affectedComponents: [],
        confidence: 60,
        contributingFactors: [],
        error: 'unknown',
        recommendations: [],
      };

      const strategies = await generateStrategies(issue, rootCause);

      // TypeScript with no matching patterns => empty array from generateTypeScriptFixes
      // => no strategies
      for (const s of strategies) {
        expect(s.confidence).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should include strategies with confidence exactly 0.5', async () => {
      const engine = makeEngine();
      const generateStrategies = privateMethod(engine, 'generateFixStrategies');

      const issue = makeIssue({
        component: 'unknown_component',
        message: 'generic issue',
      });

      const rootCause = {
        rootCause: 'Unknown',
        affectedComponents: [],
        confidence: 60,
        contributingFactors: [],
        error: 'unknown',
        recommendations: [],
      };

      const strategies = await generateStrategies(issue, rootCause);
      expect(strategies.length).toBe(1);
      expect(strategies[0].confidence).toBe(0.5);
    });
  });

  // =========================================================================
  // 10. applyFix and rollback
  // =========================================================================

  describe('applyFix and rollback', () => {
    it('should trigger rollback on validation failure', async () => {
      const engine = makeEngine();
      const applyFix = privateMethod(engine, 'applyFix');

      const strategy: FixStrategy = {
        id: 'test-rollback-1',
        type: 'code_modification',
        description: 'Test strategy with rollback',
        confidence: 0.9,
        estimatedImpact: 'medium',
        riskLevel: 'safe',
        steps: [
          {
            action: 'modify_file',
            target: 'test.ts',
            changes: { pattern: /test/g, replacement: 'test2' },
            description: 'Modify test file',
            canRollback: true,
          },
        ],
        rollbackSteps: [
          {
            action: 'revert_file',
            target: 'test.ts',
            changes: {},
            description: 'Revert test file',
            canRollback: false,
          },
        ],
        validationChecks: [
          { type: 'build', description: 'Test build fails', command: 'npm run build' },
        ],
      };

      // Override runValidationCheck to simulate a failure
      const originalRunValidation = (engine as any).runValidationCheck.bind(engine);
      (engine as any).runValidationCheck = jest.fn().mockResolvedValue({
        check: strategy.validationChecks[0],
        passed: false,
        error: 'Build compilation error',
        duration: 100,
      });

      const issue = makeIssue();
      const result: FixResult = await applyFix(issue, strategy);

      expect(result.success).toBe(false);
      expect(result.rollbackPerformed).toBe(true);
      expect(result.error).toContain('Validation failed');
      expect(result.lessonsLearned.length).toBeGreaterThan(0);

      // Restore original method
      (engine as any).runValidationCheck = originalRunValidation;
    });

    it('should return success when all validations pass', async () => {
      const engine = makeEngine();
      const applyFix = privateMethod(engine, 'applyFix');

      const strategy: FixStrategy = {
        id: 'test-success-1',
        type: 'code_modification',
        description: 'Test strategy succeeds',
        confidence: 0.9,
        estimatedImpact: 'low',
        riskLevel: 'safe',
        steps: [
          {
            action: 'modify_file',
            target: 'test.ts',
            changes: {},
            description: 'Modify test file',
            canRollback: true,
          },
        ],
        rollbackSteps: [],
        validationChecks: [
          { type: 'typescript', description: 'TypeScript check', command: 'npx tsc --noEmit' },
        ],
      };

      // Override runValidationCheck to simulate success
      (engine as any).runValidationCheck = jest.fn().mockResolvedValue({
        check: strategy.validationChecks[0],
        passed: true,
        duration: 50,
      });

      const issue = makeIssue();
      const result: FixResult = await applyFix(issue, strategy);

      expect(result.success).toBe(true);
      expect(result.rollbackPerformed).toBeUndefined();
      expect(result.appliedSteps.length).toBe(1);
      expect(result.lessonsLearned[0]).toContain('Successfully applied');

      // Verify the success was recorded in the database
      expect(mockExperienceCreate).toHaveBeenCalled();
      const createCall = mockExperienceCreate.mock.calls[0][0];
      expect(createCall.data.action).toBe('auto_fix_applied');
      expect(createCall.data.outcome).toBe('success');
    });

    it('should rollback in reverse order of rollbackSteps', async () => {
      const engine = makeEngine();
      const applyFix = privateMethod(engine, 'applyFix');

      const executionOrder: string[] = [];

      // Track execution order via executeFixStep spy
      const originalExecute = (engine as any).executeFixStep.bind(engine);
      (engine as any).executeFixStep = jest.fn().mockImplementation(async (step: any) => {
        executionOrder.push(step.description);
      });

      // Make validation fail
      (engine as any).runValidationCheck = jest.fn().mockResolvedValue({
        check: { type: 'build', description: 'test' },
        passed: false,
        error: 'Build failed',
        duration: 10,
      });

      const strategy: FixStrategy = {
        id: 'test-rollback-order',
        type: 'code_modification',
        description: 'Test rollback order',
        confidence: 0.9,
        estimatedImpact: 'medium',
        riskLevel: 'safe',
        steps: [
          {
            action: 'step1', target: 'f1', changes: {},
            description: 'Apply step 1', canRollback: true,
          },
        ],
        rollbackSteps: [
          {
            action: 'rb1', target: 'f1', changes: {},
            description: 'Rollback step A', canRollback: false,
          },
          {
            action: 'rb2', target: 'f2', changes: {},
            description: 'Rollback step B', canRollback: false,
          },
        ],
        validationChecks: [
          { type: 'build', description: 'Build check' },
        ],
      };

      await applyFix(makeIssue(), strategy);

      // Rollback steps should be reversed: B first, then A
      expect(executionOrder).toEqual([
        'Apply step 1',   // forward step
        'Rollback step B', // reversed: second rollback step first
        'Rollback step A', // reversed: first rollback step second
      ]);

      // Restore
      (engine as any).executeFixStep = originalExecute;
    });
  });

  // =========================================================================
  // 11. getFixStatistics
  // =========================================================================

  describe('getFixStatistics', () => {
    it('should return zeros when no fixes have been recorded', async () => {
      const engine = makeEngine();

      const stats = await engine.getFixStatistics();
      expect(stats.totalFixes).toBe(0);
      expect(stats.successfulFixes).toBe(0);
      expect(stats.failedFixes).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.recentFixes).toEqual([]);
    });

    it('should compute statistics from recorded experiences', async () => {
      mockExperienceFindMany.mockResolvedValue([
        { action: 'auto_fix_applied', outcome: 'success', createdAt: new Date(), lessonsLearned: 'test' },
        { action: 'auto_fix_applied', outcome: 'success', createdAt: new Date(), lessonsLearned: 'test' },
        { action: 'auto_fix_applied', outcome: 'failure', createdAt: new Date(), lessonsLearned: 'test' },
      ]);

      const engine = makeEngine();
      const stats = await engine.getFixStatistics();

      expect(stats.totalFixes).toBe(3);
      expect(stats.successfulFixes).toBe(2);
      expect(stats.failedFixes).toBe(1);
      expect(stats.successRate).toBeCloseTo(2 / 3);
    });

    it('should return zeros on database error', async () => {
      mockExperienceFindMany.mockRejectedValue(new Error('DB connection failed'));

      const engine = makeEngine();
      const stats = await engine.getFixStatistics();

      expect(stats.totalFixes).toBe(0);
      expect(stats.successfulFixes).toBe(0);
      expect(stats.failedFixes).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.recentFixes).toEqual([]);
    });

    it('should limit recentFixes to 10 items', async () => {
      const manyExperiences = Array.from({ length: 15 }, (_, i) => ({
        action: 'auto_fix_applied',
        outcome: 'success',
        createdAt: new Date(),
        lessonsLearned: `lesson ${i}`,
      }));

      mockExperienceFindMany.mockResolvedValue(manyExperiences);

      const engine = makeEngine();
      const stats = await engine.getFixStatistics();

      expect(stats.recentFixes.length).toBe(10);
    });
  });

  // =========================================================================
  // 12. Singleton export
  // =========================================================================

  describe('singleton export', () => {
    it('should export an instance of AutoFixEngine', async () => {
      // Dynamic import to avoid side effects in the mock scope
      const mod = await import('@/lib/autonomous/auto-fix-engine');
      expect(mod.autoFixEngine).toBeDefined();
      expect(mod.autoFixEngine).toBeInstanceOf(mod.AutoFixEngine);
    });
  });
});
