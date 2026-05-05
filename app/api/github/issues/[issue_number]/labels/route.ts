import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';


/**
 * POST /api/github/issues/[issue_number]/labels
 * Add labels to an issue
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - labels: Array of label names to add
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
    const { owner, repo, labels } = body;
    const issue_number = parseInt(params.issue_number);

    if (!owner || !repo || !labels || !Array.isArray(labels)) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, labels (array)' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Add labels to issue
    const { data } = await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number,
      labels,
    });

    return NextResponse.json({
      success: true,
      labels: data,
    });

  } catch (error: any) {
    console.error('Error adding labels:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to add labels',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/github/issues/[issue_number]/labels
 * Remove a label from an issue
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - label: Label name to remove
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
    const { owner, repo, label } = body;
    const issue_number = parseInt(params.issue_number);

    if (!owner || !repo || !label) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, label' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Remove label from issue
    await octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number,
      name: label,
    });

    return NextResponse.json({
      success: true,
      message: 'Label removed successfully',
    });

  } catch (error: any) {
    console.error('Error removing label:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove label',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
