/**
 * HOLLY AI - Autonomous Health Check API
 * 
 * Endpoint for HOLLY's self-diagnosis and health monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { selfDiagnosisExtended, selfHealing } from '@/lib/autonomous/self-diagnosis';
import { apiError, apiSuccess } from '@/lib/api/responses';
import { applyRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    // Optional auth - allow anonymous health checks for basic status
    // but require auth for detailed diagnostics

    const health = await selfDiagnosisExtended.runHealthCheck();

    return NextResponse.json({
      success: true,
      data: {
        overall: health.overall,
        score: health.score,
        metrics: health.metrics.map(m => ({
          name: m.name,
          value: m.value,
          status: m.status,
          message: m.message,
        })),
        issues: health.issues.map(i => ({
          severity: i.severity,
          category: i.category,
          title: i.title,
          autoFixable: i.autoFixable,
        })),
        recommendations: health.recommendations,
        lastCheck: health.lastCheck,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { success: false, error: 'Health check failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiError.unauthorized('Authentication required for healing actions');
    }

    // Rate limit healing actions
    const rateLimitError = applyRateLimit(request);
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return apiError.badRequest('Healing action is required');
    }

    // Execute healing action
    const result = await selfHealing.executeFix(action);

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error('Healing action error:', error);
    return NextResponse.json(
      { success: false, error: 'Healing action failed' },
      { status: 500 }
    );
  }
}
