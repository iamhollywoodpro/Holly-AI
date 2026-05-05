import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';


/**
 * GET /api/github/workflows/runs
 * List workflow runs for a repository or specific workflow
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 * - workflow_id: (optional) Specific workflow ID
 * - status: (optional) Filter by status
 * - per_page: (optional) Results per page (default: 20)
 * - page: (optional) Page number (default: 1)
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
    const workflow_id = searchParams.get('workflow_id');
    const status = searchParams.get('status');
    const per_page = parseInt(searchParams.get('per_page') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Build request parameters
    const params: any = {
      owner,
      repo,
      per_page,
      page,
    };

    if (workflow_id) {
      params.workflow_id = parseInt(workflow_id);
    }

    if (status) {
      params.status = status;
    }

    // Fetch workflow runs
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo(params);

    return NextResponse.json({
      workflow_runs: data.workflow_runs,
      total_count: data.total_count,
    });

  } catch (error: any) {
    console.error('Error fetching workflow runs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow runs',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
