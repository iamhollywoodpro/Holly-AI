/**
 * Safety Guardrails for HOLLY's Self-Improvement System
 * 
 * These rules prevent HOLLY from making dangerous changes to critical systems.
 */

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
}

// Files that HOLLY is NEVER allowed to modify
const RESTRICTED_FILES = [
  // Authentication & Security
  'middleware.ts',
  'app/api/auth/**',
  '.env',
  '.env.local',
  '.env.production',
  
  // Database Schema
  'prisma/schema.prisma',
  'prisma/migrations/**',
  
  // CI/CD & Deployment
  '.github/workflows/**',
  'vercel.json',
  'next.config.js',
  
  // Core Infrastructure
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  
  // Self-Improvement System (prevent recursive modification)
  'src/lib/self-improvement/**',
  'app/api/self-improvement/**',
];

// Files that require HIGH risk level
const HIGH_RISK_FILES = [
  // Core API Routes
  'app/api/chat/**',
  'app/api/user/**',
  
  // Core Libraries
  'src/lib/db.ts',
  'src/lib/ai/**',
  
  // Payment & Billing
  'app/api/billing/**',
  'app/api/payment/**',
];

// Files that require MEDIUM risk level
const MEDIUM_RISK_FILES = [
  // Other API routes
  'app/api/**',
  
  // UI Components
  'app/**/*.tsx',
  'components/**',
];

/**
 * Check if a file path matches any pattern in a list
 */
function matchesPattern(filePath: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regex = new RegExp(
      '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
    );
    return regex.test(filePath);
  });
}

/**
 * Validate if HOLLY is allowed to modify a file
 */
export function validateFileAccess(filePath: string): SafetyCheckResult {
  // Check if file is restricted
  if (matchesPattern(filePath, RESTRICTED_FILES)) {
    return {
      allowed: false,
      reason: `File "${filePath}" is restricted and cannot be modified by self-improvement system. Critical infrastructure files must be manually updated.`
    };
  }
  
  return { allowed: true };
}

/**
 * Validate the risk level for a set of files
 */
export function validateRiskLevel(
  filesChanged: string[],
  declaredRiskLevel: 'low' | 'medium' | 'high'
): SafetyCheckResult {
  const warnings: string[] = [];
  let requiredRiskLevel: 'low' | 'medium' | 'high' = 'low';
  
  for (const file of filesChanged) {
    // Check access first
    const accessCheck = validateFileAccess(file);
    if (!accessCheck.allowed) {
      return accessCheck;
    }
    
    // Determine required risk level
    if (matchesPattern(file, HIGH_RISK_FILES)) {
      requiredRiskLevel = 'high';
      warnings.push(`File "${file}" is high-risk and requires thorough review`);
    } else if (matchesPattern(file, MEDIUM_RISK_FILES) && requiredRiskLevel !== 'high') {
      requiredRiskLevel = 'medium';
      warnings.push(`File "${file}" is medium-risk`);
    }
  }
  
  // Check if declared risk level matches required
  const riskLevels = { low: 1, medium: 2, high: 3 };
  if (riskLevels[declaredRiskLevel] < riskLevels[requiredRiskLevel]) {
    return {
      allowed: false,
      reason: `Risk level mismatch: Files require "${requiredRiskLevel}" risk level, but "${declaredRiskLevel}" was declared. Please reassess the risk.`,
      warnings
    };
  }
  
  return { allowed: true, warnings };
}

/**
 * Validate code changes for security issues
 */
export function validateCodeSafety(codeChanges: Record<string, string>): SafetyCheckResult {
  const warnings: string[] = [];
  
  for (const [filePath, content] of Object.entries(codeChanges)) {
    // Check for hardcoded secrets
    const secretPatterns = [
      /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
      /password\s*=\s*['"][^'"]+['"]/gi,
      /secret\s*=\s*['"][^'"]+['"]/gi,
      /token\s*=\s*['"][^'"]+['"]/gi,
    ];
    
    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        return {
          allowed: false,
          reason: `File "${filePath}" contains hardcoded secrets. All secrets must use environment variables.`
        };
      }
    }
    
    // Check for dangerous operations
    const dangerousPatterns = [
      { pattern: /eval\(/gi, name: 'eval()' },
      { pattern: /exec\(/gi, name: 'exec()' },
      { pattern: /rm\s+-rf/gi, name: 'rm -rf' },
      { pattern: /DROP\s+TABLE/gi, name: 'DROP TABLE' },
      { pattern: /DELETE\s+FROM.*WHERE\s+1\s*=\s*1/gi, name: 'DELETE without proper WHERE clause' },
    ];
    
    for (const { pattern, name } of dangerousPatterns) {
      if (pattern.test(content)) {
        warnings.push(`File "${filePath}" contains potentially dangerous operation: ${name}`);
      }
    }
  }
  
  return { allowed: true, warnings };
}

/**
 * Comprehensive safety check for a self-improvement
 */
export function performSafetyCheck(
  filesChanged: string[],
  codeChanges: Record<string, string>,
  riskLevel: 'low' | 'medium' | 'high'
): SafetyCheckResult {
  // Check file access
  for (const file of filesChanged) {
    const accessCheck = validateFileAccess(file);
    if (!accessCheck.allowed) {
      return accessCheck;
    }
  }
  
  // Check risk level
  const riskCheck = validateRiskLevel(filesChanged, riskLevel);
  if (!riskCheck.allowed) {
    return riskCheck;
  }
  
  // Check code safety
  const codeCheck = validateCodeSafety(codeChanges);
  if (!codeCheck.allowed) {
    return codeCheck;
  }
  
  // Combine all warnings
  const allWarnings = [
    ...(riskCheck.warnings || []),
    ...(codeCheck.warnings || [])
  ];
  
  return {
    allowed: true,
    warnings: allWarnings.length > 0 ? allWarnings : undefined
  };
}
