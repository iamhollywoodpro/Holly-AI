/**
 * Code Review Assistant - AI-Powered Code Analysis
 * Analyzes code before commits to catch bugs, suggest improvements, and ensure quality
 */

import type { GitHubFile } from './github-api';

export type IssueSeverity = 'error' | 'warning' | 'info' | 'suggestion';

export type IssueCategory = 
  | 'syntax'
  | 'security'
  | 'performance'
  | 'best-practice'
  | 'style'
  | 'documentation'
  | 'accessibility'
  | 'testing';

export interface CodeIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  file: string;
  line?: number;
  column?: number;
  suggestion?: string; // How to fix it
  autoFixable?: boolean;
}

export interface CodeReviewResult {
  files: string[];
  issues: CodeIssue[];
  summary: {
    errors: number;
    warnings: number;
    suggestions: number;
    score: number; // 0-100
  };
  recommendations: string[];
  estimatedReviewTime: string; // "2 minutes"
}

/**
 * Analyze code files for issues and suggestions
 */
export async function reviewCode(files: GitHubFile[]): Promise<CodeReviewResult> {
  const issues: CodeIssue[] = [];
  const recommendations: string[] = [];

  // Analyze each file
  for (const file of files) {
    const fileIssues = analyzeFile(file);
    issues.push(...fileIssues);
  }

  // Generate recommendations based on issues
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const suggestionCount = issues.filter(i => i.severity === 'suggestion' || i.severity === 'info').length;

  if (errorCount > 0) {
    recommendations.push(`Fix ${errorCount} critical error${errorCount > 1 ? 's' : ''} before committing`);
  }

  if (warningCount > 3) {
    recommendations.push('Consider addressing warnings to improve code quality');
  }

  if (issues.some(i => i.category === 'security')) {
    recommendations.push('⚠️ Security issues detected - review carefully');
  }

  if (issues.some(i => i.category === 'performance')) {
    recommendations.push('Performance optimizations available');
  }

  // Calculate code quality score (0-100)
  const score = calculateQualityScore(issues, files.length);

  // Estimate review time
  const totalLines = files.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0);
  const estimatedMinutes = Math.max(2, Math.ceil(totalLines / 50));
  const estimatedReviewTime = estimatedMinutes === 1 ? '1 minute' : `${estimatedMinutes} minutes`;

  return {
    files: files.map(f => f.path),
    issues,
    summary: {
      errors: errorCount,
      warnings: warningCount,
      suggestions: suggestionCount,
      score,
    },
    recommendations,
    estimatedReviewTime,
  };
}

/**
 * Analyze a single file for issues
 */
function analyzeFile(file: GitHubFile): CodeIssue[] {
  const issues: CodeIssue[] = [];
  const content = file.content || '';
  const lines = content.split('\n');
  const ext = file.path.split('.').pop()?.toLowerCase();

  // Syntax & Basic Checks
  issues.push(...checkSyntax(file, content, lines, ext));

  // Security Checks
  issues.push(...checkSecurity(file, content, lines, ext));

  // Performance Checks
  issues.push(...checkPerformance(file, content, lines, ext));

  // Best Practices
  issues.push(...checkBestPractices(file, content, lines, ext));

  // Code Style
  issues.push(...checkCodeStyle(file, content, lines, ext));

  return issues;
}

/**
 * Check for syntax issues
 */
function checkSyntax(file: GitHubFile, content: string, lines: string[], ext?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];

  // Check for common syntax errors
  if (ext === 'js' || ext === 'ts' || ext === 'jsx' || ext === 'tsx') {
    // Unclosed brackets
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push({
        id: `${file.path}-syntax-braces`,
        category: 'syntax',
        severity: 'error',
        title: 'Unclosed braces',
        description: `Found ${openBraces} opening braces but ${closeBraces} closing braces`,
        file: file.path,
        suggestion: 'Ensure all braces are properly closed',
        autoFixable: false,
      });
    }

    // console.log statements
    lines.forEach((line, idx) => {
      if (line.includes('console.log')) {
        issues.push({
          id: `${file.path}-console-${idx}`,
          category: 'best-practice',
          severity: 'warning',
          title: 'Console statement found',
          description: 'console.log statement detected',
          file: file.path,
          line: idx + 1,
          suggestion: 'Remove console.log before committing or use a proper logging library',
          autoFixable: true,
        });
      }
    });
  }

  return issues;
}

/**
 * Check for security vulnerabilities
 */
function checkSecurity(file: GitHubFile, content: string, lines: string[], ext?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];

  // Hardcoded credentials
  const credentialPatterns = [
    /password\s*=\s*["'][^"']+["']/gi,
    /api[_-]?key\s*=\s*["'][^"']+["']/gi,
    /secret\s*=\s*["'][^"']+["']/gi,
    /token\s*=\s*["'][^"']+["']/gi,
  ];

  lines.forEach((line, idx) => {
    credentialPatterns.forEach((pattern, patternIdx) => {
      if (pattern.test(line)) {
        issues.push({
          id: `${file.path}-security-creds-${idx}-${patternIdx}`,
          category: 'security',
          severity: 'error',
          title: 'Hardcoded credentials detected',
          description: 'Potential credentials found in code',
          file: file.path,
          line: idx + 1,
          suggestion: 'Use environment variables or a secrets manager instead',
          autoFixable: false,
        });
      }
    });
  });

  // eval() usage
  if (content.includes('eval(')) {
    issues.push({
      id: `${file.path}-security-eval`,
      category: 'security',
      severity: 'error',
      title: 'Unsafe eval() usage',
      description: 'eval() can execute arbitrary code and is a security risk',
      file: file.path,
      suggestion: 'Avoid eval() and use safer alternatives',
      autoFixable: false,
    });
  }

  // SQL injection risks
  if (content.match(/query\s*\(\s*[`'"]/gi) && content.includes('${')) {
    issues.push({
      id: `${file.path}-security-sql`,
      category: 'security',
      severity: 'warning',
      title: 'Potential SQL injection risk',
      description: 'String interpolation in SQL queries can be unsafe',
      file: file.path,
      suggestion: 'Use parameterized queries or an ORM instead',
      autoFixable: false,
    });
  }

  return issues;
}

/**
 * Check for performance issues
 */
function checkPerformance(file: GitHubFile, content: string, lines: string[], ext?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];

  // Nested loops
  const nestedLoopPattern = /for\s*\([^)]+\)\s*{[^}]*for\s*\([^)]+\)/gs;
  if (nestedLoopPattern.test(content)) {
    issues.push({
      id: `${file.path}-perf-nested-loop`,
      category: 'performance',
      severity: 'info',
      title: 'Nested loops detected',
      description: 'Nested loops can have O(n²) complexity',
      file: file.path,
      suggestion: 'Consider optimizing with maps, sets, or better algorithms',
      autoFixable: false,
    });
  }

  // Large array operations
  if (ext === 'js' || ext === 'ts') {
    lines.forEach((line, idx) => {
      if (line.match(/\.map\([^)]+\)\.filter\([^)]+\)/)) {
        issues.push({
          id: `${file.path}-perf-chain-${idx}`,
          category: 'performance',
          severity: 'suggestion',
          title: 'Chained array operations',
          description: 'Multiple array iterations can be combined',
          file: file.path,
          line: idx + 1,
          suggestion: 'Consider combining map+filter into a single reduce for better performance',
          autoFixable: false,
        });
      }
    });
  }

  return issues;
}

/**
 * Check for best practice violations
 */
function checkBestPractices(file: GitHubFile, content: string, lines: string[], ext?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];

  // Missing error handling
  if (content.includes('async ') && !content.includes('try') && !content.includes('catch')) {
    issues.push({
      id: `${file.path}-bp-error-handling`,
      category: 'best-practice',
      severity: 'warning',
      title: 'Missing error handling',
      description: 'Async function without try/catch',
      file: file.path,
      suggestion: 'Add try/catch blocks to handle async errors',
      autoFixable: false,
    });
  }

  // TODO comments
  lines.forEach((line, idx) => {
    if (line.match(/\/\/\s*TODO/i) || line.match(/\/\*\s*TODO/i)) {
      issues.push({
        id: `${file.path}-bp-todo-${idx}`,
        category: 'documentation',
        severity: 'info',
        title: 'TODO comment found',
        description: 'Unfinished work noted',
        file: file.path,
        line: idx + 1,
        suggestion: 'Complete TODO items before committing',
        autoFixable: false,
      });
    }
  });

  return issues;
}

/**
 * Check code style
 */
function checkCodeStyle(file: GitHubFile, content: string, lines: string[], ext?: string): CodeIssue[] {
  const issues: CodeIssue[] = [];

  // Very long lines
  lines.forEach((line, idx) => {
    if (line.length > 120) {
      issues.push({
        id: `${file.path}-style-line-length-${idx}`,
        category: 'style',
        severity: 'suggestion',
        title: 'Long line',
        description: `Line is ${line.length} characters (recommend <120)`,
        file: file.path,
        line: idx + 1,
        suggestion: 'Break long lines for better readability',
        autoFixable: false,
      });
    }
  });

  return issues;
}

/**
 * Calculate code quality score (0-100)
 */
function calculateQualityScore(issues: CodeIssue[], fileCount: number): number {
  let score = 100;

  // Deduct points for issues
  issues.forEach(issue => {
    switch (issue.severity) {
      case 'error':
        score -= 10;
        break;
      case 'warning':
        score -= 5;
        break;
      case 'info':
      case 'suggestion':
        score -= 1;
        break;
    }
  });

  // Bonus for clean code
  if (issues.length === 0) {
    score = 100;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: IssueSeverity): string {
  switch (severity) {
    case 'error':
      return 'text-red-400';
    case 'warning':
      return 'text-yellow-400';
    case 'info':
      return 'text-blue-400';
    case 'suggestion':
      return 'text-gray-400';
  }
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: IssueCategory): string {
  switch (category) {
    case 'syntax':
      return '🔧';
    case 'security':
      return '🔒';
    case 'performance':
      return '⚡';
    case 'best-practice':
      return '✨';
    case 'style':
      return '🎨';
    case 'documentation':
      return '📝';
    case 'accessibility':
      return '♿';
    case 'testing':
      return '🧪';
  }
}
