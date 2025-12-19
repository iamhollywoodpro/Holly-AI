import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Octokit } from '@octokit/rest';

export const runtime = 'nodejs';


/**
 * POST /api/github/pull-request
 * Create a new pull request on GitHub
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { owner, repo, title, body: prBody, head, base, draft, reviewers } = body;

    if (!owner || !repo || !title || !head || !base) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo, title, head, base' },
        { status: 400 }
      );
    }

    // Get GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 403 }
      );
    }

    const octokit = new Octokit({
      auth: connection.accessToken,
    });

    // Create the pull request
    const { data: pullRequest } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body: prBody || '',
      head,
      base,
      draft: draft || false,
    });

    // Request reviewers if provided
    if (reviewers && reviewers.length > 0) {
      try {
        await octokit.pulls.requestReviewers({
          owner,
          repo,
          pull_number: pullRequest.number,
          reviewers,
        });
      } catch (reviewerError) {
        console.error('Failed to add reviewers:', reviewerError);
        // Don't fail the whole PR creation if reviewers fail
      }
    }

    return NextResponse.json({
      success: true,
      pullRequest: {
        number: pullRequest.number,
        url: pullRequest.html_url,
        title: pullRequest.title,
        state: pullRequest.state,
        draft: pullRequest.draft,
        head: pullRequest.head.ref,
        base: pullRequest.base.ref,
        user: {
          login: pullRequest.user?.login,
          avatar: pullRequest.user?.avatar_url,
        },
        createdAt: pullRequest.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating pull request:', error);

    // Handle specific GitHub API errors
    if (error.status === 422) {
      return NextResponse.json(
        { error: 'Pull request already exists or validation failed' },
        { status: 422 }
      );
    }

    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Repository or branch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create pull request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/github/pull-request
 * List pull requests for a repository
 */
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const state = searchParams.get('state') || 'open'; // open, closed, all
    const perPage = parseInt(searchParams.get('per_page') || '10');

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing owner or repo parameter' },
        { status: 400 }
      );
    }

    // Get GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 403 }
      );
    }

    const octokit = new Octokit({
      auth: connection.accessToken,
    });

    // Fetch pull requests
    const { data: pullRequests } = await octokit.pulls.list({
      owner,
      repo,
      state: state as 'open' | 'closed' | 'all',
      per_page: Math.min(perPage, 100),
      sort: 'created',
      direction: 'desc',
    });

    // Transform PR data
    const transformedPRs = pullRequests.map((pr) => ({
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      draft: pr.draft,
      url: pr.html_url,
      head: pr.head.ref,
      base: pr.base.ref,
      user: {
        login: pr.user?.login,
        avatar: pr.user?.avatar_url,
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      labels: pr.labels.map(label => label.name),
    }));

    return NextResponse.json({
      success: true,
      pullRequests: transformedPRs,
      count: transformedPRs.length,
    });
  } catch (error: any) {
    console.error('Error fetching pull requests:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to fetch pull requests' },
      { status: 500 }
    );
  }
}
