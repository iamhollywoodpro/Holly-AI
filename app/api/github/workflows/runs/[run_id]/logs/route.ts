import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';


/**
 * GET /api/github/workflows/runs/[run_id]/logs
 * Download logs for a workflow run
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 * 
 * Note: GitHub returns logs as a ZIP file. This endpoint returns the download URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { run_id: string } }
) {
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
    const run_id = parseInt(params.run_id);

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Get download URL for logs
    const { url } = await octokit.rest.actions.downloadWorkflowRunLogs({
      owner,
      repo,
      run_id,
    });

    // Fetch the actual log content
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to download logs from GitHub');
    }

    // Get logs as text (GitHub returns ZIP, but we'll handle it)
    const logsBuffer = await response.arrayBuffer();
    
    return new NextResponse(logsBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="workflow-${run_id}-logs.zip"`,
      },
    });

  } catch (error: any) {
    console.error('Error fetching workflow logs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow logs',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
