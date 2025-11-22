import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/workflows
 * List all workflows for a repository
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 */
export async function GET(request: NextRequest) {
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

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    // Fetch workflows
    const { data: workflowsData } = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
    });

    // Fetch recent runs for each workflow to get status
    const workflowsWithStatus = await Promise.all(
      workflowsData.workflows.map(async (workflow) => {
        try {
          const { data: runsData } = await octokit.rest.actions.listWorkflowRuns({
            owner,
            repo,
            workflow_id: workflow.id,
            per_page: 1,
          });

          const lastRun = runsData.workflow_runs[0];

          return {
            ...workflow,
            lastRun: lastRun ? {
              id: lastRun.id,
              status: lastRun.status,
              conclusion: lastRun.conclusion,
              created_at: lastRun.created_at,
              updated_at: lastRun.updated_at,
              html_url: lastRun.html_url,
            } : null,
          };
        } catch (error) {
          // If we can't get runs, just return the workflow
          return {
            ...workflow,
            lastRun: null,
          };
        }
      })
    );

    return NextResponse.json({
      workflows: workflowsWithStatus,
      total_count: workflowsData.total_count,
    });

  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflows',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
