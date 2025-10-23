/**
 * HOLLY Code Review API Route
 * 
 * Endpoint for reviewing existing code with quality and security analysis.
 * 
 * @route POST /api/code/review
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecureCodeGenerator } from '@/lib/ai/secure-code-generator';

// ============================================================================
// Types
// ============================================================================

interface CodeReviewRequest {
  code: string;
  language: string;
  userId?: string;
}

// ============================================================================
// Initialize Services
// ============================================================================

const codeGenerator = new SecureCodeGenerator(
  process.env.ANTHROPIC_API_KEY || '',
  'claude-3-5-sonnet-20241022'
);

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body: CodeReviewRequest = await request.json();
    const { code, language, userId } = body;

    // Validate required fields
    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      );
    }

    // Check code length
    if (code.length > 100000) {
      return NextResponse.json(
        { error: 'Code too long (max 100,000 characters)' },
        { status: 400 }
      );
    }

    // Perform comprehensive review (quality + security)
    const review = await codeGenerator.reviewCode(code, language);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Build response
    return NextResponse.json(
      {
        success: true,
        review: {
          codeReview: review.codeReview,
          securityScan: review.securityScan,
          overallScore: review.overallScore,
          passed: review.passed
        },
        recommendations: buildRecommendations(review),
        metadata: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Code review API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildRecommendations(review: any): string[] {
  const recommendations: string[] = [];

  // Add recommendations based on score
  if (review.overallScore < 60) {
    recommendations.push('🔴 Immediate action required - code has significant issues');
  } else if (review.overallScore < 80) {
    recommendations.push('⚠️ Improvements recommended before production deployment');
  } else {
    recommendations.push('✅ Code quality is good, minor improvements suggested');
  }

  // Security recommendations
  if (review.securityScan.issues.length > 0) {
    const criticalIssues = review.securityScan.issues.filter((i: any) => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`🚨 ${criticalIssues.length} critical security issue(s) must be fixed immediately`);
    }
  }

  if (review.securityScan.secrets.length > 0) {
    recommendations.push('🔑 Remove hardcoded secrets and use environment variables');
  }

  if (review.securityScan.dangerousFunctions.length > 0) {
    recommendations.push('⚠️ Replace dangerous functions with safer alternatives');
  }

  // Code quality recommendations
  if (review.codeReview.issues.length > 0) {
    recommendations.push(`📝 Address ${review.codeReview.issues.length} code quality issue(s)`);
  }

  if (review.codeReview.bestPractices.length > 0) {
    recommendations.push('📚 Follow suggested best practices for better maintainability');
  }

  return recommendations;
}

// ============================================================================
// Export config
// ============================================================================

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb' // Larger limit for code review
    }
  }
};
