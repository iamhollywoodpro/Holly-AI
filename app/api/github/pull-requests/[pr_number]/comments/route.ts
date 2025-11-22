import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/pull-requests/[pr_number]/comments
 * Get all comments on a pull request
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { pr_number: string } }
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
    const pull_number = parseInt(params.pr_number);

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Fetch issue comments (general PR comments)
    const { data: issueComments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pull_number,
    });

    // Fetch review comments (inline code comments)
    const { data: reviewComments } = await octokit.rest.pulls.listReviewComments({
      owner,
      repo,
      pull_number,
    });

    // Fetch reviews
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number,
    });

    return NextResponse.json({
      issue_comments: issueComments,
      review_comments: reviewComments,
      reviews: reviews,
      total: issueComments.length + reviewComments.length + reviews.length,
    });

  } catch (error: any) {
    console.error('Error fetching PR comments:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch PR comments',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/pull-requests/[pr_number]/comments
 * Add a comment to a pull request
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - body: Comment text (supports @mentions)
 * - type: 'general' | 'line' (optional, default: 'general')
 * - path: File path (required for line comments)
 * - line: Line number (required for line comments)
 * - side: 'LEFT' | 'RIGHT' (optional for line comments)
 * - commit_id: Commit SHA (required for line comments)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { pr_number: string } }
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
      body: commentBody, 
      type = 'general',
      path,
      line,
      side = 'RIGHT',
      commit_id,
    } = body;

    const pull_number = parseInt(params.pr_number);

    if (!owner || !repo || !commentBody) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, body' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    let comment;

    if (type === 'line') {
      // Create review comment (inline code comment)
      if (!path || !line || !commit_id) {
        return NextResponse.json(
          { error: 'Line comments require: path, line, commit_id' },
          { status: 400 }
        );
      }

      const { data } = await octokit.rest.pulls.createReviewComment({
        owner,
        repo,
        pull_number,
        body: commentBody,
        commit_id,
        path,
        line,
        side,
      });

      comment = data;
    } else {
      // Create general issue comment
      const { data } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: commentBody,
      });

      comment = data;
    }

    return NextResponse.json({
      success: true,
      comment,
      type,
    });

  } catch (error: any) {
    console.error('Error creating PR comment:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create PR comment',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/github/pull-requests/[pr_number]/comments
 * Reply to an existing comment
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - comment_id: ID of comment to reply to
 * - body: Reply text
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { pr_number: string } }
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
    const { owner, repo, comment_id, body: replyBody } = body;
    const pull_number = parseInt(params.pr_number);

    if (!owner || !repo || !comment_id || !replyBody) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, comment_id, body' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Create reply to review comment
    const { data: reply } = await octokit.rest.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number,
      comment_id: parseInt(comment_id),
      body: replyBody,
    });

    return NextResponse.json({
      success: true,
      reply,
    });

  } catch (error: any) {
    console.error('Error replying to comment:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to reply to comment',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
