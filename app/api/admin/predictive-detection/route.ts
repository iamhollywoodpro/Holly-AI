/**
 * Predictive Issue Detection API Route
 * Phase 4A - Predict issues before they happen using ML and rule-based patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

interface PredictionInput {
  filePath?: string;
  codeChanges?: any[];
  performanceData?: any[];
  historicalIssues?: any[];
}

interface PatternMatch {
  pattern: string;
  confidence: number;
  reasoning: string;
}

/**
 * Pattern-based prediction rules
 */
const PREDICTION_PATTERNS = {
  // Performance degradation patterns
  performance_degradation: [
    {
      pattern: 'increasing_response_time',
      check: (data: any) => {
        const recent = data.slice(-5);
        return recent.every((d: any, i: number) => i === 0 || d.responseTime > recent[i - 1].responseTime);
      },
      severity: 'high',
      confidence: 0.85
    },
    {
      pattern: 'memory_growth',
      check: (data: any) => {
        const recent = data.slice(-5);
        return recent.every((d: any, i: number) => i === 0 || d.memoryUsage > recent[i - 1].memoryUsage);
      },
      severity: 'critical',
      confidence: 0.90
    }
  ],

  // Bug risk patterns
  bug_risk: [
    {
      pattern: 'high_complexity_without_tests',
      check: (file: any) => {
        return file.complexity > 15 && file.testCoverage < 50;
      },
      severity: 'high',
      confidence: 0.75
    },
    {
      pattern: 'rapid_changes',
      check: (changes: any[]) => {
        const recentChanges = changes.filter((c: any) => 
          Date.now() - new Date(c.committedAt).getTime() < 24 * 60 * 60 * 1000
        );
        return recentChanges.length > 5;
      },
      severity: 'medium',
      confidence: 0.70
    },
    {
      pattern: 'error_prone_pattern',
      check: (issues: any[]) => {
        const errorCount = issues.filter((i: any) => 
          i.severity === 'critical' && 
          Date.now() - new Date(i.firstDetected).getTime() < 7 * 24 * 60 * 60 * 1000
        ).length;
        return errorCount > 2;
      },
      severity: 'high',
      confidence: 0.80
    }
  ],

  // Complexity increase patterns
  complexity_increase: [
    {
      pattern: 'nested_conditionals',
      check: (code: string) => {
        const ifCount = (code.match(/if\s*\(/g) || []).length;
        const depth = code.split('\n').filter(line => 
          line.trim().startsWith('if') || line.trim().startsWith('else')
        ).length;
        return ifCount > 5 || depth > 4;
      },
      severity: 'medium',
      confidence: 0.65
    },
    {
      pattern: 'large_function',
      check: (code: string) => {
        const lines = code.split('\n').length;
        return lines > 100;
      },
      severity: 'medium',
      confidence: 0.70
    }
  ],

  // Security vulnerability patterns
  security_vulnerability: [
    {
      pattern: 'hardcoded_credentials',
      check: (code: string) => {
        return /password\s*=\s*["']|api[_-]?key\s*=\s*["']|secret\s*=\s*["']/i.test(code);
      },
      severity: 'critical',
      confidence: 0.95
    },
    {
      pattern: 'sql_injection_risk',
      check: (code: string) => {
        return /execute\s*\(\s*["'`].*\$\{|query\s*\(\s*["'`].*\$\{/i.test(code);
      },
      severity: 'critical',
      confidence: 0.85
    },
    {
      pattern: 'xss_risk',
      check: (code: string) => {
        return /innerHTML\s*=|dangerouslySetInnerHTML/i.test(code);
      },
      severity: 'high',
      confidence: 0.75
    }
  ]
};

/**
 * Predict performance degradation
 */
async function predictPerformanceDegradation(filePath: string): Promise<PatternMatch[]> {
  const matches: PatternMatch[] = [];

  // Get recent performance data
  const recentIssues = await prisma.performanceIssue.findMany({
    where: { 
      endpoint: { contains: filePath },
      firstDetected: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      }
    },
    orderBy: { firstDetected: 'desc' },
    take: 10
  });

  if (recentIssues.length > 0) {
    // Check for increasing response time trend
    const responseTimes = recentIssues.map(i => i.avgResponseTime);
    const isIncreasing = responseTimes.every((time, i) => 
      i === 0 || time >= responseTimes[i - 1]
    );

    if (isIncreasing) {
      matches.push({
        pattern: 'increasing_response_time',
        confidence: 0.85,
        reasoning: `Response time has been steadily increasing over ${recentIssues.length} recent measurements`
      });
    }

    // Check for high error rate
    const avgErrorRate = recentIssues.reduce((sum, i) => sum + i.errorRate, 0) / recentIssues.length;
    if (avgErrorRate > 0.05) {
      matches.push({
        pattern: 'high_error_rate',
        confidence: 0.80,
        reasoning: `Average error rate of ${(avgErrorRate * 100).toFixed(2)}% detected`
      });
    }
  }

  return matches;
}

/**
 * Predict bug risk
 */
async function predictBugRisk(filePath: string): Promise<PatternMatch[]> {
  const matches: PatternMatch[] = [];

  // Get recent code changes
  const recentChanges = await prisma.codeChange.findMany({
    where: {
      changedFiles: { path: ['some', 'filename'], string_contains: filePath }
    },
    orderBy: { committedAt: 'desc' },
    take: 10
  });

  // Check for rapid changes (high churn)
  const recentChangesLast24h = recentChanges.filter(c => 
    Date.now() - new Date(c.committedAt).getTime() < 24 * 60 * 60 * 1000
  );

  if (recentChangesLast24h.length > 5) {
    matches.push({
      pattern: 'high_churn',
      confidence: 0.75,
      reasoning: `${recentChangesLast24h.length} changes in last 24 hours indicates high churn`
    });
  }

  // Check for failed self-healing attempts
  const failedHealing = await prisma.selfHealingAction.findMany({
    where: {
      affectedFiles: { has: filePath },
      success: false,
      detectedAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  });

  if (failedHealing.length > 2) {
    matches.push({
      pattern: 'repeated_healing_failures',
      confidence: 0.80,
      reasoning: `${failedHealing.length} failed self-healing attempts suggest underlying issues`
    });
  }

  return matches;
}

/**
 * Predict complexity increase
 */
async function predictComplexityIncrease(filePath: string): Promise<PatternMatch[]> {
  const matches: PatternMatch[] = [];

  // Get code quality metrics
  const metrics = await prisma.codeQualityMetric.findMany({
    where: { scopePath: filePath },
    orderBy: { measuredAt: 'desc' },
    take: 5
  });

  if (metrics.length >= 2) {
    const latest = metrics[0];
    const previous = metrics[1];

    // Check for complexity growth
    if (latest.complexity > previous.complexity * 1.2) {
      matches.push({
        pattern: 'complexity_growth',
        confidence: 0.70,
        reasoning: `Complexity increased by ${((latest.complexity / previous.complexity - 1) * 100).toFixed(1)}%`
      });
    }

    // Check for maintainability decline
    if (latest.maintainability < previous.maintainability * 0.8) {
      matches.push({
        pattern: 'maintainability_decline',
        confidence: 0.75,
        reasoning: `Maintainability score decreased by ${((1 - latest.maintainability / previous.maintainability) * 100).toFixed(1)}%`
      });
    }
  }

  // Check for technical debt accumulation
  const techDebt = await prisma.technicalDebt.findMany({
    where: {
      filePath,
      status: 'identified'
    }
  });

  if (techDebt.length > 5) {
    matches.push({
      pattern: 'debt_accumulation',
      confidence: 0.80,
      reasoning: `${techDebt.length} unresolved technical debt items`
    });
  }

  return matches;
}

/**
 * Analyze code for security vulnerabilities
 */
function predictSecurityVulnerability(code: string, filePath: string): PatternMatch[] {
  const matches: PatternMatch[] = [];

  // Check for hardcoded credentials
  if (/password\s*=\s*["']|api[_-]?key\s*=\s*["']|secret\s*=\s*["']/i.test(code)) {
    matches.push({
      pattern: 'hardcoded_credentials',
      confidence: 0.95,
      reasoning: 'Potential hardcoded credentials detected'
    });
  }

  // Check for SQL injection risk
  if (/execute\s*\(\s*["'`].*\$\{|query\s*\(\s*["'`].*\$\{/i.test(code)) {
    matches.push({
      pattern: 'sql_injection_risk',
      confidence: 0.85,
      reasoning: 'Potential SQL injection vulnerability with string interpolation'
    });
  }

  // Check for XSS risk
  if (/innerHTML\s*=|dangerouslySetInnerHTML/i.test(code)) {
    matches.push({
      pattern: 'xss_risk',
      confidence: 0.75,
      reasoning: 'Potential XSS vulnerability with dynamic HTML'
    });
  }

  // Check for unsafe eval
  if (/eval\s*\(|new Function\s*\(/i.test(code)) {
    matches.push({
      pattern: 'unsafe_eval',
      confidence: 0.90,
      reasoning: 'Unsafe eval or Function constructor usage'
    });
  }

  return matches;
}

/**
 * Create prediction from pattern matches
 */
async function createPrediction(
  predictionType: string,
  category: string,
  filePath: string,
  matches: PatternMatch[]
): Promise<any> {
  if (matches.length === 0) {
    return null;
  }

  const highestConfidence = Math.max(...matches.map(m => m.confidence));
  const patterns = matches.map(m => m.pattern);
  const reasoning = matches.map(m => `• ${m.pattern}: ${m.reasoning}`).join('\n');

  // Determine severity based on patterns
  let severity = 'low';
  if (patterns.some(p => p.includes('critical') || p.includes('credentials') || p.includes('injection'))) {
    severity = 'critical';
  } else if (patterns.some(p => p.includes('high') || p.includes('error_rate'))) {
    severity = 'high';
  } else if (patterns.some(p => p.includes('medium'))) {
    severity = 'medium';
  }

  const fileName = filePath.split('/').pop() || filePath;

  return await prisma.prediction.create({
    data: {
      predictionType,
      category,
      filePath,
      fileName,
      title: `Predicted ${predictionType.replace(/_/g, ' ')} in ${fileName}`,
      description: `Analysis detected patterns indicating potential ${predictionType.replace(/_/g, ' ')}`,
      reasoning,
      confidence: highestConfidence,
      severity,
      likelihood: highestConfidence,
      indicators: JSON.parse(JSON.stringify({ matches })),
      patterns,
      recommendation: `Review ${fileName} and address the identified patterns: ${patterns.join(', ')}`,
      preventionSteps: [
        'Review recent code changes',
        'Add or improve test coverage',
        'Monitor metrics closely',
        'Consider refactoring'
      ],
      status: 'predicted'
    }
  });
}

/**
 * POST /api/admin/predictive-detection/analyze
 * Run predictive analysis
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { filePath, scope = 'project', code } = body;

    const predictions: any[] = [];

    if (scope === 'file' && filePath) {
      // Single file analysis
      const [perfMatches, bugMatches, complexityMatches] = await Promise.all([
        predictPerformanceDegradation(filePath),
        predictBugRisk(filePath),
        predictComplexityIncrease(filePath)
      ]);

      // Security analysis if code provided
      const securityMatches = code ? predictSecurityVulnerability(code, filePath) : [];

      // Create predictions
      const newPredictions = await Promise.all([
        perfMatches.length > 0 ? createPrediction('performance_degradation', 'performance', filePath, perfMatches) : null,
        bugMatches.length > 0 ? createPrediction('bug_risk', 'code_quality', filePath, bugMatches) : null,
        complexityMatches.length > 0 ? createPrediction('complexity_increase', 'maintainability', filePath, complexityMatches) : null,
        securityMatches.length > 0 ? createPrediction('security_vulnerability', 'security', filePath, securityMatches) : null
      ]);

      predictions.push(...newPredictions.filter(Boolean));

    } else {
      // Project-wide analysis
      // Get recent code changes
      const recentChanges = await prisma.codeChange.findMany({
        where: {
          committedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { committedAt: 'desc' },
        take: 50
      });

      // Get unique file paths
      const filePaths = new Set<string>();
      recentChanges.forEach(change => {
        if (change.changedFiles && Array.isArray(change.changedFiles)) {
          change.changedFiles.forEach((file: any) => {
            if (file.filename) {
              filePaths.add(file.filename);
            }
          });
        }
      });

      // Analyze top 10 most changed files
      const fileArray = Array.from(filePaths).slice(0, 10);
      
      for (const path of fileArray) {
        const [perfMatches, bugMatches, complexityMatches] = await Promise.all([
          predictPerformanceDegradation(path),
          predictBugRisk(path),
          predictComplexityIncrease(path)
        ]);

        const newPredictions = await Promise.all([
          perfMatches.length > 0 ? createPrediction('performance_degradation', 'performance', path, perfMatches) : null,
          bugMatches.length > 0 ? createPrediction('bug_risk', 'code_quality', path, bugMatches) : null,
          complexityMatches.length > 0 ? createPrediction('complexity_increase', 'maintainability', path, complexityMatches) : null
        ]);

        predictions.push(...newPredictions.filter(Boolean));
      }
    }

    return NextResponse.json({
      success: true,
      predictions,
      count: predictions.length,
      scope,
      analyzedAt: new Date()
    });

  } catch (error) {
    console.error('Error in predictive detection:', error);
    return NextResponse.json(
      { error: 'Failed to run predictive analysis' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/predictive-detection/list
 * List recent predictions
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const severity = url.searchParams.get('severity') || undefined;
    const predictionType = url.searchParams.get('type') || undefined;

    const predictions = await prisma.prediction.findMany({
      where: {
        ...(status && { status }),
        ...(severity && { severity }),
        ...(predictionType && { predictionType })
      },
      orderBy: { predictedAt: 'desc' },
      take: 100
    });

    const stats = {
      total: predictions.length,
      byStatus: {
        predicted: predictions.filter(p => p.status === 'predicted').length,
        monitoring: predictions.filter(p => p.status === 'monitoring').length,
        occurred: predictions.filter(p => p.status === 'occurred').length,
        prevented: predictions.filter(p => p.status === 'prevented').length,
        false_positive: predictions.filter(p => p.status === 'false_positive').length
      },
      bySeverity: {
        critical: predictions.filter(p => p.severity === 'critical').length,
        high: predictions.filter(p => p.severity === 'high').length,
        medium: predictions.filter(p => p.severity === 'medium').length,
        low: predictions.filter(p => p.severity === 'low').length
      },
      avgConfidence: predictions.length > 0
        ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
        : 0
    };

    return NextResponse.json({
      success: true,
      predictions,
      stats
    });

  } catch (error) {
    console.error('Error listing predictions:', error);
    return NextResponse.json(
      { error: 'Failed to list predictions' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/predictive-detection/validate/:id
 * Validate a prediction (mark as occurred/prevented/false_positive)
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    const body = await req.json();
    const { status, accuracy } = body;

    if (!['occurred', 'prevented', 'false_positive'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const prediction = await prisma.prediction.update({
      where: { id },
      data: {
        status,
        validated: true,
        validatedAt: new Date(),
        accuracy,
        occurredAt: status === 'occurred' ? new Date() : undefined
      }
    });

    return NextResponse.json({
      success: true,
      prediction
    });

  } catch (error) {
    console.error('Error validating prediction:', error);
    return NextResponse.json(
      { error: 'Failed to validate prediction' },
      { status: 500 }
    );
  }
}
