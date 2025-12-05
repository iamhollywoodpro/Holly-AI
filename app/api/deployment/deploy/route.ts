/**
 * Deployment API
 * 
 * Trigger and manage staged deployments
 * 
 * Phase 6: Controlled Deployment & Monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stagedDeployment } from '@/lib/deployment/staged-deployment';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication (admin only)
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { gitCommit, pipelineName } = body;

    if (!gitCommit) {
      return NextResponse.json(
        { error: 'gitCommit required' },
        { status: 400 }
      );
    }

    console.log(`[API:DEPLOY] Starting deployment for commit: ${gitCommit}`);

    // Create deployment pipeline
    const pipeline = stagedDeployment.createStandardPipeline(gitCommit);
    
    if (pipelineName) {
      pipeline.name = pipelineName;
    }

    // Start deployment
    const result = await stagedDeployment.startDeployment(pipeline);

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:DEPLOY] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'active') {
      // Get active deployments
      const active = stagedDeployment.getActiveDeployments();
      return NextResponse.json({
        success: true,
        deployments: active,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'stats') {
      // Get deployment statistics
      const stats = await stagedDeployment.getDeploymentStatistics();
      return NextResponse.json({
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=active or ?action=stats' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API:DEPLOY] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
