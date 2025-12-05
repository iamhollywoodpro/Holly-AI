/**
 * HOLLY's Automated Testing System
 * 
 * Runs comprehensive tests before code modifications to ensure stability
 * 
 * Phase 5: Code Generation & Modification
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/database/prisma';

const execAsync = promisify(exec);

// ===========================
// Types & Interfaces
// ===========================

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: Test[];
  requiredForDeployment: boolean;
}

export interface Test {
  id: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'typescript' | 'lint' | 'build';
  command: string;
  timeout: number;
  criticalLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface TestResult {
  test: Test;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
  timestamp: Date;
}

export interface TestSuiteResult {
  suite: TestSuite;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  overallPassed: boolean;
}

// ===========================
// Automated Testing System
// ===========================

export class AutomatedTestingSystem {
  private testSuites: TestSuite[];

  constructor() {
    this.testSuites = this.initializeTestSuites();
  }

  /**
   * Initialize all test suites
   */
  private initializeTestSuites(): TestSuite[] {
    return [
      // Critical Pre-Deployment Suite
      {
        id: 'pre-deployment',
        name: 'Pre-Deployment Validation',
        description: 'Critical checks that must pass before any deployment',
        requiredForDeployment: true,
        tests: [
          {
            id: 'typescript-check',
            name: 'TypeScript Compilation',
            type: 'typescript',
            command: 'npx tsc --noEmit',
            timeout: 120000, // 2 minutes
            criticalLevel: 'critical'
          },
          {
            id: 'next-build',
            name: 'Next.js Build',
            type: 'build',
            command: 'npm run build',
            timeout: 300000, // 5 minutes
            criticalLevel: 'critical'
          },
          {
            id: 'prisma-validate',
            name: 'Prisma Schema Validation',
            type: 'integration',
            command: 'npx prisma validate',
            timeout: 30000, // 30 seconds
            criticalLevel: 'high'
          },
          {
            id: 'eslint-check',
            name: 'ESLint',
            type: 'lint',
            command: 'npm run lint',
            timeout: 60000, // 1 minute
            criticalLevel: 'medium'
          }
        ]
      },

      // API Testing Suite
      {
        id: 'api-tests',
        name: 'API Endpoint Tests',
        description: 'Validate all API endpoints are functional',
        requiredForDeployment: false,
        tests: [
          {
            id: 'api-health',
            name: 'Health Check Endpoint',
            type: 'integration',
            command: 'curl -f http://localhost:3000/api/health || exit 1',
            timeout: 10000,
            criticalLevel: 'high'
          }
        ]
      },

      // Database Testing Suite
      {
        id: 'database-tests',
        name: 'Database Tests',
        description: 'Validate database schema and connections',
        requiredForDeployment: false,
        tests: [
          {
            id: 'db-connection',
            name: 'Database Connection',
            type: 'integration',
            command: 'npx prisma db execute --stdin < /dev/null',
            timeout: 15000,
            criticalLevel: 'critical'
          },
          {
            id: 'prisma-generate',
            name: 'Prisma Client Generation',
            type: 'integration',
            command: 'npx prisma generate',
            timeout: 60000,
            criticalLevel: 'high'
          }
        ]
      }
    ];
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(suiteId: string): Promise<TestSuiteResult> {
    const suite = this.testSuites.find(s => s.id === suiteId);
    
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteId}`);
    }

    console.log(`[TESTING] Running suite: ${suite.name}`);
    const startTime = Date.now();
    const results: TestResult[] = [];

    // Run each test sequentially
    for (const test of suite.tests) {
      const result = await this.runTest(test);
      results.push(result);

      // Stop on critical failure
      if (!result.passed && test.criticalLevel === 'critical') {
        console.error(`[TESTING] Critical test failed: ${test.name}`);
        break;
      }
    }

    const duration = Date.now() - startTime;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;
    
    // Suite passes only if all tests pass (or only non-critical tests fail)
    const criticalTests = results.filter(r => r.test.criticalLevel === 'critical');
    const overallPassed = criticalTests.every(r => r.passed);

    const suiteResult: TestSuiteResult = {
      suite,
      results,
      totalTests: results.length,
      passedTests,
      failedTests,
      duration,
      overallPassed
    };

    // Record results in database
    await this.recordTestResults(suiteResult);

    return suiteResult;
  }

  /**
   * Run all pre-deployment tests
   */
  async runPreDeploymentTests(): Promise<TestSuiteResult> {
    console.log('[TESTING] Running pre-deployment validation...');
    return await this.runTestSuite('pre-deployment');
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<TestSuiteResult[]> {
    console.log('[TESTING] Running all test suites...');
    const results: TestSuiteResult[] = [];

    for (const suite of this.testSuites) {
      const result = await this.runTestSuite(suite.id);
      results.push(result);
    }

    return results;
  }

  /**
   * Run a single test
   */
  private async runTest(test: Test): Promise<TestResult> {
    console.log(`[TESTING] Running: ${test.name}`);
    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(test.command, {
        timeout: test.timeout,
        cwd: process.cwd()
      });

      const duration = Date.now() - startTime;
      
      return {
        test,
        passed: true,
        duration,
        output: stdout,
        timestamp: new Date()
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        test,
        passed: false,
        duration,
        error: error.message || 'Test failed',
        output: error.stdout || '',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if code changes are safe to deploy
   */
  async validateDeployment(): Promise<{
    safe: boolean;
    results: TestSuiteResult[];
    blockers: string[];
  }> {
    console.log('[TESTING] Validating deployment safety...');

    const requiredSuites = this.testSuites.filter(s => s.requiredForDeployment);
    const results: TestSuiteResult[] = [];
    const blockers: string[] = [];

    for (const suite of requiredSuites) {
      const result = await this.runTestSuite(suite.id);
      results.push(result);

      if (!result.overallPassed) {
        const failedCritical = result.results
          .filter(r => !r.passed && r.test.criticalLevel === 'critical')
          .map(r => r.test.name);
        
        blockers.push(...failedCritical);
      }
    }

    const safe = blockers.length === 0;

    if (safe) {
      console.log('[TESTING] ✅ Deployment validation PASSED');
    } else {
      console.error('[TESTING] ❌ Deployment validation FAILED');
      console.error('[TESTING] Blockers:', blockers);
    }

    return { safe, results, blockers };
  }

  /**
   * Record test results in database
   */
  private async recordTestResults(suiteResult: TestSuiteResult): Promise<void> {
    try {
      await prisma.experience.create({
        data: {
          action: 'test_suite_run',
          context: {
            suite: {
              id: suiteResult.suite.id,
              name: suiteResult.suite.name
            },
            tests: suiteResult.totalTests,
            duration: suiteResult.duration
          },
          outcome: suiteResult.overallPassed ? 'success' : 'failure',
          results: {
            passed: suiteResult.passedTests,
            failed: suiteResult.failedTests,
            failedTests: suiteResult.results
              .filter(r => !r.passed)
              .map(r => ({
                test: r.test.name,
                error: r.error
              }))
          },
          learnings: suiteResult.overallPassed
            ? [`Test suite ${suiteResult.suite.name} passed successfully`]
            : [`Test suite ${suiteResult.suite.name} failed - ${suiteResult.failedTests} tests failed`]
        }
      });
    } catch (error) {
      console.error('[TESTING] Failed to record test results:', error);
    }
  }

  /**
   * Get test statistics
   */
  async getTestStatistics(): Promise<any> {
    try {
      const experiences = await prisma.experience.findMany({
        where: { action: 'test_suite_run' },
        orderBy: { timestamp: 'desc' },
        take: 50
      });

      const total = experiences.length;
      const successful = experiences.filter(e => e.outcome === 'success').length;
      const successRate = total > 0 ? successful / total : 0;

      return {
        totalRuns: total,
        successfulRuns: successful,
        failedRuns: total - successful,
        successRate,
        recentRuns: experiences.slice(0, 10).map(e => ({
          suite: (e.context as any).suite?.name || 'Unknown',
          outcome: e.outcome,
          timestamp: e.timestamp,
          duration: (e.context as any).duration
        }))
      };
    } catch (error) {
      console.error('[TESTING] Failed to get statistics:', error);
      return {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: 0,
        recentRuns: []
      };
    }
  }

  /**
   * Add a custom test to a suite
   */
  addTest(suiteId: string, test: Test): void {
    const suite = this.testSuites.find(s => s.id === suiteId);
    if (suite) {
      suite.tests.push(test);
      console.log(`[TESTING] Added test '${test.name}' to suite '${suite.name}'`);
    }
  }

  /**
   * Get all test suites
   */
  getTestSuites(): TestSuite[] {
    return this.testSuites;
  }
}

// ===========================
// Export Singleton Instance
// ===========================

export const automatedTesting = new AutomatedTestingSystem();
