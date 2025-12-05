/**
 * PRE-DEPLOYMENT VALIDATION API
 * 
 * Validates code before deployment
 * HOLLY can call this before committing changes
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PreDeploymentValidator } from '@/lib/deployment/pre-deployment-validator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for validation

export async function POST(request: Request) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Validation API] Starting pre-deployment validation...');

    // Run validation
    const validator = new PreDeploymentValidator();
    const result = await validator.validate();

    // Get detailed report
    const report = validator.getErrorReport(result);

    console.log('[Validation API] Validation complete:', result.canDeploy ? 'PASS' : 'FAIL');

    return NextResponse.json({
      success: true,
      validation: result,
      report,
      canDeploy: result.canDeploy
    });
  } catch (error: any) {
    console.error('[Validation API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        canDeploy: false
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Quick validation status check (no auth required for monitoring)
    const validator = new PreDeploymentValidator();
    
    // Just check if TypeScript compiles
    const result = await validator.validate();

    return NextResponse.json({
      success: true,
      canDeploy: result.canDeploy,
      summary: result.summary
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
