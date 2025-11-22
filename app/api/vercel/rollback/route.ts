import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '2J6oCY1sGTAEtuJs1DuOzA8j';
const VERCEL_PROJECT_ID = 'prj_uVVYfz9ltTSboB7LCSmyIXoa5fST';

/**
 * GET /api/vercel/rollback
 * Get deployment history for rollback selection
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent deployments
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=${Math.min(limit, 50)}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch deployments');
    }

    const data = await response.json();

    // Transform deployment data
    const deployments = data.deployments.map((d: any) => ({
      id: d.uid,
      url: d.url,
      state: d.state,
      createdAt: d.created,
      readyAt: d.ready,
      commit: {
        sha: d.meta?.githubCommitSha || null,
        message: d.meta?.githubCommitMessage || null,
        author: d.meta?.githubCommitAuthorName || null,
      },
      target: d.target || 'preview',
      duration: d.ready && d.created ? d.ready - d.created : null,
    }));

    // Get current production deployment
    const prodDeployment = deployments.find((d: any) => d.target === 'production' && d.state === 'READY');

    return NextResponse.json({
      success: true,
      deployments,
      currentProduction: prodDeployment?.id || null,
    });
  } catch (error: any) {
    console.error('Error fetching deployment history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deployment history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vercel/rollback
 * Rollback to a specific deployment
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { deploymentId, targetEnvironment } = body;

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Missing deploymentId' },
        { status: 400 }
      );
    }

    // Get deployment details
    const deploymentResponse = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      }
    );

    if (!deploymentResponse.ok) {
      throw new Error('Deployment not found');
    }

    const deployment = await deploymentResponse.json();

    // Promote the deployment to production (rollback)
    // Note: Vercel doesn't have a direct "rollback" API
    // We need to promote the old deployment to production
    const promoteResponse = await fetch(
      `https://api.vercel.com/v13/deployments/${deploymentId}/promote`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: targetEnvironment || 'production',
        }),
      }
    );

    if (!promoteResponse.ok) {
      const errorData = await promoteResponse.json();
      throw new Error(errorData.error?.message || 'Failed to rollback deployment');
    }

    const result = await promoteResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Deployment rolled back successfully',
      deployment: {
        id: deploymentId,
        url: deployment.url,
        commit: {
          sha: deployment.meta?.githubCommitSha || null,
          message: deployment.meta?.githubCommitMessage || null,
        },
      },
    });
  } catch (error: any) {
    console.error('Error rolling back deployment:', error);
    
    // Handle specific errors
    if (error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to rollback deployment' },
      { status: 500 }
    );
  }
}


