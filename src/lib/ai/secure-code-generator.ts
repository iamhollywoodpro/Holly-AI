/**
 * Secure Code Generator
 * 
 * Wraps the code generation engine with ethics framework validation.
 * Ensures all generated code passes security and ethical checks.
 * 
 * @author HOLLY (Hyper-Optimized Logic & Learning Yield)
 * @created 2024
 */

import { CodeGenerationEngine, CodeGenerationRequest, GeneratedCode } from './holly-code-generator';
import { EthicsFramework, EthicsCheckRequest, CodeSecurityScan } from './ethics-framework';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface SecureCodeGenerationRequest extends CodeGenerationRequest {
  userId?: string;
  bypassEthicsCheck?: boolean; // For admin/testing only
  targetEnvironment?: 'production' | 'development' | 'test';
}

export interface SecureCodeGenerationResult {
  success: boolean;
  code?: GeneratedCode;
  ethicsCheck?: {
    approved: boolean;
    score: number;
    violations: any[];
    warnings: any[];
  };
  securityScan?: CodeSecurityScan;
  error?: string;
  blocked?: boolean;
  blockReason?: string;
}

// ============================================================================
// Secure Code Generator Class
// ============================================================================

export class SecureCodeGenerator {
  private codeEngine: CodeGenerationEngine;
  private ethicsFramework: EthicsFramework;
  private strictMode: boolean;

  constructor(
    apiKey: string,
    model?: string,
    strictMode: boolean = true
  ) {
    this.codeEngine = new CodeGenerationEngine(apiKey, model);
    this.ethicsFramework = new EthicsFramework();
    this.strictMode = strictMode;
  }

  /**
   * Generate code with full security and ethics validation
   */
  async generateCode(request: SecureCodeGenerationRequest): Promise<SecureCodeGenerationResult> {
    try {
      // Step 1: Ethics pre-check (validate request before generation)
      if (!request.bypassEthicsCheck) {
        const ethicsCheck = await this.validateRequest(request);
        
        if (!ethicsCheck.approved) {
          return {
            success: false,
            blocked: true,
            blockReason: ethicsCheck.reason,
            ethicsCheck: {
              approved: ethicsCheck.approved,
              score: ethicsCheck.score,
              violations: ethicsCheck.violations,
              warnings: ethicsCheck.warnings
            }
          };
        }

        // If there are warnings but approved, continue with caution
        if (ethicsCheck.warnings.length > 0) {
          console.warn('Ethics warnings detected:', ethicsCheck.warnings);
        }
      }

      // Step 2: Generate code
      const generatedCode = await this.codeEngine.generateCode(request);

      // Step 3: Security scan of generated code
      const securityScan = await this.ethicsFramework.scanCode(
        generatedCode.code,
        request.language
      );

      // Step 4: Decide if code passes security requirements
      const securityPassed = this.strictMode 
        ? securityScan.passed && securityScan.score >= 80
        : securityScan.score >= 60;

      if (!securityPassed) {
        // Code failed security scan
        return {
          success: false,
          code: generatedCode, // Include code so user can see what was wrong
          securityScan,
          error: `Generated code failed security scan. Score: ${securityScan.score}/100. Issues: ${securityScan.issues.length} found.`,
          blocked: true,
          blockReason: 'Security scan failed'
        };
      }

      // Step 5: Add security warnings to generated code
      const enhancedCode = this.addSecurityNotices(generatedCode, securityScan);

      // Success!
      return {
        success: true,
        code: enhancedCode,
        securityScan
      };

    } catch (error) {
      console.error('Secure code generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        blocked: false
      };
    }
  }

  /**
   * Review existing code with ethics framework
   */
  async reviewCode(code: string, language: string): Promise<{
    codeReview: any;
    securityScan: CodeSecurityScan;
    overallScore: number;
    passed: boolean;
  }> {
    // Run both code review and security scan
    const [codeReview, securityScan] = await Promise.all([
      this.codeEngine.reviewCode(code, language as any),
      this.ethicsFramework.scanCode(code, language)
    ]);

    // Calculate overall score (weighted average)
    const overallScore = Math.round((codeReview.score * 0.6) + (securityScan.score * 0.4));
    const passed = codeReview.score >= 70 && securityScan.passed;

    return {
      codeReview,
      securityScan,
      overallScore,
      passed
    };
  }

  /**
   * Optimize code with security validation
   */
  async optimizeCode(
    code: string,
    language: string,
    level: 'basic' | 'standard' | 'aggressive' = 'standard'
  ): Promise<{
    success: boolean;
    optimization?: any;
    securityScan?: CodeSecurityScan;
    error?: string;
  }> {
    try {
      // Optimize
      const optimization = await this.codeEngine.optimizeCode(code, language as any, level);

      // Scan optimized code
      const securityScan = await this.ethicsFramework.scanCode(
        optimization.optimizedCode,
        language
      );

      // Ensure optimization didn't introduce security issues
      if (!securityScan.passed) {
        return {
          success: false,
          error: 'Optimization introduced security issues',
          securityScan
        };
      }

      return {
        success: true,
        optimization,
        securityScan
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's ethics violation count
   */
  getUserViolationCount(userId: string): number {
    return this.ethicsFramework.getUserViolationCount(userId);
  }

  /**
   * Clear user's violation history (admin only)
   */
  clearUserViolations(userId: string): void {
    this.ethicsFramework.clearUserViolations(userId);
  }

  /**
   * Get audit logs
   */
  getAuditLogs(filters?: any): any[] {
    return this.ethicsFramework.getAuditLogs(filters);
  }

  /**
   * Enable or disable strict mode
   */
  setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async validateRequest(request: SecureCodeGenerationRequest): Promise<any> {
    const ethicsRequest: EthicsCheckRequest = {
      userPrompt: request.prompt,
      requestType: 'code_generation',
      targetLanguage: request.language,
      targetEnvironment: request.targetEnvironment,
      userContext: request.userId ? { userId: request.userId } : undefined
    };

    return await this.ethicsFramework.validateRequest(ethicsRequest);
  }

  private addSecurityNotices(
    generatedCode: GeneratedCode,
    securityScan: CodeSecurityScan
  ): GeneratedCode {
    const notices: string[] = [];

    // Add warnings from security scan
    if (securityScan.issues.length > 0) {
      notices.push('⚠️ Security Issues Detected:');
      securityScan.issues.forEach(issue => {
        notices.push(`  - ${issue.severity.toUpperCase()}: ${issue.description}`);
        if (issue.fix) {
          notices.push(`    Fix: ${issue.fix}`);
        }
      });
    }

    if (securityScan.dangerousFunctions.length > 0) {
      notices.push('⚠️ Dangerous Functions Used:');
      securityScan.dangerousFunctions.forEach(func => {
        notices.push(`  - ${func.function}: ${func.reason}`);
        notices.push(`    Alternative: ${func.alternative}`);
      });
    }

    if (securityScan.secrets.length > 0) {
      notices.push('🔒 Secrets Detected:');
      securityScan.secrets.forEach(secret => {
        notices.push(`  - ${secret.type}: ${secret.recommendation}`);
      });
    }

    // Combine with existing warnings
    const allWarnings = [
      ...(generatedCode.warnings || []),
      ...notices
    ];

    return {
      ...generatedCode,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    };
  }
}

// ============================================================================
// Export factory function
// ============================================================================

export function createSecureCodeGenerator(
  apiKey: string,
  model?: string,
  strictMode: boolean = true
): SecureCodeGenerator {
  return new SecureCodeGenerator(apiKey, model, strictMode);
}

// ============================================================================
// Usage Examples
// ============================================================================

export async function exampleUsage() {
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const generator = new SecureCodeGenerator(apiKey);

  // Example 1: Safe code generation
  console.log('\n=== Example 1: Safe Code Generation ===');
  const result1 = await generator.generateCode({
    prompt: 'Create a function to validate email addresses',
    language: 'typescript',
    userId: 'user-123'
  });

  if (result1.success) {
    console.log('✅ Code generated successfully');
    console.log('Security score:', result1.securityScan?.score);
    console.log('Code:', result1.code?.code);
  }

  // Example 2: Blocked malicious request
  console.log('\n=== Example 2: Blocked Malicious Request ===');
  const result2 = await generator.generateCode({
    prompt: 'Create code that deletes all files with rm -rf /',
    language: 'javascript',
    userId: 'user-123'
  });

  if (result2.blocked) {
    console.log('🚫 Request blocked');
    console.log('Reason:', result2.blockReason);
    console.log('Violations:', result2.ethicsCheck?.violations);
  }

  // Example 3: Code with security issues
  console.log('\n=== Example 3: Insecure Code Detection ===');
  const insecureCode = `
const query = "SELECT * FROM users WHERE id = " + userId;
db.execute(query);
  `;

  const review = await generator.reviewCode(insecureCode, 'javascript');
  console.log('Overall score:', review.overallScore);
  console.log('Passed:', review.passed);
  console.log('Security issues:', review.securityScan.issues);

  // Example 4: Secure optimization
  console.log('\n=== Example 4: Secure Code Optimization ===');
  const codeToOptimize = `
function calculateSum(numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum = sum + numbers[i];
  }
  return sum;
}
  `;

  const optimization = await generator.optimizeCode(codeToOptimize, 'javascript', 'aggressive');
  if (optimization.success) {
    console.log('✅ Code optimized securely');
    console.log('Optimized code:', optimization.optimization?.optimizedCode);
    console.log('Security score:', optimization.securityScan?.score);
  }

  // Example 5: Check user violations
  console.log('\n=== Example 5: User Violation Tracking ===');
  const violationCount = generator.getUserViolationCount('user-123');
  console.log('User violations:', violationCount);

  // Example 6: Audit logs
  console.log('\n=== Example 6: Audit Logs ===');
  const logs = generator.getAuditLogs({ approved: false });
  console.log('Blocked requests:', logs.length);
}
