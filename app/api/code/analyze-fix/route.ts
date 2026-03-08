/**
 * HOLLY AI - Code Analysis & Auto-Fix API
 * 
 * Endpoint for HOLLY to "touch" code, find errors, and fix them
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { autoFixer, errorDetector } from '@/lib/code/auto-fixer';
import { apiError, apiSuccess } from '@/lib/api/responses';
import { aiRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiError.unauthorized();
    }

    // Rate limit
    const rateLimitError = await aiRateLimit(request, userId);
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { 
      code, 
      filePath = 'untitled.ts',
      autoFix = true,
      checkSecurity = true,
      checkPerformance = true,
      checkSyntax = true,
      checkImports = true,
    } = body;

    if (!code) {
      return apiError.badRequest('Code is required');
    }

    // Validate code length
    if (code.length > 100000) {
      return apiError.badRequest('Code too large. Maximum: 100KB');
    }

    // Analyze and optionally fix
    const result = await autoFixer.analyzeAndFix(code, filePath, {
      autoFix,
      checkSecurity,
      checkPerformance,
      checkSyntax,
      checkImports,
    });

    const response: any = {
      analysis: {
        score: result.analysis.score,
        summary: result.analysis.summary,
        errors: result.analysis.errors.map(e => ({
          type: e.type,
          severity: e.severity,
          message: e.message,
          line: e.line,
          autoFixable: e.fix?.autoFixable || false,
          suggestion: e.fix?.suggestion,
        })),
        warnings: result.analysis.warnings.map(w => ({
          type: w.type,
          message: w.message,
          line: w.line,
          suggestion: w.fix?.suggestion,
        })),
        suggestions: result.analysis.suggestions.map(s => ({
          type: s.type,
          message: s.message,
          line: s.line,
        })),
        metrics: result.analysis.metrics,
      },
    };

    // Include fix results if auto-fix was applied
    if (result.fixResult) {
      response.fix = {
        success: result.fixResult.success,
        changesCount: result.fixResult.changes.length,
        changes: result.fixResult.changes.map(c => ({
          line: c.line,
          description: c.description,
          type: c.type,
        })),
        remainingIssues: result.fixResult.remainingIssues.length,
        summary: result.fixResult.summary,
      };

      // Only include full code if fixes were applied
      if (result.fixResult.success) {
        response.fixedCode = result.fixResult.fixedCode;
      }
    }

    return apiSuccess.ok(response);
  } catch (error) {
    console.error('Code analysis error:', error);
    return apiError.internal('Code analysis failed');
  }
}

export async function GET(request: NextRequest) {
  return apiSuccess.ok({
    message: 'HOLLY Code Analysis & Auto-Fix API',
    description: 'Let HOLLY touch your code to find and fix errors',
    features: [
      'Security vulnerability detection',
      'Performance issue identification',
      'Syntax and type error detection',
      'Import/export validation',
      'Automatic error fixing',
      'Code quality scoring',
    ],
    checks: {
      security: 'SQL injection, XSS, hardcoded secrets, etc.',
      performance: 'N+1 queries, memory leaks, bundle size',
      syntax: 'TypeScript/JavaScript errors, typos',
      imports: 'Unused imports, missing modules',
    },
    usage: {
      'POST /api/code/analyze-fix': {
        'code': 'Source code to analyze (required)',
        'filePath': 'File path for context (default: untitled.ts)',
        'autoFix': 'Auto-fix issues (default: true)',
        'checkSecurity': 'Run security checks (default: true)',
        'checkPerformance': 'Run performance checks (default: true)',
        'checkSyntax': 'Run syntax checks (default: true)',
        'checkImports': 'Run import checks (default: true)',
      },
    },
    response: {
      'analysis.score': 'Code quality score (0-100)',
      'analysis.errors': 'Critical issues found',
      'analysis.warnings': 'Non-critical issues',
      'analysis.suggestions': 'Improvement suggestions',
      'fix.changes': 'Changes applied by auto-fix',
      'fix.fixedCode': 'Corrected code (if autoFix: true)',
    },
  });
}
