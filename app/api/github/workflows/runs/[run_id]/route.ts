import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/workflows/runs/[run_id]
 * Get details of a specific workflow run including jobs
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { run_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No GitHub token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const run_id = parseInt(params.run_id);

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    // Fetch run details
    const { data: run } = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id,
    });

    // Fetch jobs for this run
    const { data: jobsData } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id,
    });

    return NextResponse.json({
      run,
      jobs: jobsData.jobs,
      total_jobs: jobsData.total_count,
    });

  } catch (error: any) {
    console.error('Error fetching workflow run:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow run',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/workflows/runs/[run_id]
 * Perform actions on a workflow run (cancel, rerun)
 * 
 * Body:
 * - action: 'cancel' | 'rerun' | 'rerun-failed'
 * - owner: Repository owner
 * - repo: Repository name
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { run_id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized - No GitHub token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, owner, repo } = body;
    const run_id = parseInt(params.run_id);

    if (!owner || !repo || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, action' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    let result;

    switch (action) {
      case 'cancel':
        result = await octokit.rest.actions.cancelWorkflowRun({
          owner,
          repo,
          run_id,
        });
        break;

      case 'rerun':
        result = await octokit.rest.actions.reRunWorkflow({
          owner,
          repo,
          run_id,
        });
        break;

      case 'rerun-failed':
        result = await octokit.rest.actions.reRunWorkflowFailedJobs({
          owner,
          repo,
          run_id,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: cancel, rerun, or rerun-failed' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      run_id,
      message: `Workflow run ${action} successful`,
    });

  } catch (error: any) {
    console.error('Error performing workflow run action:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to perform workflow run action',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
