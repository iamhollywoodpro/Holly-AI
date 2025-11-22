import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/issues/[issue_number]
 * Get a specific issue
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { issue_number: string } }
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
    const issue_number = parseInt(params.issue_number);

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Fetch issue
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number,
    });

    // Fetch comments
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number,
    });

    return NextResponse.json({
      issue,
      comments,
    });

  } catch (error: any) {
    console.error('Error fetching issue:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch issue',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/github/issues/[issue_number]
 * Update an issue
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - title: Issue title
 * - body: Issue description
 * - state: open | closed
 * - state_reason: completed | not_planned | reopened
 * - labels: Array of label names
 * - assignees: Array of usernames
 * - milestone: Milestone number or null
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { issue_number: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No GitHub token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      owner, 
      repo, 
      title, 
      body: issueBody, 
      state, 
      state_reason,
      labels, 
      assignees, 
      milestone 
    } = body;
    
    const issue_number = parseInt(params.issue_number);

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Build update parameters
    const updateParams: any = {
      owner,
      repo,
      issue_number,
    };

    if (title !== undefined) updateParams.title = title;
    if (issueBody !== undefined) updateParams.body = issueBody;
    if (state !== undefined) updateParams.state = state;
    if (state_reason !== undefined) updateParams.state_reason = state_reason;
    if (labels !== undefined) updateParams.labels = labels;
    if (assignees !== undefined) updateParams.assignees = assignees;
    if (milestone !== undefined) updateParams.milestone = milestone;

    // Update issue
    const { data: issue } = await octokit.rest.issues.update(updateParams);

    return NextResponse.json({
      success: true,
      issue,
    });

  } catch (error: any) {
    console.error('Error updating issue:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update issue',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/github/issues/[issue_number]
 * Close an issue (alias for PATCH with state: closed)
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - state_reason: completed | not_planned (default: completed)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { issue_number: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No GitHub token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { owner, repo, state_reason = 'completed' } = body;
    const issue_number = parseInt(params.issue_number);

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Close issue
    const { data: issue } = await octokit.rest.issues.update({
      owner,
      repo,
      issue_number,
      state: 'closed',
      state_reason,
    });

    return NextResponse.json({
      success: true,
      issue,
      message: 'Issue closed successfully',
    });

  } catch (error: any) {
    console.error('Error closing issue:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to close issue',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
