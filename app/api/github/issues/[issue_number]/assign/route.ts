import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/issues/[issue_number]/assign
 * Get current assignees for an issue
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

    // Fetch issue to get assignees
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number,
    });

    return NextResponse.json({
      assignees: issue.assignees || [],
      assignee: issue.assignee, // Primary assignee
    });

  } catch (error: any) {
    console.error('Error fetching issue assignees:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch issue assignees',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/issues/[issue_number]/assign
 * Assign users to an issue
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - assignees: Array of usernames to assign
 */
export async function POST(
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
    const { owner, repo, assignees } = body;
    const issue_number = parseInt(params.issue_number);

    if (!owner || !repo || !assignees || !Array.isArray(assignees)) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, assignees (array)' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Add assignees to issue
    const { data } = await octokit.rest.issues.addAssignees({
      owner,
      repo,
      issue_number,
      assignees,
    });

    return NextResponse.json({
      success: true,
      issue: data,
      assignees: data.assignees,
    });

  } catch (error: any) {
    console.error('Error assigning issue:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to assign issue',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/github/issues/[issue_number]/assign
 * Remove assignees from an issue
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - assignees: Array of usernames to remove
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
    const { owner, repo, assignees } = body;
    const issue_number = parseInt(params.issue_number);

    if (!owner || !repo || !assignees || !Array.isArray(assignees)) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, assignees (array)' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Remove assignees from issue
    const { data } = await octokit.rest.issues.removeAssignees({
      owner,
      repo,
      issue_number,
      assignees,
    });

    return NextResponse.json({
      success: true,
      issue: data,
      assignees: data.assignees,
    });

  } catch (error: any) {
    console.error('Error removing assignees:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove assignees',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
