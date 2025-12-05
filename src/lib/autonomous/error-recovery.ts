/**
 * PHASE 4: AUTOMATIC ERROR RECOVERY
 * 
 * Catches common errors and automatically fixes them:
 * - TypeScript compilation errors
 * - Missing dependencies
 * - Database connection issues
 * - API endpoint failures
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ExperienceTracker } from '../metamorphosis/experience-tracker';
import { PreDeploymentValidator } from '../deployment/pre-deployment-validator';

const execAsync = promisify(exec);

export interface RecoveryResult {
  success: boolean;
  error: string;
  actionTaken: string;
  details: string;
  shouldRetry: boolean;
}

export interface ErrorPattern {
  pattern: RegExp;
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoFixable: boolean;
  fix: (error: string, context?: any) => Promise<RecoveryResult>;
}

export class AutomaticErrorRecovery {
  private experienceTracker: ExperienceTracker;
  private projectRoot: string;

  constructor(projectRoot: string = '/home/user/Holly-AI') {
    this.projectRoot = projectRoot;
    this.experienceTracker = new ExperienceTracker();
  }

  /**
   * Known error patterns and their fixes
   */
  private get errorPatterns(): ErrorPattern[] {
    return [
      // TypeScript: Cannot find module
      {
        pattern: /Cannot find module ['"](.+)['"]/,
        errorType: 'missing_module',
        severity: 'high',
        autoFixable: true,
        fix: async (error) => this.fixMissingModule(error)
      },

      // TypeScript: Type not assignable
      {
        pattern: /Type ['"](.+)['"] is not assignable to type ['"](.+)['"]/,
        errorType: 'type_mismatch',
        severity: 'high',
        autoFixable: false,
        fix: async (error) => this.suggestTypecast(error)
      },

      // Prisma: Database connection failed
      {
        pattern: /Can't reach database server|ECONNREFUSED|Connection refused/,
        errorType: 'database_connection',
        severity: 'critical',
        autoFixable: true,
        fix: async (error) => this.fixDatabaseConnection(error)
      },

      // Missing dependencies
      {
        pattern: /Cannot find package ['"](.+)['"]/,
        errorType: 'missing_dependency',
        severity: 'medium',
        autoFixable: true,
        fix: async (error) => this.fixMissingDependency(error)
      },

      // Syntax errors
      {
        pattern: /Unexpected token|Unexpected identifier/,
        errorType: 'syntax_error',
        severity: 'high',
        autoFixable: false,
        fix: async (error) => this.analyzeSyntaxError(error)
      },

      // Environment variable missing
      {
        pattern: /Environment variable ['"](.+)['"] is not defined/,
        errorType: 'missing_env_var',
        severity: 'critical',
        autoFixable: false,
        fix: async (error) => this.identifyMissingEnvVar(error)
      }
    ];
  }

  /**
   * Attempt to recover from an error automatically
   */
  async recover(error: string | Error, context?: any): Promise<RecoveryResult> {
    const errorString = error instanceof Error ? error.message : error;
    console.log(`[Error Recovery] Attempting to recover from: ${errorString.substring(0, 100)}...`);

    // Find matching error pattern
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(errorString)) {
        console.log(`[Error Recovery] Matched pattern: ${pattern.errorType}`);
        
        if (pattern.autoFixable) {
          const result = await pattern.fix(errorString, context);
          
          // Record recovery attempt
          await this.recordRecoveryAttempt(pattern.errorType, result);
          
          return result;
        } else {
          // Return diagnostic info for manual fixing
          return await pattern.fix(errorString, context);
        }
      }
    }

    // Unknown error - return diagnostic info
    return {
      success: false,
      error: errorString,
      actionTaken: 'none',
      details: 'Error pattern not recognized - manual intervention required',
      shouldRetry: false
    };
  }

  /**
   * Fix missing module errors
   */
  private async fixMissingModule(error: string): Promise<RecoveryResult> {
    const match = error.match(/Cannot find module ['"](.+)['"]/);
    if (!match) {
      return {
        success: false,
        error,
        actionTaken: 'none',
        details: 'Could not extract module name',
        shouldRetry: false
      };
    }

    const modulePath = match[1];
    
    // Check if it's a local file or npm package
    if (modulePath.startsWith('.') || modulePath.startsWith('/')) {
      return {
        success: false,
        error,
        actionTaken: 'analysis',
        details: `Local file missing: ${modulePath}. Check if file exists and path is correct.`,
        shouldRetry: false
      };
    }

    // Try to install the package
    try {
      console.log(`[Error Recovery] Installing missing package: ${modulePath}`);
      await execAsync(`npm install ${modulePath}`, { cwd: this.projectRoot });
      
      return {
        success: true,
        error,
        actionTaken: `Installed package: ${modulePath}`,
        details: 'Package installed successfully',
        shouldRetry: true
      };
    } catch (installError: any) {
      return {
        success: false,
        error,
        actionTaken: 'install_failed',
        details: `Failed to install ${modulePath}: ${installError.message}`,
        shouldRetry: false
      };
    }
  }

  /**
   * Suggest type casting for type mismatch errors
   */
  private async suggestTypecast(error: string): Promise<RecoveryResult> {
    const match = error.match(/Type ['"](.+)['"] is not assignable to type ['"](.+)['"]/);
    if (!match) {
      return {
        success: false,
        error,
        actionTaken: 'analysis',
        details: 'Could not parse type mismatch',
        shouldRetry: false
      };
    }

    const [, fromType, toType] = match;

    return {
      success: false,
      error,
      actionTaken: 'suggestion',
      details: `Type mismatch: ${fromType} → ${toType}. Suggested fix: Add type assertion 'as ${toType}' or fix the source type.`,
      shouldRetry: false
    };
  }

  /**
   * Fix database connection issues
   */
  private async fixDatabaseConnection(error: string): Promise<RecoveryResult> {
    try {
      // Check if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        return {
          success: false,
          error,
          actionTaken: 'env_check',
          details: 'DATABASE_URL environment variable is not set',
          shouldRetry: false
        };
      }

      // Try to reconnect (in production, would implement retry logic)
      console.log('[Error Recovery] Database connection failed - checking configuration');

      return {
        success: false,
        error,
        actionTaken: 'diagnostic',
        details: 'Database server may be down. Check: 1) DATABASE_URL is correct, 2) Database server is running, 3) Network connectivity',
        shouldRetry: true
      };
    } catch (err: any) {
      return {
        success: false,
        error,
        actionTaken: 'failed',
        details: err.message,
        shouldRetry: false
      };
    }
  }

  /**
   * Fix missing dependency
   */
  private async fixMissingDependency(error: string): Promise<RecoveryResult> {
    const match = error.match(/Cannot find package ['"](.+)['"]/);
    if (!match) {
      return {
        success: false,
        error,
        actionTaken: 'none',
        details: 'Could not extract package name',
        shouldRetry: false
      };
    }

    const packageName = match[1];

    try {
      console.log(`[Error Recovery] Installing missing dependency: ${packageName}`);
      await execAsync(`npm install ${packageName}`, { cwd: this.projectRoot });
      
      return {
        success: true,
        error,
        actionTaken: `Installed dependency: ${packageName}`,
        details: 'Dependency installed successfully',
        shouldRetry: true
      };
    } catch (installError: any) {
      return {
        success: false,
        error,
        actionTaken: 'install_failed',
        details: `Failed to install ${packageName}: ${installError.message}`,
        shouldRetry: false
      };
    }
  }

  /**
   * Analyze syntax errors
   */
  private async analyzeSyntaxError(error: string): Promise<RecoveryResult> {
    return {
      success: false,
      error,
      actionTaken: 'analysis',
      details: 'Syntax error detected. Check for: 1) Missing brackets/braces, 2) Unclosed strings, 3) Invalid characters',
      shouldRetry: false
    };
  }

  /**
   * Identify missing environment variable
   */
  private async identifyMissingEnvVar(error: string): Promise<RecoveryResult> {
    const match = error.match(/Environment variable ['"](.+)['"] is not defined/);
    if (!match) {
      return {
        success: false,
        error,
        actionTaken: 'none',
        details: 'Could not extract environment variable name',
        shouldRetry: false
      };
    }

    const varName = match[1];

    return {
      success: false,
      error,
      actionTaken: 'diagnostic',
      details: `Missing environment variable: ${varName}. Add this to your .env file or Vercel environment variables.`,
      shouldRetry: false
    };
  }

  /**
   * Record recovery attempt as experience
   */
  private async recordRecoveryAttempt(
    errorType: string,
    result: RecoveryResult
  ): Promise<void> {
    try {
      await this.experienceTracker.recordExperience({
        type: 'fix',
        action: result.actionTaken,
        context: {
          situation: 'Automatic error recovery',
          problem: errorType
        },
        outcome: result.success ? 'success' : 'failure',
        results: {
          userFeedback: result.details
        },
        lessonsLearned: result.success
          ? `Successfully recovered from ${errorType} by ${result.actionTaken}`
          : `Could not auto-recover from ${errorType}: ${result.details}`,
        wouldRepeat: result.success,
        confidence: result.success ? 85 : 30
      });
    } catch (error) {
      console.error('[Error Recovery] Failed to record experience:', error);
    }
  }

  /**
   * Get recovery success rate for an error type
   */
  async getRecoverySuccessRate(errorType: string): Promise<number> {
    try {
      const attempts = await this.experienceTracker.findSimilarExperiences({
        keywords: [errorType, 'recovery'],
        type: 'fix'
      }, 20);

      if (attempts.length === 0) return 0;

      const successful = attempts.filter(a => a.outcome === 'success').length;
      return (successful / attempts.length) * 100;
    } catch (error) {
      return 0;
    }
  }
}

/**
 * Quick error recovery attempt
 */
export async function attemptRecovery(error: string | Error): Promise<RecoveryResult> {
  const recovery = new AutomaticErrorRecovery();
  return await recovery.recover(error);
}
