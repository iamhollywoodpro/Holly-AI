/**
 * SANDBOX SECURITY LAYER
 * 
 * Security controls and validation for code execution
 */

export interface SecurityPolicy {
  allow_network: boolean;
  allow_file_system: boolean;
  allow_external_imports: boolean;
  max_execution_time_ms: number;
  max_memory_mb: number;
  max_output_size_kb: number;
  allowed_domains?: string[];
}

export interface SecurityViolation {
  type: 'dangerous_code' | 'resource_limit' | 'network_access' | 'file_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
}

export class SandboxSecurity {
  private static readonly DEFAULT_POLICY: SecurityPolicy = {
    allow_network: false,
    allow_file_system: false,
    allow_external_imports: false,
    max_execution_time_ms: 5000,
    max_memory_mb: 128,
    max_output_size_kb: 100
  };

  /**
   * Validate code against security policy
   */
  static validateCode(code: string, policy: SecurityPolicy = this.DEFAULT_POLICY): {
    valid: boolean;
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    // Check for dangerous Node.js modules
    if (!policy.allow_file_system) {
      const fsPatterns = [
        /require\s*\(\s*['"]fs['"]\s*\)/,
        /import\s+.*\s+from\s+['"]fs['"]/,
        /import\s+.*\s+from\s+['"]node:fs['"]/
      ];

      for (const pattern of fsPatterns) {
        if (pattern.test(code)) {
          violations.push({
            type: 'file_access',
            severity: 'high',
            description: 'File system access is not allowed',
            detected_at: new Date().toISOString()
          });
        }
      }
    }

    // Check for network access
    if (!policy.allow_network) {
      const networkPatterns = [
        /require\s*\(\s*['"]https?['"]\s*\)/,
        /require\s*\(\s*['"]net['"]\s*\)/,
        /import\s+.*\s+from\s+['"]https?['"]/,
        /fetch\s*\(/,
        /XMLHttpRequest/,
        /WebSocket/
      ];

      for (const pattern of networkPatterns) {
        if (pattern.test(code)) {
          violations.push({
            type: 'network_access',
            severity: 'medium',
            description: 'Network access is not allowed',
            detected_at: new Date().toISOString()
          });
        }
      }
    }

    // Check for dangerous code patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/, desc: 'eval() is dangerous' },
      { pattern: /Function\s*\(/, desc: 'Function constructor is dangerous' },
      { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, desc: 'child_process is not allowed' },
      { pattern: /process\.exit/, desc: 'process.exit is not allowed' },
      { pattern: /process\.kill/, desc: 'process.kill is not allowed' },
      { pattern: /__dirname/, desc: '__dirname access is not allowed' },
      { pattern: /__filename/, desc: '__filename access is not allowed' },
      { pattern: /while\s*\(\s*true\s*\)/, desc: 'Infinite loops are dangerous' },
      { pattern: /for\s*\(\s*;\s*;\s*\)/, desc: 'Infinite loops are dangerous' }
    ];

    for (const { pattern, desc } of dangerousPatterns) {
      if (pattern.test(code)) {
        violations.push({
          type: 'dangerous_code',
          severity: 'critical',
          description: desc,
          detected_at: new Date().toISOString()
        });
      }
    }

    // Check code size
    if (code.length > policy.max_output_size_kb * 1024) {
      violations.push({
        type: 'resource_limit',
        severity: 'medium',
        description: `Code exceeds size limit (${policy.max_output_size_kb}KB)`,
        detected_at: new Date().toISOString()
      });
    }

    // Determine if code is valid
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const valid = criticalViolations.length === 0;

    return { valid, violations };
  }

  /**
   * Sanitize code output
   */
  static sanitizeOutput(output: string, maxLength: number = 10000): string {
    if (output.length > maxLength) {
      return output.substring(0, maxLength) + '\n... (output truncated)';
    }
    return output;
  }

  /**
   * Check if execution time exceeded limit
   */
  static isTimeoutExceeded(startTime: number, maxTime: number): boolean {
    return Date.now() - startTime > maxTime;
  }

  /**
   * Get security policy for user
   */
  static getPolicyForUser(userId: string, isPremium: boolean = false): SecurityPolicy {
    if (isPremium) {
      return {
        ...this.DEFAULT_POLICY,
        max_execution_time_ms: 30000, // 30 seconds
        max_memory_mb: 512,
        max_output_size_kb: 1000
      };
    }

    return this.DEFAULT_POLICY;
  }

  /**
   * Log security violation
   */
  static async logViolation(
    userId: string,
    violation: SecurityViolation,
    code: string
  ): Promise<void> {
    console.warn('[SandboxSecurity] Violation detected:', {
      userId,
      type: violation.type,
      severity: violation.severity,
      description: violation.description,
      code_snippet: code.substring(0, 100)
    });

    // In production, you'd store this in the database
    // await prisma.securityViolation.create({ ... });
  }

  /**
   * Rate limit check
   */
  static async checkRateLimit(
    userId: string,
    action: 'execute' | 'preview'
  ): Promise<{ allowed: boolean; remaining: number; reset_at: Date }> {
    // Simple in-memory rate limiting (in production, use Redis)
    // For now, allow all requests
    return {
      allowed: true,
      remaining: 100,
      reset_at: new Date(Date.now() + 3600000) // 1 hour from now
    };
  }
}
