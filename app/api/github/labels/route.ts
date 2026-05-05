import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';


/**
 * GET /api/github/labels
 * List all labels for a repository
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 * - per_page: Results per page (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No GitHub token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const per_page = parseInt(searchParams.get('per_page') || '100');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Fetch labels
    const { data: labels } = await octokit.rest.issues.listLabelsForRepo({
      owner,
      repo,
      per_page,
    });

    return NextResponse.json({
      labels,
      total: labels.length,
    });

  } catch (error: any) {
    console.error('Error fetching labels:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch labels',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/labels
 * Create a new label
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - name: Label name (required)
 * - color: Label color hex code without # (required)
 * - description: Label description (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No GitHub token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { owner, repo, name, color, description } = body;

    if (!owner || !repo || !name || !color) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, name, color' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Create label
    const { data: label } = await octokit.rest.issues.createLabel({
      owner,
      repo,
      name,
      color: color.replace('#', ''), // Remove # if present
      description: description || undefined,
    });

    return NextResponse.json({
      success: true,
      label,
    });

  } catch (error: any) {
    console.error('Error creating label:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create label',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
