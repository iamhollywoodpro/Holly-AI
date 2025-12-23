import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      gitBranch = 'main',
      target = 'production',
    } = await req.json();

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

    if (!VERCEL_TOKEN) {
      return NextResponse.json(
        { error: 'Vercel token not configured' },
        { status: 500 }
      );
    }

    // Trigger deployment via Vercel API
    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Holly-AI',
        gitSource: {
          type: 'github',
          repo: 'iamhollywoodpro/Holly-AI',
          ref: gitBranch,
        },
        target,
        ...(VERCEL_PROJECT_ID && { projectId: VERCEL_PROJECT_ID }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Deployment failed');
    }

    const deployment = await response.json();

    return NextResponse.json({
      success: true,
      deploymentId: deployment.id,
      url: `https://${deployment.url}`,
      status: deployment.readyState,
      target,
    });
  } catch (error: any) {
    console.error('Error triggering Vercel deployment:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deploy' },
      { status: 500 }
    );
  }
}
