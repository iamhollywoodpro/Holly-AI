/**
 * HOLLY Code Optimization API Route
 * 
 * Endpoint for optimizing existing code with security validation.
 * 
 * @route POST /api/code/optimize
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecureCodeGenerator } from '@/lib/ai/secure-code-generator';

// ============================================================================
// Types
// ============================================================================

interface CodeOptimizeRequest {
  code: string;
  language: string;
  level?: 'basic' | 'standard' | 'aggressive';
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
    const body: CodeOptimizeRequest = await request.json();
    const { code, language, level = 'standard', userId } = body;

    // Validate required fields
    if (!code || !language) {
      return NextResponse.json(
        { error: 'Code and language are required' },
        { status: 400 }
      );
    }

    // Validate optimization level
    if (!['basic', 'standard', 'aggressive'].includes(level)) {
      return NextResponse.json(
        { error: 'Optimization level must be: basic, standard, or aggressive' },
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

    // Perform optimization with security validation
    const result = await codeGenerator.optimizeCode(code, language, level);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Handle optimization failure
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          securityScan: result.securityScan,
          message: 'Code optimization failed or introduced security issues'
        },
        { status: 400 }
      );
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        optimization: result.optimization,
        securityScan: result.securityScan,
        summary: buildOptimizationSummary(result.optimization),
        metadata: {
          level,
          responseTime,
          timestamp: new Date().toISOString()
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Code optimization API error:', error);
    
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

function buildOptimizationSummary(optimization: any): {
  improvements: number;
  performanceGain: string;
  complexity: string;
  highlights: string[];
} {
  return {
    improvements: optimization.improvements?.length || 0,
    performanceGain: optimization.performanceGain || 'Not measured',
    complexity: optimization.complexityReduction || 'Not measured',
    highlights: optimization.improvements?.slice(0, 3) || []
  };
}

// ============================================================================
// Export config
// ============================================================================

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb'
    }
  }
};
