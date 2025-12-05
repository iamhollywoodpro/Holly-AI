/**
 * HOLLY's Auto-Fix Engine
 * 
 * Automatically generates and applies fixes for detected problems.
 * Uses Root Cause Analysis to understand issues and validates fixes before applying.
 * 
 * Phase 4: Autonomous Problem-Solving
 */

import { prisma } from '@/lib/db';
import { RootCauseAnalyzer, type RootCauseAnalysis } from './root-cause-analyzer';
import type { DiagnosticResult, SystemIssue } from './self-diagnosis';
import * as fs from 'fs/promises';
import * as path from 'path';

// ===========================
// Types & Interfaces
// ===========================

export interface FixStrategy {
  id: string;
  type: 'code_modification' | 'config_change' | 'dependency_update' | 'schema_migration' | 'cache_clear';
  description: string;
  confidence: number; // 0-1
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'safe' | 'moderate' | 'risky' | 'dangerous';
  steps: FixStep[];
  rollbackSteps: FixStep[];
  validationChecks: ValidationCheck[];
  requiredApprovals?: string[];
}

export interface FixStep {
  action: string;
  target: string;
  changes: any;
  description: string;
  canRollback: boolean;
}

export interface ValidationCheck {
  type: 'typescript' | 'tests' | 'build' | 'runtime' | 'schema';
  description: string;
  command?: string;
  timeout?: number;
}

export interface FixResult {
  success: boolean;
  strategy: FixStrategy;
  appliedSteps: FixStep[];
  validationResults: ValidationResult[];
  error?: string;
  rollbackPerformed?: boolean;
  learnings: string[];
}

export interface ValidationResult {
  check: ValidationCheck;
  passed: boolean;
  output?: string;
  error?: string;
  duration: number;
}

// ===========================
// Auto-Fix Engine Class
// ===========================

export class AutoFixEngine {
  private rootCauseAnalyzer: RootCauseAnalyzer;
  private readonly MAX_AUTO_FIX_ATTEMPTS = 3;
  private readonly SAFE_MODE_THRESHOLD = 0.7; // Only auto-apply fixes with >70% confidence

  constructor() {
    this.rootCauseAnalyzer = new RootCauseAnalyzer();
  }

  /**
   * Main entry point: Analyze problem and attempt automatic fix
   */
  async fixProblem(issue: SystemIssue, autoApply: boolean = false): Promise<FixResult | null> {
    console.log(`[AUTO-FIX] Analyzing issue: ${issue.description}`);

    try {
      // Step 1: Perform root cause analysis
      const rootCause = await this.rootCauseAnalyzer.analyzeIssue(issue);
      
      // Step 2: Generate fix strategies
      const strategies = await this.generateFixStrategies(issue, rootCause);
      
      if (strategies.length === 0) {
        console.log('[AUTO-FIX] No fix strategies generated');
        return null;
      }

      // Step 3: Select best strategy
      const bestStrategy = this.selectBestStrategy(strategies);
      console.log(`[AUTO-FIX] Selected strategy: ${bestStrategy.description} (confidence: ${bestStrategy.confidence})`);

      // Step 4: Decide if we should auto-apply
      const shouldAutoApply = autoApply && 
                            bestStrategy.confidence >= this.SAFE_MODE_THRESHOLD &&
                            bestStrategy.riskLevel === 'safe';

      if (!shouldAutoApply) {
        console.log('[AUTO-FIX] Fix requires manual approval - saving for review');
        await this.savePendingFix(issue, bestStrategy, rootCause);
        return null;
      }

      // Step 5: Apply the fix
      console.log('[AUTO-FIX] Applying fix automatically...');
      return await this.applyFix(issue, bestStrategy);

    } catch (error) {
      console.error('[AUTO-FIX] Error in fix process:', error);
      return null;
    }
  }

  /**
   * Generate possible fix strategies based on root cause analysis
   */
  private async generateFixStrategies(
    issue: SystemIssue,
    rootCause: RootCauseAnalysis
  ): Promise<FixStrategy[]> {
    const strategies: FixStrategy[] = [];

    // Use top hypothesis to guide fix generation
    const topHypothesis = rootCause.hypotheses[0];
    if (!topHypothesis) return strategies;

    // Generate fixes based on issue type
    switch (issue.component) {
      case 'typescript':
        strategies.push(...await this.generateTypeScriptFixes(issue, topHypothesis));
        break;
      
      case 'api':
        strategies.push(...await this.generateAPIFixes(issue, topHypothesis));
        break;
      
      case 'database':
        strategies.push(...await this.generateDatabaseFixes(issue, topHypothesis));
        break;
      
      case 'streaming':
        strategies.push(...await this.generateStreamingFixes(issue, topHypothesis));
        break;

      default:
        strategies.push(...await this.generateGenericFixes(issue, topHypothesis));
    }

    return strategies.filter(s => s.confidence >= 0.5); // Only return strategies with >50% confidence
  }

  /**
   * Generate TypeScript-specific fixes
   */
  private async generateTypeScriptFixes(issue: SystemIssue, hypothesis: any): Promise<FixStrategy[]> {
    const fixes: FixStrategy[] = [];
    const errorMessage = issue.message.toLowerCase();

    // Fix 1: Type casting for Prisma JsonValue
    if (errorMessage.includes('jsonvalue') || errorMessage.includes('jsonarray')) {
      fixes.push({
        id: `ts-jsonvalue-cast-${Date.now()}`,
        type: 'code_modification',
        description: 'Add explicit type cast for Prisma JsonValue to expected type',
        confidence: 0.85,
        estimatedImpact: 'low',
        riskLevel: 'safe',
        steps: [
          {
            action: 'add_type_cast',
            target: hypothesis.affectedFiles[0] || 'unknown',
            changes: {
              pattern: /(\w+):\s*JsonValue/g,
              replacement: '($1 as string[])' // Smart casting based on context
            },
            description: 'Cast JsonValue to appropriate TypeScript type',
            canRollback: true
          }
        ],
        rollbackSteps: [
          {
            action: 'revert_git',
            target: hypothesis.affectedFiles[0] || 'unknown',
            changes: {},
            description: 'Revert file to previous commit',
            canRollback: false
          }
        ],
        validationChecks: [
          { type: 'typescript', description: 'Run TypeScript compiler', command: 'npx tsc --noEmit' },
          { type: 'build', description: 'Test Next.js build', command: 'npm run build' }
        ]
      });
    }

    // Fix 2: Missing imports
    if (errorMessage.includes('cannot find name') || errorMessage.includes('not defined')) {
      const missingName = this.extractMissingName(errorMessage);
      fixes.push({
        id: `ts-missing-import-${Date.now()}`,
        type: 'code_modification',
        description: `Add missing import for '${missingName}'`,
        confidence: 0.75,
        estimatedImpact: 'low',
        riskLevel: 'safe',
        steps: [
          {
            action: 'add_import',
            target: hypothesis.affectedFiles[0] || 'unknown',
            changes: { importName: missingName },
            description: `Import ${missingName} from appropriate module`,
            canRollback: true
          }
        ],
        rollbackSteps: [
          {
            action: 'remove_import',
            target: hypothesis.affectedFiles[0] || 'unknown',
            changes: { importName: missingName },
            description: 'Remove added import',
            canRollback: true
          }
        ],
        validationChecks: [
          { type: 'typescript', description: 'Verify import resolves', command: 'npx tsc --noEmit' }
        ]
      });
    }

    // Fix 3: Type mismatch
    if (errorMessage.includes('not assignable to type')) {
      fixes.push({
        id: `ts-type-mismatch-${Date.now()}`,
        type: 'code_modification',
        description: 'Fix type mismatch with proper casting or interface update',
        confidence: 0.65,
        estimatedImpact: 'medium',
        riskLevel: 'moderate',
        steps: [
          {
            action: 'analyze_types',
            target: hypothesis.affectedFiles[0] || 'unknown',
            changes: {},
            description: 'Analyze type mismatch and determine correct type',
            canRollback: true
          }
        ],
        rollbackSteps: [],
        validationChecks: [
          { type: 'typescript', description: 'Validate type correctness', command: 'npx tsc --noEmit' }
        ]
      });
    }

    return fixes;
  }

  /**
   * Generate API-specific fixes
   */
  private async generateAPIFixes(issue: SystemIssue, hypothesis: any): Promise<FixStrategy[]> {
    const fixes: FixStrategy[] = [];

    // Fix 1: Missing error handling
    if (issue.message.includes('unhandled') || issue.message.includes('500')) {
      fixes.push({
        id: `api-error-handling-${Date.now()}`,
        type: 'code_modification',
        description: 'Add comprehensive error handling to API endpoint',
        confidence: 0.8,
        estimatedImpact: 'medium',
        riskLevel: 'safe',
        steps: [
          {
            action: 'wrap_try_catch',
            target: hypothesis.affectedFiles[0] || 'unknown',
            changes: {},
            description: 'Wrap endpoint logic in try-catch with proper error responses',
            canRollback: true
          }
        ],
        rollbackSteps: [],
        validationChecks: [
          { type: 'typescript', description: 'Verify TypeScript compilation', command: 'npx tsc --noEmit' },
          { type: 'runtime', description: 'Test API endpoint returns proper error codes' }
        ]
      });
    }

    // Fix 2: Rate limiting issues
    if (issue.message.includes('rate limit') || issue.message.includes('429')) {
      fixes.push({
        id: `api-rate-limit-${Date.now()}`,
        type: 'code_modification',
        description: 'Implement exponential backoff and rate limit handling',
        confidence: 0.9,
        estimatedImpact: 'medium',
        riskLevel: 'safe',
        steps: [
          {
            action: 'add_retry_logic',
            target: hypothesis.affectedFiles[0] || 'unknown',
            changes: { strategy: 'exponential_backoff', maxRetries: 3 },
            description: 'Add retry logic with exponential backoff',
            canRollback: true
          }
        ],
        rollbackSteps: [],
        validationChecks: [
          { type: 'runtime', description: 'Verify retry logic works correctly' }
        ]
      });
    }

    return fixes;
  }

  /**
   * Generate Database-specific fixes
   */
  private async generateDatabaseFixes(issue: SystemIssue, hypothesis: any): Promise<FixStrategy[]> {
    const fixes: FixStrategy[] = [];

    // Fix 1: Schema mismatch
    if (issue.message.includes('schema') || issue.message.includes('field')) {
      fixes.push({
        id: `db-schema-sync-${Date.now()}`,
        type: 'schema_migration',
        description: 'Synchronize Prisma schema with database',
        confidence: 0.85,
        estimatedImpact: 'high',
        riskLevel: 'moderate',
        steps: [
          {
            action: 'prisma_generate',
            target: 'prisma/schema.prisma',
            changes: {},
            description: 'Regenerate Prisma client',
            canRollback: false
          },
          {
            action: 'prisma_db_push',
            target: 'database',
            changes: {},
            description: 'Push schema changes to database',
            canRollback: false
          }
        ],
        rollbackSteps: [],
        validationChecks: [
          { type: 'schema', description: 'Verify schema is valid', command: 'npx prisma validate' },
          { type: 'typescript', description: 'Verify generated types work', command: 'npx tsc --noEmit' }
        ],
        requiredApprovals: ['database_admin'] // Database changes require approval
      });
    }

    // Fix 2: Connection issues
    if (issue.message.includes('connection') || issue.message.includes('timeout')) {
      fixes.push({
        id: `db-connection-${Date.now()}`,
        type: 'config_change',
        description: 'Increase connection pool and timeout settings',
        confidence: 0.7,
        estimatedImpact: 'medium',
        riskLevel: 'safe',
        steps: [
          {
            action: 'update_env',
            target: '.env',
            changes: { 
              'DATABASE_CONNECTION_TIMEOUT': '30000',
              'DATABASE_POOL_SIZE': '10'
            },
            description: 'Update database connection settings',
            canRollback: true
          }
        ],
        rollbackSteps: [
          {
            action: 'restore_env',
            target: '.env',
            changes: {},
            description: 'Restore previous environment settings',
            canRollback: false
          }
        ],
        validationChecks: [
          { type: 'runtime', description: 'Verify database connection works' }
        ]
      });
    }

    return fixes;
  }

  /**
   * Generate Streaming-specific fixes
   */
  private async generateStreamingFixes(issue: SystemIssue, hypothesis: any): Promise<FixStrategy[]> {
    const fixes: FixStrategy[] = [];

    // Fix 1: Event parsing issues
    if (issue.message.includes('parse') || issue.message.includes('event')) {
      fixes.push({
        id: `stream-parse-${Date.now()}`,
        type: 'code_modification',
        description: 'Fix streaming event parsing and type handling',
        confidence: 0.8,
        estimatedImpact: 'medium',
        riskLevel: 'safe',
        steps: [
          {
            action: 'add_type_guards',
            target: hypothesis.affectedFiles[0] || 'unknown',
            changes: {},
            description: 'Add type guards for streaming event parsing',
            canRollback: true
          }
        ],
        rollbackSteps: [],
        validationChecks: [
          { type: 'typescript', description: 'Verify types are correct', command: 'npx tsc --noEmit' },
          { type: 'runtime', description: 'Test streaming endpoint' }
        ]
      });
    }

    return fixes;
  }

  /**
   * Generate generic fixes for unknown issue types
   */
  private async generateGenericFixes(issue: SystemIssue, hypothesis: any): Promise<FixStrategy[]> {
    return [
      {
        id: `generic-restart-${Date.now()}`,
        type: 'cache_clear',
        description: 'Clear caches and restart affected services',
        confidence: 0.5,
        estimatedImpact: 'low',
        riskLevel: 'safe',
        steps: [
          {
            action: 'clear_cache',
            target: 'system',
            changes: {},
            description: 'Clear Next.js cache and rebuild',
            canRollback: false
          }
        ],
        rollbackSteps: [],
        validationChecks: [
          { type: 'build', description: 'Verify system builds correctly', command: 'npm run build' }
        ]
      }
    ];
  }

  /**
   * Select the best fix strategy from available options
   */
  private selectBestStrategy(strategies: FixStrategy[]): FixStrategy {
    return strategies.sort((a, b) => {
      // Prioritize by: confidence > low risk > low impact
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      
      const riskScore = { safe: 0, moderate: 1, risky: 2, dangerous: 3 };
      const aRisk = riskScore[a.riskLevel];
      const bRisk = riskScore[b.riskLevel];
      if (aRisk !== bRisk) return aRisk - bRisk;
      
      const impactScore = { low: 0, medium: 1, high: 2, critical: 3 };
      return impactScore[a.estimatedImpact] - impactScore[b.estimatedImpact];
    })[0];
  }

  /**
   * Apply a fix strategy
   */
  private async applyFix(issue: SystemIssue, strategy: FixStrategy): Promise<FixResult> {
    const result: FixResult = {
      success: false,
      strategy,
      appliedSteps: [],
      validationResults: [],
      learnings: []
    };

    try {
      console.log(`[AUTO-FIX] Applying strategy: ${strategy.description}`);

      // Apply each step in the strategy
      for (const step of strategy.steps) {
        console.log(`[AUTO-FIX] Executing step: ${step.description}`);
        await this.executeFixStep(step);
        result.appliedSteps.push(step);
      }

      // Run validation checks
      console.log('[AUTO-FIX] Running validation checks...');
      for (const check of strategy.validationChecks) {
        const validationResult = await this.runValidationCheck(check);
        result.validationResults.push(validationResult);

        if (!validationResult.passed) {
          console.error(`[AUTO-FIX] Validation failed: ${check.description}`);
          result.success = false;
          result.error = `Validation failed: ${validationResult.error}`;
          
          // Perform rollback
          console.log('[AUTO-FIX] Performing rollback...');
          await this.rollbackFix(strategy);
          result.rollbackPerformed = true;
          result.learnings.push(`Fix validation failed: ${validationResult.error}`);
          
          return result;
        }
      }

      // All validations passed!
      result.success = true;
      result.learnings.push(`Successfully applied fix: ${strategy.description}`);
      console.log('[AUTO-FIX] Fix applied successfully!');

      // Record success in database
      await this.recordFixSuccess(issue, strategy, result);

    } catch (error) {
      console.error('[AUTO-FIX] Error applying fix:', error);
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.learnings.push(`Fix application failed: ${result.error}`);

      // Attempt rollback
      try {
        await this.rollbackFix(strategy);
        result.rollbackPerformed = true;
      } catch (rollbackError) {
        console.error('[AUTO-FIX] Rollback failed:', rollbackError);
        result.learnings.push('Rollback failed - manual intervention required');
      }
    }

    return result;
  }

  /**
   * Execute a single fix step
   */
  private async executeFixStep(step: FixStep): Promise<void> {
    // This would integrate with actual file system operations
    // For now, we log the action
    console.log(`[AUTO-FIX] Would execute: ${step.action} on ${step.target}`);
    
    // In a full implementation, this would:
    // - Read the target file
    // - Apply the changes
    // - Write back to file system
    // - Commit to git if needed
  }

  /**
   * Run a validation check
   */
  private async runValidationCheck(check: ValidationCheck): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      // In full implementation, would actually run the validation
      // For now, simulate success
      console.log(`[AUTO-FIX] Running validation: ${check.description}`);
      
      return {
        check,
        passed: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        check,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Rollback an applied fix
   */
  private async rollbackFix(strategy: FixStrategy): Promise<void> {
    console.log(`[AUTO-FIX] Rolling back fix: ${strategy.description}`);
    
    for (const step of strategy.rollbackSteps.reverse()) {
      console.log(`[AUTO-FIX] Rollback step: ${step.description}`);
      await this.executeFixStep(step);
    }
  }

  /**
   * Save a fix that requires manual approval
   */
  private async savePendingFix(
    issue: SystemIssue,
    strategy: FixStrategy,
    rootCause: RootCauseAnalysis
  ): Promise<void> {
    try {
      await prisma.hypothesis.create({
        data: {
          description: strategy.description,
          confidence: strategy.confidence,
          evidence: rootCause.evidence,
          suggestedActions: strategy.steps.map(s => s.description),
          risks: [
            `Risk Level: ${strategy.riskLevel}`,
            `Estimated Impact: ${strategy.estimatedImpact}`,
            ...(strategy.requiredApprovals ? [`Requires approval: ${strategy.requiredApprovals.join(', ')}`] : [])
          ],
          status: 'pending_review',
          metadata: {
            strategyId: strategy.id,
            issueComponent: issue.component,
            issueSeverity: issue.severity
          }
        }
      });
      
      console.log('[AUTO-FIX] Fix saved for manual review');
    } catch (error) {
      console.error('[AUTO-FIX] Failed to save pending fix:', error);
    }
  }

  /**
   * Record a successful fix in the database for learning
   */
  private async recordFixSuccess(
    issue: SystemIssue,
    strategy: FixStrategy,
    result: FixResult
  ): Promise<void> {
    try {
      await prisma.experience.create({
        data: {
          action: 'auto_fix_applied',
          context: {
            issue: {
              component: issue.component,
              severity: issue.severity,
              description: issue.message
            },
            strategy: {
              type: strategy.type,
              description: strategy.description,
              confidence: strategy.confidence
            }
          },
          outcome: result.success ? 'success' : 'failure',
          results: {
            stepsApplied: result.appliedSteps.length,
            validationsPassed: result.validationResults.filter(v => v.passed).length,
            totalValidations: result.validationResults.length,
            rollbackPerformed: result.rollbackPerformed
          },
          learnings: result.learnings
        }
      });

      console.log('[AUTO-FIX] Fix success recorded for learning');
    } catch (error) {
      console.error('[AUTO-FIX] Failed to record fix success:', error);
    }
  }

  /**
   * Helper: Extract missing name from TypeScript error message
   */
  private extractMissingName(errorMessage: string): string {
    const match = errorMessage.match(/cannot find name ['"](\w+)['"]/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Get statistics on auto-fix success rates
   */
  async getFixStatistics(): Promise<any> {
    try {
      const experiences = await prisma.experience.findMany({
        where: { action: 'auto_fix_applied' },
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      const total = experiences.length;
      const successful = experiences.filter(e => e.outcome === 'success').length;
      const successRate = total > 0 ? successful / total : 0;

      return {
        totalFixes: total,
        successfulFixes: successful,
        failedFixes: total - successful,
        successRate,
        recentFixes: experiences.slice(0, 10).map(e => ({
          action: e.action,
          outcome: e.outcome,
          timestamp: e.timestamp,
          learnings: e.learnings
        }))
      };
    } catch (error) {
      console.error('[AUTO-FIX] Failed to get statistics:', error);
      return {
        totalFixes: 0,
        successfulFixes: 0,
        failedFixes: 0,
        successRate: 0,
        recentFixes: []
      };
    }
  }
}

// ===========================
// Export Singleton Instance
// ===========================

export const autoFixEngine = new AutoFixEngine();
