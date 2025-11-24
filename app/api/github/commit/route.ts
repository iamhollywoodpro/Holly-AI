import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { GitHubAPIService } from '@/lib/github/github-api';
import { generateCommitMessage } from '@/lib/github/commit-message-generator';

/**
 * GitHub Commit API Route
 * 
 * Endpoints:
 * - GET /api/github/commit?owner=user&repo=project&limit=10 - Get commit history
 * - GET /api/github/commit?owner=user&repo=project&sha=abc123 - Get specific commit
 * - POST /api/github/commit - Create a new commit (Note: GitHub API requires complex tree operations)
 */

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Find user in database by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const sha = searchParams.get('sha');
    const branch = searchParams.get('branch');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate required parameters
    if (!owner || !repo) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          details: 'Both owner and repo are required'
        },
        { status: 400 }
      );
    }

    // Get user's GitHub access token from database
    const githubConnection = await prisma.gitHubConnection.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!githubConnection?.accessToken || !githubConnection.isConnected) {
      return NextResponse.json(
        { 
          error: 'GitHub not connected',
          details: 'Please connect your GitHub account in Settings → Integrations'
        },
        { status: 403 }
      );
    }

    // Initialize GitHub API service
    const githubService = new GitHubAPIService(githubConnection.accessToken);

    try {
      // Get specific commit
      if (sha) {
        const commit = await githubService.getCommit(owner, repo, sha);
        return NextResponse.json({
          success: true,
          operation: 'get_commit',
          owner,
          repo,
          commit,
        });
      }

      // Get commit history (default operation)
      const commits = await githubService.getCommitHistory(owner, repo, branch, limit);
      
      return NextResponse.json({
        success: true,
        operation: 'commit_history',
        owner,
        repo,
        branch: branch || 'default',
        limit,
        commits,
        count: commits.length,
      });

    } catch (apiError: any) {
      // Handle GitHub API specific errors
      if (apiError.status === 404) {
        return NextResponse.json(
          { 
            error: 'Not found',
            details: `Repository ${owner}/${repo} not found or commit not found`,
          },
          { status: 404 }
        );
      }

      if (apiError.status === 403) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            details: 'You do not have permission to access this repository',
          },
          { status: 403 }
        );
      }

      throw apiError;
    }

  } catch (error: any) {
    console.error('GitHub Commit API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Note: Creating commits via GitHub API is complex and requires:
 * 1. Creating blobs for changed files
 * 2. Creating a tree with those blobs
 * 3. Creating a commit pointing to that tree
 * 4. Updating the branch reference
 * 
 * This is not recommended for direct file editing.
 * Instead, this endpoint can be used to generate commit message suggestions.
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // Find user in database by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { owner, repo, operation } = body;

    // Validate
    if (!owner || !repo) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: 'Required: owner, repo'
        },
        { status: 400 }
      );
    }

    // Get user's GitHub token
    const githubConnection = await prisma.gitHubConnection.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!githubConnection?.accessToken || !githubConnection.isConnected) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 403 }
      );
    }

    // Initialize service
    const githubService = new GitHubAPIService(githubConnection.accessToken);

    // Handle different operations
    if (operation === 'suggest_message') {
      // Get comparison data (this would come from local git in a real implementation)
      const { base, head, files } = body;
      
      if (!files || !Array.isArray(files)) {
        return NextResponse.json(
          { error: 'Files array required for message suggestion' },
          { status: 400 }
        );
      }
      
      // Generate commit message
      const suggestion = generateCommitMessage(files);
      
      return NextResponse.json({
        success: true,
        operation: 'suggest_message',
        suggestion,
      });
    }

    return NextResponse.json(
      { 
        error: 'Invalid operation',
        details: 'Supported operations: suggest_message'
      },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('GitHub Commit POST API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Operation failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
