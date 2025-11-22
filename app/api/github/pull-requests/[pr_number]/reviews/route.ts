import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/pull-requests/[pr_number]/reviews
 * Get review requests and reviews for a pull request
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

    // Fetch pull request to get review requests
    const { data: pullRequest } = await octokit.rest.pulls.get({
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
      requested_reviewers: pullRequest.requested_reviewers || [],
      requested_teams: pullRequest.requested_teams || [],
      reviews: reviews,
    });

  } catch (error: any) {
    console.error('Error fetching PR reviews:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch PR reviews',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/pull-requests/[pr_number]/reviews
 * Request reviews from team members
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - reviewers: Array of usernames to request reviews from
 * - team_reviewers: (optional) Array of team slugs to request reviews from
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
    const { owner, repo, reviewers, team_reviewers } = body;
    const pull_number = parseInt(params.pr_number);

    if (!owner || !repo || (!reviewers && !team_reviewers)) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, and at least one of reviewers or team_reviewers' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Request reviews
    const { data } = await octokit.rest.pulls.requestReviewers({
      owner,
      repo,
      pull_number,
      reviewers: reviewers || [],
      team_reviewers: team_reviewers || [],
    });

    return NextResponse.json({
      success: true,
      pull_request: data,
      requested_reviewers: data.requested_reviewers,
      requested_teams: data.requested_teams,
    });

  } catch (error: any) {
    console.error('Error requesting reviews:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to request reviews',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/github/pull-requests/[pr_number]/reviews
 * Remove review requests
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - reviewers: Array of usernames to remove review requests from
 * - team_reviewers: (optional) Array of team slugs to remove
 */
export async function DELETE(
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
    const { owner, repo, reviewers, team_reviewers } = body;
    const pull_number = parseInt(params.pr_number);

    if (!owner || !repo || (!reviewers && !team_reviewers)) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, and at least one of reviewers or team_reviewers' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Remove review requests
    const { data } = await octokit.rest.pulls.removeRequestedReviewers({
      owner,
      repo,
      pull_number,
      reviewers: reviewers || [],
      team_reviewers: team_reviewers || [],
    });

    return NextResponse.json({
      success: true,
      pull_request: data,
    });

  } catch (error: any) {
    console.error('Error removing review requests:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to remove review requests',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
