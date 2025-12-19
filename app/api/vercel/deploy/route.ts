import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';


const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

/**
 * POST: Trigger a new deployment
 * GET: Check deployment status
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Vercel is configured
    if (!VERCEL_API_TOKEN) {
      return NextResponse.json(
        { error: 'Vercel API token not configured. Add VERCEL_API_TOKEN to environment variables.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { owner, repo } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo' },
        { status: 400 }
      );
    }

    // Get user's GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please connect your GitHub account first.' },
        { status: 403 }
      );
    }

    // Trigger Vercel deployment via webhook or API
    // Note: Vercel auto-deploys on git push, but we can trigger manually too
    const vercelUrl = VERCEL_TEAM_ID 
      ? `https://api.vercel.com/v13/deployments?teamId=${VERCEL_TEAM_ID}`
      : 'https://api.vercel.com/v13/deployments';

    const deploymentResponse = await fetch(vercelUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repo,
        gitSource: {
          type: 'github',
          repo: `${owner}/${repo}`,
          ref: 'main', // Deploy from main branch
        },
      }),
    });

    if (!deploymentResponse.ok) {
      const errorData = await deploymentResponse.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to trigger deployment' },
        { status: deploymentResponse.status }
      );
    }

    const deployment = await deploymentResponse.json();

    return NextResponse.json({
      success: true,
      deployment: {
        id: deployment.id,
        url: deployment.url,
        status: deployment.status,
        readyState: deployment.readyState,
      },
    });

  } catch (error: any) {
    console.error('Deploy API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check deployment status
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!VERCEL_API_TOKEN) {
      return NextResponse.json(
        { error: 'Vercel API token not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get('id');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Missing deployment ID' },
        { status: 400 }
      );
    }

    // Get deployment status from Vercel
    const vercelUrl = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v13/deployments/${deploymentId}?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v13/deployments/${deploymentId}`;

    const response = await fetch(vercelUrl, {
      headers: {
        'Authorization': `Bearer ${VERCEL_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to get deployment status' },
        { status: response.status }
      );
    }

    const deployment = await response.json();

    return NextResponse.json({
      deployment: {
        id: deployment.id,
        url: deployment.url,
        status: deployment.status,
        readyState: deployment.readyState,
        createdAt: deployment.createdAt,
        ready: deployment.ready,
      },
    });

  } catch (error: any) {
    console.error('Deploy status API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
