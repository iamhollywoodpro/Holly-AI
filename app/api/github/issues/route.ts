import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/issues
 * List issues for a repository with filtering
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 * - state: open | closed | all (default: open)
 * - labels: Comma-separated label names
 * - assignee: Username or 'none' or '*'
 * - creator: Username
 * - mentioned: Username
 * - milestone: Milestone number or 'none' or '*'
 * - sort: created | updated | comments (default: created)
 * - direction: asc | desc (default: desc)
 * - per_page: Results per page (default: 30)
 * - page: Page number (default: 1)
 */
export async function GET(request: NextRequest) {
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

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Build request parameters
    const params: any = {
      owner,
      repo,
      state: searchParams.get('state') || 'open',
      sort: searchParams.get('sort') || 'created',
      direction: searchParams.get('direction') || 'desc',
      per_page: parseInt(searchParams.get('per_page') || '30'),
      page: parseInt(searchParams.get('page') || '1'),
    };

    // Add optional filters
    if (searchParams.get('labels')) {
      params.labels = searchParams.get('labels');
    }
    if (searchParams.get('assignee')) {
      params.assignee = searchParams.get('assignee');
    }
    if (searchParams.get('creator')) {
      params.creator = searchParams.get('creator');
    }
    if (searchParams.get('mentioned')) {
      params.mentioned = searchParams.get('mentioned');
    }
    if (searchParams.get('milestone')) {
      params.milestone = searchParams.get('milestone');
    }
    if (searchParams.get('since')) {
      params.since = searchParams.get('since');
    }

    // Fetch issues
    const { data: issues } = await octokit.rest.issues.listForRepo(params);

    // Calculate stats
    const stats = {
      total: issues.length,
      open: issues.filter(i => i.state === 'open').length,
      closed: issues.filter(i => i.state === 'closed').length,
    };

    return NextResponse.json({
      issues,
      stats,
      page: params.page,
      per_page: params.per_page,
    });

  } catch (error: any) {
    console.error('Error fetching issues:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch issues',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/issues
 * Create a new issue
 * 
 * Body:
 * - owner: Repository owner
 * - repo: Repository name
 * - title: Issue title (required)
 * - body: Issue description
 * - labels: Array of label names
 * - assignees: Array of usernames
 * - milestone: Milestone number
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No GitHub token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { owner, repo, title, body: issueBody, labels, assignees, milestone } = body;

    if (!owner || !repo || !title) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, title' },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    // Create issue
    const { data: issue } = await octokit.rest.issues.create({
      owner,
      repo,
      title,
      body: issueBody || undefined,
      labels: labels || undefined,
      assignees: assignees || undefined,
      milestone: milestone || undefined,
    });

    return NextResponse.json({
      success: true,
      issue,
    });

  } catch (error: any) {
    console.error('Error creating issue:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create issue',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
