import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/workflows/[workflow_id]
 * Get details of a specific workflow
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { workflow_id: string } }
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
    const workflow_id = params.workflow_id;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    // Fetch workflow details
    const { data: workflow } = await octokit.rest.actions.getWorkflow({
      owner,
      repo,
      workflow_id,
    });

    return NextResponse.json({ workflow });

  } catch (error: any) {
    console.error('Error fetching workflow:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/workflows/[workflow_id]
 * Trigger a workflow dispatch event
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - ref: Branch or tag name to run workflow on
 * - inputs: (optional) Workflow-specific inputs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { workflow_id: string } }
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
    const { owner, repo, ref, inputs } = body;
    const workflow_id = params.workflow_id;

    if (!owner || !repo || !ref) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, ref' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    // Trigger workflow
    await octokit.rest.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id,
      ref,
      inputs: inputs || {},
    });

    // Wait a moment for GitHub to process, then fetch recent runs
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to get the run that was just created
    const { data: runsData } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id,
      per_page: 5,
    });

    // Find the most recent run (likely the one we just triggered)
    const latestRun = runsData.workflow_runs[0];

    return NextResponse.json({
      success: true,
      message: 'Workflow triggered successfully',
      workflow_id,
      ref,
      run: latestRun ? {
        id: latestRun.id,
        html_url: latestRun.html_url,
        status: latestRun.status,
        created_at: latestRun.created_at,
      } : null,
    });

  } catch (error: any) {
    console.error('Error triggering workflow:', error);
    
    // Special handling for workflow dispatch errors
    if (error.status === 404) {
      return NextResponse.json(
        { 
          error: 'Workflow not found or does not support manual triggers',
          details: 'Ensure the workflow has "workflow_dispatch" event configured'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to trigger workflow',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
