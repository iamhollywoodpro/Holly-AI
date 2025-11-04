/**
 * HOLLY Ethics & Security Framework
 * 
 * Responsible AI governance system for code generation and autonomous operations.
 * Ensures HOLLY operates within ethical boundaries and generates secure code.
 * 
 * @author HOLLY (Hyper-Optimized Logic & Learning Yield)
 * @created 2024
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EthicsCheckRequest {
  userPrompt: string;
  requestType: 'code_generation' | 'code_review' | 'code_optimization' | 'deployment' | 'github_operation';
  userContext?: {
    userId?: string;
    previousViolations?: number;
    accountAge?: number;
  };
  targetLanguage?: string;
  targetEnvironment?: 'production' | 'development' | 'test';
}

export interface EthicsCheckResult {
  approved: boolean;
  confidence: number; // 0-1
  score: number; // 0-100 (ethical score)
  violations: EthicsViolation[];
  warnings: EthicsWarning[];
  recommendations: string[];
  reason?: string;
  allowWithModification?: boolean;
  suggestedModification?: string;
}

export interface EthicsViolation {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: EthicsCategory;
  description: string;
  detectedPattern: string;
  recommendation: string;
  autoFixable: boolean;
}

export interface EthicsWarning {
  category: EthicsCategory;
  message: string;
  guidance: string;
}

export type EthicsCategory = 
  | 'security'           // Security vulnerabilities
  | 'malicious'          // Intentionally harmful code
  | 'privacy'            // Privacy violations
  | 'accessibility'      // Accessibility issues
  | 'bias'               // Discriminatory patterns
  | 'legal'              // Legal compliance issues
  | 'environmental'      // Resource waste
  | 'ethical'            // General ethical concerns
  | 'safety';            // User safety issues

export interface CodeSecurityScan {
  score: number; // 0-100
  issues: SecurityIssue[];
  vulnerabilities: Vulnerability[];
  secrets: DetectedSecret[];
  dangerousFunctions: DangerousFunction[];
  passed: boolean;
}

export interface SecurityIssue {
  type: 'sql_injection' | 'xss' | 'command_injection' | 'path_traversal' | 'insecure_random' | 'hardcoded_secret' | 'unsafe_deserialization';
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
  code: string;
  description: string;
  fix: string;
  cwe?: string; // Common Weakness Enumeration ID
}

export interface Vulnerability {
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedCode: string;
  mitigation: string;
}

export interface DetectedSecret {
  type: 'api_key' | 'password' | 'token' | 'private_key' | 'connection_string';
  pattern: string;
  line?: number;
  recommendation: string;
}

export interface DangerousFunction {
  function: string;
  reason: string;
  alternative: string;
  line?: number;
}

export interface AuditLog {
  timestamp: Date;
  requestType: string;
  userPrompt: string;
  approved: boolean;
  violations: EthicsViolation[];
  userId?: string;
  resultingAction?: string;
}

// ============================================================================
// Security Pattern Definitions
// ============================================================================

const MALICIOUS_PATTERNS = [
  // System attacks
  { pattern: /rm\s+-rf\s+[\/~]/, category: 'malicious', severity: 'critical', description: 'Destructive file deletion command' },
  { pattern: /:(){ :|:& };:/, category: 'malicious', severity: 'critical', description: 'Fork bomb attack' },
  { pattern: /dd\s+if=.*of=\/dev\/(sda|hda)/, category: 'malicious', severity: 'critical', description: 'Disk destruction command' },
  
  // Crypto mining
  { pattern: /xmrig|minergate|coinhive/i, category: 'malicious', severity: 'high', description: 'Cryptocurrency mining code' },
  
  // Network attacks
  { pattern: /syn\s+flood|ddos|dos\s+attack/i, category: 'malicious', severity: 'critical', description: 'Network attack code' },
  { pattern: /port\s+scan|nmap|masscan/i, category: 'security', severity: 'medium', description: 'Port scanning tools' },
  
  // Keyloggers & spyware
  { pattern: /keylog|keystroke|pynput\.keyboard/i, category: 'malicious', severity: 'critical', description: 'Keylogging functionality' },
  { pattern: /screenshot|screencapture.*hidden/i, category: 'privacy', severity: 'high', description: 'Unauthorized screen capture' },
  
  // Reverse shells
  { pattern: /\/bin\/(ba)?sh.*-i.*>&.*\/dev\/tcp/i, category: 'malicious', severity: 'critical', description: 'Reverse shell' },
  { pattern: /nc.*-e.*\/bin\/(ba)?sh/i, category: 'malicious', severity: 'critical', description: 'Netcat reverse shell' },
  
  // Data exfiltration
  { pattern: /curl.*\|\s*bash/i, category: 'security', severity: 'high', description: 'Pipe to bash (potential code injection)' },
  { pattern: /wget.*\|\s*sh/i, category: 'security', severity: 'high', description: 'Pipe to shell (potential code injection)' },
] as const;

const SECURITY_VULNERABILITIES = [
  // SQL Injection
  { pattern: /execute\s*\(\s*["'`].*\+.*["'`]/i, type: 'sql_injection', severity: 'critical', description: 'SQL injection via string concatenation' },
  { pattern: /query\s*\(\s*.*\+.*user.*\)/i, type: 'sql_injection', severity: 'high', description: 'Potential SQL injection with user input' },
  
  // XSS
  { pattern: /innerHTML\s*=.*user|innerHTML\s*=.*input/i, type: 'xss', severity: 'high', description: 'XSS via innerHTML with user input' },
  { pattern: /dangerouslySetInnerHTML/i, type: 'xss', severity: 'medium', description: 'Potential XSS with dangerouslySetInnerHTML' },
  { pattern: /document\.write\s*\(.*user|document\.write\s*\(.*input/i, type: 'xss', severity: 'high', description: 'XSS via document.write' },
  
  // Command Injection
  { pattern: /exec\s*\(.*user|exec\s*\(.*input/i, type: 'command_injection', severity: 'critical', description: 'Command injection via exec with user input' },
  { pattern: /system\s*\(.*\$_(GET|POST|REQUEST)/i, type: 'command_injection', severity: 'critical', description: 'Command injection with user input' },
  { pattern: /shell_exec|passthru|proc_open/i, type: 'command_injection', severity: 'high', description: 'Dangerous shell execution functions' },
  
  // Path Traversal
  { pattern: /\.\.\/|\.\.\\/, type: 'path_traversal', severity: 'high', description: 'Path traversal pattern detected' },
  { pattern: /readFile\s*\(.*user|readFile\s*\(.*input/i, type: 'path_traversal', severity: 'high', description: 'File read with user input (path traversal risk)' },
  
  // Insecure Randomness
  { pattern: /Math\.random\s*\(\).*password|Math\.random\s*\(\).*token|Math\.random\s*\(\).*secret/i, type: 'insecure_random', severity: 'high', description: 'Using Math.random for security-critical values' },
  
  // Unsafe Deserialization
  { pattern: /pickle\.loads|yaml\.load\s*\((?!.*Loader=)/i, type: 'unsafe_deserialization', severity: 'critical', description: 'Unsafe deserialization' },
  { pattern: /unserialize\s*\(.*\$_(GET|POST|REQUEST)/i, type: 'unsafe_deserialization', severity: 'critical', description: 'Unsafe deserialization with user input' },
] as const;

const SECRET_PATTERNS = [
  { pattern: /api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9]{20,}["']?/i, type: 'api_key', description: 'Hardcoded API key detected' },
  { pattern: /password\s*[:=]\s*["'][^"']{3,}["']/i, type: 'password', description: 'Hardcoded password detected' },
  { pattern: /sk[_-][a-zA-Z0-9]{20,}/i, type: 'token', description: 'Secret key token detected' },
  { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/i, type: 'token', description: 'Bearer token detected' },
  { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i, type: 'private_key', description: 'Private key detected' },
  { pattern: /mongodb:\/\/.*:.*@|postgres:\/\/.*:.*@|mysql:\/\/.*:.*@/i, type: 'connection_string', description: 'Database connection string with credentials' },
  { pattern: /aws[_-]?access[_-]?key|aws[_-]?secret/i, type: 'api_key', description: 'AWS credentials detected' },
] as const;

const DANGEROUS_FUNCTIONS = [
  { function: 'eval', reason: 'Arbitrary code execution', alternative: 'Use JSON.parse or safer alternatives' },
  { function: 'Function constructor', reason: 'Dynamic code execution', alternative: 'Use declared functions' },
  { function: 'exec', reason: 'Command injection risk', alternative: 'Use child_process.execFile with validation' },
  { function: 'innerHTML', reason: 'XSS vulnerability', alternative: 'Use textContent or sanitization library' },
  { function: '__import__', reason: 'Dynamic import abuse', alternative: 'Use standard import statements' },
  { function: 'pickle.loads', reason: 'Arbitrary code execution', alternative: 'Use json.loads or safe alternatives' },
  { function: 'yaml.load', reason: 'Code execution via deserialization', alternative: 'Use yaml.safe_load' },
  { function: 'shell=True', reason: 'Shell injection', alternative: 'Use shell=False with argument list' },
] as const;

const ETHICAL_RED_FLAGS = [
  // Discrimination
  { pattern: /race|gender|age|religion|nationality.*!=.*if|if.*race|if.*gender/i, category: 'bias', description: 'Potential discriminatory logic' },
  
  // Privacy violations
  { pattern: /track.*without.*consent|collect.*personal.*data.*without/i, category: 'privacy', description: 'Unauthorized data collection' },
  { pattern: /location.*track|gps.*track.*without/i, category: 'privacy', description: 'Unauthorized location tracking' },
  
  // Deceptive practices
  { pattern: /hidden.*form|invisible.*input.*submit/i, category: 'ethical', description: 'Deceptive form practices' },
  { pattern: /fake.*click|auto.*click.*ad/i, category: 'ethical', description: 'Click fraud' },
  
  // Accessibility
  { pattern: /document\.addEventListener\('keydown'|document\.addEventListener\('keypress'/i, category: 'accessibility', description: 'Keyboard event without accessibility consideration' },
] as const;

// ============================================================================
// Ethics Framework Class
// ============================================================================

export class EthicsFramework {
  private auditLogs: AuditLog[] = [];
  private violationThreshold = 3; // Number of violations before blocking user
  private userViolationCount: Map<string, number> = new Map();

  /**
   * Validate a request before allowing it to proceed
   */
  async validateRequest(request: EthicsCheckRequest): Promise<EthicsCheckResult> {
    const violations: EthicsViolation[] = [];
    const warnings: EthicsWarning[] = [];
    const recommendations: string[] = [];

    // 1. Check for malicious patterns
    const maliciousChecks = this.checkMaliciousPatterns(request.userPrompt);
    violations.push(...maliciousChecks.violations);

    // 2. Check for ethical concerns
    const ethicalChecks = this.checkEthicalConcerns(request.userPrompt);
    violations.push(...ethicalChecks.violations);
    warnings.push(...ethicalChecks.warnings);

    // 3. Check user history
    if (request.userContext?.userId) {
      const userCheck = this.checkUserHistory(request.userContext);
      if (!userCheck.allowed) {
        violations.push({
          severity: 'critical',
          category: 'safety',
          description: 'User has exceeded violation threshold',
          detectedPattern: 'User history',
          recommendation: 'Account review required',
          autoFixable: false
        });
      }
    }

    // 4. Check request type specific rules
    const typeCheck = this.checkRequestType(request);
    warnings.push(...typeCheck.warnings);
    recommendations.push(...typeCheck.recommendations);

    // Calculate scores
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const highViolations = violations.filter(v => v.severity === 'high').length;
    const mediumViolations = violations.filter(v => v.severity === 'medium').length;

    const score = Math.max(0, 100 - (criticalViolations * 50) - (highViolations * 20) - (mediumViolations * 10));
    const approved = criticalViolations === 0 && highViolations === 0 && score >= 60;
    const confidence = this.calculateConfidence(violations, warnings);

    // Check if modification could help
    const modification = this.suggestModification(request, violations);

    // Log the request
    this.logRequest(request, approved, violations);

    // Update user violation count if not approved
    if (!approved && request.userContext?.userId) {
      const currentCount = this.userViolationCount.get(request.userContext.userId) || 0;
      this.userViolationCount.set(request.userContext.userId, currentCount + 1);
    }

    return {
      approved,
      confidence,
      score,
      violations,
      warnings,
      recommendations,
      reason: approved ? undefined : this.generateRejectionReason(violations),
      allowWithModification: modification !== null,
      suggestedModification: modification || undefined
    };
  }

  /**
   * Scan generated code for security vulnerabilities
   */
  async scanCode(code: string, language: string): Promise<CodeSecurityScan> {
    const issues: SecurityIssue[] = [];
    const vulnerabilities: Vulnerability[] = [];
    const secrets: DetectedSecret[] = [];
    const dangerousFunctions: DangerousFunction[] = [];

    // 1. Check for security vulnerabilities
    for (const vulnPattern of SECURITY_VULNERABILITIES) {
      const matches = code.match(new RegExp(vulnPattern.pattern, 'gi'));
      if (matches) {
        matches.forEach(match => {
          const lineNumber = this.getLineNumber(code, match);
          issues.push({
            type: vulnPattern.type,
            severity: vulnPattern.severity,
            line: lineNumber,
            code: match,
            description: vulnPattern.description,
            fix: this.getSuggestedFix(vulnPattern.type),
            cwe: this.getCWE(vulnPattern.type)
          });
        });
      }
    }

    // 2. Check for hardcoded secrets
    for (const secretPattern of SECRET_PATTERNS) {
      const matches = code.match(new RegExp(secretPattern.pattern, 'gi'));
      if (matches) {
        matches.forEach(match => {
          const lineNumber = this.getLineNumber(code, match);
          secrets.push({
            type: secretPattern.type,
            pattern: match.substring(0, 30) + '...',
            line: lineNumber,
            recommendation: secretPattern.description + ' - Use environment variables instead'
          });
        });
      }
    }

    // 3. Check for dangerous functions
    for (const dangerousFunc of DANGEROUS_FUNCTIONS) {
      const regex = new RegExp(`\\b${dangerousFunc.function}\\b`, 'gi');
      const matches = code.match(regex);
      if (matches) {
        matches.forEach(match => {
          const lineNumber = this.getLineNumber(code, match);
          dangerousFunctions.push({
            function: dangerousFunc.function,
            reason: dangerousFunc.reason,
            alternative: dangerousFunc.alternative,
            line: lineNumber
          });
        });
      }
    }

    // 4. Language-specific checks
    const langSpecific = this.languageSpecificChecks(code, language);
    vulnerabilities.push(...langSpecific);

    // Calculate security score
    const criticalCount = issues.filter(i => i.severity === 'critical').length + secrets.length;
    const highCount = issues.filter(i => i.severity === 'high').length + dangerousFunctions.length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;

    const score = Math.max(0, 100 - (criticalCount * 30) - (highCount * 15) - (mediumCount * 5));
    const passed = criticalCount === 0 && highCount === 0 && score >= 70;

    return {
      score,
      issues,
      vulnerabilities,
      secrets,
      dangerousFunctions,
      passed
    };
  }

  /**
   * Get audit logs for compliance reporting
   */
  getAuditLogs(filters?: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    approved?: boolean;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.approved !== undefined) {
        logs = logs.filter(log => log.approved === filters.approved);
      }
    }

    return logs;
  }

  /**
   * Clear violation count for a user (admin function)
   */
  clearUserViolations(userId: string): void {
    this.userViolationCount.delete(userId);
  }

  /**
   * Get user violation count
   */
  getUserViolationCount(userId: string): number {
    return this.userViolationCount.get(userId) || 0;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private checkMaliciousPatterns(prompt: string): {
    violations: EthicsViolation[];
  } {
    const violations: EthicsViolation[] = [];

    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.pattern.test(prompt)) {
        violations.push({
          severity: pattern.severity,
          category: pattern.category as EthicsCategory,
          description: pattern.description,
          detectedPattern: prompt.match(pattern.pattern)?.[0] || 'matched pattern',
          recommendation: 'Request denied for security reasons',
          autoFixable: false
        });
      }
    }

    return { violations };
  }

  private checkEthicalConcerns(prompt: string): {
    violations: EthicsViolation[];
    warnings: EthicsWarning[];
  } {
    const violations: EthicsViolation[] = [];
    const warnings: EthicsWarning[] = [];

    for (const flag of ETHICAL_RED_FLAGS) {
      if (flag.pattern.test(prompt)) {
        const severity = flag.category === 'bias' ? 'high' : 'medium';
        
        if (severity === 'high') {
          violations.push({
            severity,
            category: flag.category as EthicsCategory,
            description: flag.description,
            detectedPattern: prompt.match(flag.pattern)?.[0] || 'matched pattern',
            recommendation: 'Review code for discriminatory or unethical patterns',
            autoFixable: false
          });
        } else {
          warnings.push({
            category: flag.category as EthicsCategory,
            message: flag.description,
            guidance: 'Ensure this code follows ethical guidelines and best practices'
          });
        }
      }
    }

    return { violations, warnings };
  }

  private checkUserHistory(userContext: NonNullable<EthicsCheckRequest['userContext']>): {
    allowed: boolean;
  } {
    if (!userContext.userId) return { allowed: true };

    const violations = this.userViolationCount.get(userContext.userId) || 0;
    return { allowed: violations < this.violationThreshold };
  }

  private checkRequestType(request: EthicsCheckRequest): {
    warnings: EthicsWarning[];
    recommendations: string[];
  } {
    const warnings: EthicsWarning[] = [];
    const recommendations: string[] = [];

    // Production deployments need extra caution
    if (request.targetEnvironment === 'production') {
      warnings.push({
        category: 'safety',
        message: 'Production deployment detected',
        guidance: 'Ensure thorough testing before deploying to production'
      });
      recommendations.push('Run security scan', 'Test in staging environment first');
    }

    // GitHub operations need verification
    if (request.requestType === 'github_operation') {
      recommendations.push('Verify repository permissions', 'Review commit history');
    }

    return { warnings, recommendations };
  }

  private calculateConfidence(violations: EthicsViolation[], warnings: EthicsWarning[]): number {
    // High confidence if clear violations or no issues
    if (violations.length > 0) return 0.95;
    if (violations.length === 0 && warnings.length === 0) return 0.98;
    // Medium confidence if only warnings
    if (warnings.length > 0) return 0.7;
    return 0.8;
  }

  private suggestModification(request: EthicsCheckRequest, violations: EthicsViolation[]): string | null {
    if (violations.length === 0) return null;

    const autoFixable = violations.filter(v => v.autoFixable);
    if (autoFixable.length === 0) return null;

    // Could suggest specific modifications here
    return 'Remove detected security/ethical issues and resubmit';
  }

  private generateRejectionReason(violations: EthicsViolation[]): string {
    if (violations.length === 0) return 'Unknown reason';

    const critical = violations.filter(v => v.severity === 'critical');
    if (critical.length > 0) {
      return `Critical security/ethical violation detected: ${critical[0].description}`;
    }

    const high = violations.filter(v => v.severity === 'high');
    if (high.length > 0) {
      return `Security/ethical concern detected: ${high[0].description}`;
    }

    return `Multiple security/ethical issues detected. Score: too low for approval.`;
  }

  private getLineNumber(code: string, match: string): number {
    const index = code.indexOf(match);
    if (index === -1) return 0;
    return code.substring(0, index).split('\n').length;
  }

  private getSuggestedFix(issueType: string): string {
    const fixes: Record<string, string> = {
      sql_injection: 'Use parameterized queries or prepared statements',
      xss: 'Use textContent instead of innerHTML, or sanitize input',
      command_injection: 'Use execFile with argument array, validate input',
      path_traversal: 'Validate file paths, use path.resolve and check against allowed directories',
      insecure_random: 'Use crypto.randomBytes or window.crypto.getRandomValues',
      hardcoded_secret: 'Move secrets to environment variables',
      unsafe_deserialization: 'Use safe deserialization methods like yaml.safe_load'
    };
    return fixes[issueType] || 'Review and fix the security issue';
  }

  private getCWE(issueType: string): string {
    const cwes: Record<string, string> = {
      sql_injection: 'CWE-89',
      xss: 'CWE-79',
      command_injection: 'CWE-78',
      path_traversal: 'CWE-22',
      insecure_random: 'CWE-330',
      hardcoded_secret: 'CWE-798',
      unsafe_deserialization: 'CWE-502'
    };
    return cwes[issueType] || '';
  }

  private languageSpecificChecks(code: string, language: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    if (language === 'javascript' || language === 'typescript') {
      // Check for == instead of ===
      if (code.includes('==') && !code.includes('===')) {
        vulnerabilities.push({
          name: 'Loose Equality',
          severity: 'low',
          description: 'Using == instead of === can lead to unexpected type coercion',
          affectedCode: '==',
          mitigation: 'Use === for strict equality checks'
        });
      }
    }

    if (language === 'python') {
      // Check for assert in production
      if (code.includes('assert ')) {
        vulnerabilities.push({
          name: 'Assert in Production',
          severity: 'medium',
          description: 'Assert statements are removed when Python runs in optimized mode',
          affectedCode: 'assert',
          mitigation: 'Use proper exception handling instead of assert'
        });
      }
    }

    return vulnerabilities;
  }

  private logRequest(request: EthicsCheckRequest, approved: boolean, violations: EthicsViolation[]): void {
    this.auditLogs.push({
      timestamp: new Date(),
      requestType: request.requestType,
      userPrompt: request.userPrompt.substring(0, 200), // Truncate for storage
      approved,
      violations,
      userId: request.userContext?.userId
    });

    // Keep only last 1000 logs in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }
}

// ============================================================================
// Export factory function
// ============================================================================

export function createEthicsFramework(): EthicsFramework {
  return new EthicsFramework();
}
