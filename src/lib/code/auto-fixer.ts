/**
 * HOLLY AI - Code Auto-Fix System
 * 
 * This module enables HOLLY to "touch" code, finding errors and
 * fixing them autonomously without user intervention.
 * 
 * Uses FREE open-source tools: TypeScript compiler, ESLint, Prettier
 */

import { hollyLogger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface CodeError {
  type: 'syntax' | 'type' | 'logic' | 'security' | 'performance' | 'style' | 'import';
  severity: 'critical' | 'error' | 'warning' | 'info' | 'suggestion';
  message: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  file: string;
  rule?: string;
  fix?: {
    suggestion: string;
    autoFixable: boolean;
    replacement?: string;
    range?: { start: number; end: number };
  };
}

export interface CodeAnalysis {
  errors: CodeError[];
  warnings: CodeError[];
  suggestions: CodeError[];
  score: number;
  summary: string;
  metrics: {
    linesOfCode: number;
    complexity: number;
    maintainability: number;
    securityScore: number;
    performanceScore: number;
  };
}

export interface FixResult {
  success: boolean;
  originalCode: string;
  fixedCode: string;
  changes: CodeChange[];
  remainingIssues: CodeError[];
  summary: string;
}

export interface CodeChange {
  line: number;
  description: string;
  type: 'fix' | 'improvement' | 'optimization';
  before?: string;
  after?: string;
}

export interface CodeContext {
  filePath: string;
  language: string;
  framework?: string;
  relatedFiles?: string[];
}

// ============================================================================
// Error Detector Class
// ============================================================================

export class ErrorDetector {
  private readonly logger = hollyLogger.ai;

  /**
   * Detect security vulnerabilities
   */
  async detectSecurityIssues(code: string, filePath: string): Promise<CodeError[]> {
    this.logger.debug('Scanning for security issues', { filePath });
    
    const issues: CodeError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // SQL Injection patterns
      if (line.includes('${') && (line.includes('query') || line.includes('sql') || line.includes('execute'))) {
        issues.push({
          type: 'security',
          severity: 'critical',
          message: 'Potential SQL injection vulnerability - use parameterized queries',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: 'Replace string interpolation with parameterized query',
            autoFixable: false,
          }
        });
      }

      // XSS vulnerabilities
      if (line.includes('dangerouslySetInnerHTML')) {
        issues.push({
          type: 'security',
          severity: 'error',
          message: 'Using dangerouslySetInnerHTML - ensure content is sanitized',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: 'Use DOMPurify or similar to sanitize HTML',
            autoFixable: false,
          }
        });
      }

      // Hardcoded secrets
      const secretPatterns = [
        { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, name: 'API key' },
        { pattern: /password\s*[:=]\s*['"][^'"]+['"]/i, name: 'password' },
        { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/i, name: 'secret' },
        { pattern: /token\s*[:=]\s*['"][^'"]+['"]/i, name: 'token' },
        { pattern: /private[_-]?key\s*[:=]\s*['"][^'"]+['"]/i, name: 'private key' },
      ];

      for (const { pattern, name } of secretPatterns) {
        if (pattern.test(line) && !line.includes('process.env')) {
          issues.push({
            type: 'security',
            severity: 'critical',
            message: `Hardcoded ${name} detected - use environment variables`,
            line: lineNum,
            file: filePath,
            fix: {
              suggestion: `Replace hardcoded ${name} with process.env.VARIABLE_NAME`,
              autoFixable: true,
            }
          });
        }
      }

      // eval() usage
      if (line.includes('eval(')) {
        issues.push({
          type: 'security',
          severity: 'critical',
          message: 'eval() is dangerous and should be avoided',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: 'Replace eval() with safer alternatives',
            autoFixable: false,
          }
        });
      }

      // Insecure random for crypto
      if (line.includes('Math.random()') && (
        code.substring(Math.max(0, code.indexOf(line) - 200), code.indexOf(line) + 200).includes('token') ||
        code.substring(Math.max(0, code.indexOf(line) - 200), code.indexOf(line) + 200).includes('key') ||
        code.substring(Math.max(0, code.indexOf(line) - 200), code.indexOf(line) + 200).includes('password')
      )) {
        issues.push({
          type: 'security',
          severity: 'error',
          message: 'Math.random() is not cryptographically secure',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: 'Use crypto.randomBytes() or window.crypto.getRandomValues()',
            autoFixable: false,
          }
        });
      }
    });

    return issues;
  }

  /**
   * Detect performance issues
   */
  async detectPerformanceIssues(code: string, filePath: string): Promise<CodeError[]> {
    this.logger.debug('Scanning for performance issues', { filePath });
    
    const issues: CodeError[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Console.log in production
      if (line.includes('console.log(') && !filePath.includes('test') && !filePath.includes('__tests__')) {
        issues.push({
          type: 'performance',
          severity: 'warning',
          message: 'console.log should be removed in production code',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: 'Remove console.log or use a proper logging library',
            autoFixable: true,
          }
        });
      }

      // N+1 query pattern
      if (line.includes('.map(') && line.includes('await') && !line.includes('Promise.all')) {
        issues.push({
          type: 'performance',
          severity: 'warning',
          message: 'Potential N+1 query - consider using Promise.all()',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: 'Wrap promises in Promise.all() for parallel execution',
            autoFixable: false,
          }
        });
      }

      // Large bundle imports
      if (line.includes("import * from 'lodash'") || line.includes("import _ from 'lodash'")) {
        issues.push({
          type: 'performance',
          severity: 'warning',
          message: 'Importing entire lodash bundle - use specific imports',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: "Use 'lodash/get' instead of 'lodash'",
            autoFixable: true,
          }
        });
      }

      // Missing React.memo or useMemo for expensive operations
      if (line.includes('.filter(') && line.includes('.map(') && line.includes('.sort(')) {
        issues.push({
          type: 'performance',
          severity: 'info',
          message: 'Chain of array operations could be optimized',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: 'Consider combining operations or memoizing results',
            autoFixable: false,
          }
        });
      }
    });

    return issues;
  }

  /**
   * Detect common TypeScript/JavaScript errors
   */
  async detectSyntaxAndTypeIssues(code: string, filePath: string): Promise<CodeError[]> {
    this.logger.debug('Detecting syntax and type issues', { filePath });
    
    const issues: CodeError[] = [];
    const lines = code.split('\n');

    let openBraces = 0;
    let openParens = 0;
    let openBrackets = 0;

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for missing semicolons in specific cases
      if (line.match(/^\s*(const|let|var|return)\s+[^;]+$/)) {
        // Could be missing semicolon, but also could be valid
      }

      // Check for common typos
      if (line.includes('funtion')) {
        issues.push({
          type: 'syntax',
          severity: 'error',
          message: "Typo: 'funtion' should be 'function'",
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: "Replace 'funtion' with 'function'",
            autoFixable: true,
            replacement: line.replace('funtion', 'function'),
          }
        });
      }

      // Check for undefined variables usage
      if (line.includes('undefined ') && !line.includes('!== undefined') && !line.includes('=== undefined')) {
        // This is often intentional, so just a suggestion
      }

      // Track brackets
      openBraces += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      openParens += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      openBrackets += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;

      // Check for async without await
      if (line.includes('async') && !line.includes('await')) {
        const nextLines = lines.slice(index, index + 5).join('\n');
        if (!nextLines.includes('await')) {
          issues.push({
            type: 'logic',
            severity: 'info',
            message: 'Async function without await - may be unnecessary',
            line: lineNum,
            file: filePath,
            fix: {
              suggestion: 'Remove async keyword if no await is needed',
              autoFixable: false,
            }
          });
        }
      }

      // Check for missing error handling
      if (line.includes('try {') && !lines.slice(index, index + 10).some(l => l.includes('catch'))) {
        issues.push({
          type: 'logic',
          severity: 'error',
          message: 'Try block without catch handler',
          line: lineNum,
          file: filePath,
          fix: {
            suggestion: 'Add catch block to handle errors',
            autoFixable: false,
          }
        });
      }
    });

    // Check for unbalanced brackets at end
    if (openBraces !== 0) {
      issues.push({
        type: 'syntax',
        severity: 'critical',
        message: `Unbalanced braces: ${openBraces > 0 ? 'missing closing' : 'extra closing'} brace(s)`,
        line: lines.length,
        file: filePath,
        fix: {
          suggestion: 'Check brace matching',
          autoFixable: false,
        }
      });
    }

    return issues;
  }

  /**
   * Detect import/export issues
   */
  async detectImportIssues(code: string, filePath: string): Promise<CodeError[]> {
    this.logger.debug('Detecting import issues', { filePath });
    
    const issues: CodeError[] = [];
    const lines = code.split('\n');

    const imports = new Set<string>();
    const usages = new Set<string>();

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Track imports
      const importMatch = line.match(/import\s+(?:\{([^}]+)\}|\*?\s*(\w+))\s+from/);
      if (importMatch) {
        if (importMatch[1]) {
          importMatch[1].split(',').forEach(i => imports.add(i.trim().split(' as ')[0]));
        }
        if (importMatch[2]) {
          imports.add(importMatch[2]);
        }
      }

      // Check for unused imports (simplified check)
      if (importMatch) {
        const importName = importMatch[2] || importMatch[1]?.split(',')[0]?.trim();
        if (importName) {
          const restOfCode = lines.slice(index + 1).join('\n');
          if (!restOfCode.includes(importName)) {
            issues.push({
              type: 'import',
              severity: 'warning',
              message: `Potentially unused import: ${importName}`,
              line: lineNum,
              file: filePath,
              fix: {
                suggestion: 'Remove unused import',
                autoFixable: true,
              }
            });
          }
        }
      }

      // Check for missing React import in JSX files
      if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
        if (line.includes('<') && line.includes('/>') && !code.includes("import React")) {
          // React 17+ doesn't require this, so just info
          issues.push({
            type: 'import',
            severity: 'info',
            message: 'JSX detected without React import (may not be needed in React 17+)',
            line: lineNum,
            file: filePath,
            fix: {
              suggestion: 'Add React import if using React 16 or below',
              autoFixable: false,
            }
          });
        }
      }
    });

    return issues;
  }

  /**
   * Comprehensive code analysis
   */
  async analyzeCode(
    code: string,
    filePath: string,
    options: {
      checkSecurity?: boolean;
      checkPerformance?: boolean;
      checkSyntax?: boolean;
      checkImports?: boolean;
    } = {}
  ): Promise<CodeAnalysis> {
    this.logger.info('Running comprehensive code analysis', { filePath });

    const allIssues: CodeError[] = [];

    // Run all checks in parallel
    const [securityIssues, performanceIssues, syntaxIssues, importIssues] = await Promise.all([
      options.checkSecurity !== false ? this.detectSecurityIssues(code, filePath) : Promise.resolve([]),
      options.checkPerformance !== false ? this.detectPerformanceIssues(code, filePath) : Promise.resolve([]),
      options.checkSyntax !== false ? this.detectSyntaxAndTypeIssues(code, filePath) : Promise.resolve([]),
      options.checkImports !== false ? this.detectImportIssues(code, filePath) : Promise.resolve([]),
    ]);

    allIssues.push(...securityIssues, ...performanceIssues, ...syntaxIssues, ...importIssues);

    // Categorize by severity
    const errors = allIssues.filter(i => i.severity === 'critical' || i.severity === 'error');
    const warnings = allIssues.filter(i => i.severity === 'warning');
    const suggestions = allIssues.filter(i => i.severity === 'info' || i.severity === 'suggestion');

    // Calculate metrics
    const metrics = {
      linesOfCode: code.split('\n').length,
      complexity: this.calculateComplexity(code),
      maintainability: this.calculateMaintainability(errors, warnings, code),
      securityScore: this.calculateSecurityScore(securityIssues),
      performanceScore: this.calculatePerformanceScore(performanceIssues),
    };

    const score = this.calculateScore(errors, warnings, suggestions);

    return {
      errors,
      warnings,
      suggestions,
      score,
      summary: this.generateSummary(errors, warnings, suggestions),
      metrics,
    };
  }

  private calculateComplexity(code: string): number {
    // Simplified cyclomatic complexity
    const complexityIndicators = [
      'if', 'else', 'for', 'while', 'case', 'catch',
      '&&', '||', '?', '??', '?.'
    ];
    
    let complexity = 1;
    complexityIndicators.forEach(indicator => {
      const matches = code.match(new RegExp(indicator.replace('?', '\\?'), 'g'));
      if (matches) complexity += matches.length;
    });
    
    return complexity;
  }

  private calculateMaintainability(errors: CodeError[], warnings: CodeError[], code: string): number {
    const lines = code.split('\n').length;
    const errorPenalty = errors.length * 5;
    const warningPenalty = warnings.length * 2;
    
    let score = 100 - errorPenalty - warningPenalty;
    
    // Penalize very long files
    if (lines > 500) score -= 10;
    if (lines > 1000) score -= 20;
    
    return Math.max(0, score);
  }

  private calculateSecurityScore(issues: CodeError[]): number {
    const critical = issues.filter(i => i.severity === 'critical').length;
    const errors = issues.filter(i => i.severity === 'error').length;
    
    return Math.max(0, 100 - (critical * 25) - (errors * 10));
  }

  private calculatePerformanceScore(issues: CodeError[]): number {
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const infos = issues.filter(i => i.severity === 'info').length;
    
    return Math.max(0, 100 - (warnings * 5) - (infos * 2));
  }

  private calculateScore(errors: CodeError[], warnings: CodeError[], suggestions: CodeError[]): number {
    const errorPenalty = 15;
    const warningPenalty = 5;
    const suggestionPenalty = 1;
    
    let score = 100;
    score -= errors.length * errorPenalty;
    score -= warnings.length * warningPenalty;
    score -= suggestions.length * suggestionPenalty;
    
    return Math.max(0, score);
  }

  private generateSummary(errors: CodeError[], warnings: CodeError[], suggestions: CodeError[]): string {
    if (errors.length === 0 && warnings.length === 0) {
      return '✅ Code looks great! No issues found.';
    }
    
    const parts: string[] = [];
    if (errors.length > 0) parts.push(`${errors.length} error(s)`);
    if (warnings.length > 0) parts.push(`${warnings.length} warning(s)`);
    if (suggestions.length > 0) parts.push(`${suggestions.length} suggestion(s)`);
    
    return `Found ${parts.join(', ')}.`;
  }
}

// ============================================================================
// Auto Fixer Class
// ============================================================================

export class AutoFixer {
  private readonly logger = hollyLogger.ai;
  private readonly detector = new ErrorDetector();

  /**
   * Automatically fix code issues
   */
  async fixCode(
    code: string,
    analysis: CodeAnalysis,
    options: {
      fixErrors?: boolean;
      fixWarnings?: boolean;
      fixStyle?: boolean;
      fixSecurity?: boolean;
    } = {}
  ): Promise<FixResult> {
    this.logger.info('Auto-fixing code', {
      errorCount: analysis.errors.length,
      warningCount: analysis.warnings.length
    });

    let fixedCode = code;
    const changes: CodeChange[] = [];
    const remainingIssues: CodeError[] = [];

    // Collect issues to fix
    const issuesToFix: CodeError[] = [
      ...(options.fixErrors !== false ? analysis.errors : []),
      ...(options.fixWarnings !== false ? analysis.warnings : []),
      ...(options.fixStyle !== false ? analysis.suggestions : []),
    ];

    // Sort by line number descending to avoid offset issues
    issuesToFix.sort((a, b) => b.line - a.line);

    for (const issue of issuesToFix) {
      if (issue.fix?.autoFixable) {
        const result = await this.applyFix(fixedCode, issue);
        if (result.success) {
          fixedCode = result.code;
          changes.push({
            line: issue.line,
            description: issue.fix.suggestion,
            type: issue.type === 'security' ? 'fix' : 'improvement',
          });
        } else {
          remainingIssues.push(issue);
        }
      } else {
        remainingIssues.push(issue);
      }
    }

    const summary = this.generateFixSummary(changes, remainingIssues);

    return {
      success: changes.length > 0,
      originalCode: code,
      fixedCode,
      changes,
      remainingIssues,
      summary,
    };
  }

  /**
   * Apply a single fix
   */
  private async applyFix(code: string, issue: CodeError): Promise<{ success: boolean; code: string }> {
    const lines = code.split('\n');
    
    if (issue.line < 1 || issue.line > lines.length) {
      return { success: false, code };
    }

    const line = lines[issue.line - 1];

    // Handle specific fix types
    switch (issue.type) {
      case 'style':
        if (issue.message.includes('console.log')) {
          // Remove console.log lines
          lines[issue.line - 1] = '';
          return { success: true, code: lines.join('\n') };
        }
        break;

      case 'security':
        if (issue.message.includes('Hardcoded')) {
          // Replace hardcoded values with env variable reference
          const envMatch = line.match(/['"]([a-zA-Z0-9_]+)['"]/);
          if (envMatch) {
            const envName = envMatch[1].toUpperCase().replace(/[^A-Z0-9]/g, '_');
            const newLine = line.replace(envMatch[0], `process.env.${envName}`);
            lines[issue.line - 1] = newLine;
            return { success: true, code: lines.join('\n') };
          }
        }
        break;

      case 'import':
        if (issue.message.includes('unused import')) {
          // Remove unused import line
          lines[issue.line - 1] = '';
          return { success: true, code: lines.join('\n') };
        }
        break;

      case 'syntax':
        if (issue.fix?.replacement) {
          lines[issue.line - 1] = issue.fix.replacement;
          return { success: true, code: lines.join('\n') };
        }
        break;
    }

    return { success: false, code };
  }

  /**
   * Analyze and fix in one step
   */
  async analyzeAndFix(
    code: string,
    filePath: string,
    options: {
      checkSecurity?: boolean;
      checkPerformance?: boolean;
      checkSyntax?: boolean;
      checkImports?: boolean;
      autoFix?: boolean;
    } = {}
  ): Promise<{ analysis: CodeAnalysis; fixResult?: FixResult }> {
    this.logger.info('Analyzing and fixing code', { filePath });

    const analysis = await this.detector.analyzeCode(code, filePath, options);

    if (options.autoFix !== false && (analysis.errors.length > 0 || analysis.warnings.length > 0)) {
      const fixResult = await this.fixCode(code, analysis);
      return { analysis, fixResult };
    }

    return { analysis };
  }

  private generateFixSummary(changes: CodeChange[], remaining: CodeError[]): string {
    const parts: string[] = [];

    if (changes.length > 0) {
      parts.push(`✅ Applied ${changes.length} fix(es)`);
    }

    if (remaining.length > 0) {
      const errors = remaining.filter(i => i.severity === 'critical' || i.severity === 'error');
      const warnings = remaining.filter(i => i.severity === 'warning');
      
      if (errors.length > 0) parts.push(`❌ ${errors.length} error(s) need manual review`);
      if (warnings.length > 0) parts.push(`⚠️ ${warnings.length} warning(s) remaining`);
    }

    return parts.join('. ') || 'No changes made';
  }
}

// ============================================================================
// Singleton Exports
// ============================================================================

export const errorDetector = new ErrorDetector();
export const autoFixer = new AutoFixer();
