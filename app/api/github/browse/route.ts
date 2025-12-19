import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { GitHubAPIService } from '@/lib/github/github-api';

export const runtime = 'nodejs';


/**
 * GitHub File Browser API Route
 * 
 * Endpoints:
 * - GET /api/github/browse?owner=user&repo=project&path=/src - List directory contents
 * - GET /api/github/browse?owner=user&repo=project&file=/README.md - Get file content
 * - GET /api/github/browse?owner=user&repo=project&tree=true - Get full repository tree
 * - GET /api/github/browse?owner=user&repo=project&search=query - Search files
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
      where: { clerkUserId: clerkUserId },
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
    const path = searchParams.get('path') || '';
    const file = searchParams.get('file');
    const tree = searchParams.get('tree') === 'true';
    const search = searchParams.get('search');
    const branch = searchParams.get('branch') || 'main';

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

    // Handle different operation types
    try {
      // Search files
      if (search) {
        const results = await githubService.searchRepoFiles(owner, repo, search);
        return NextResponse.json({
          success: true,
          operation: 'search',
          query: search,
          results,
          count: results.length,
        });
      }

      // Get full repository tree
      if (tree) {
        const treeData = await githubService.getRepoTree(owner, repo, branch);
        return NextResponse.json({
          success: true,
          operation: 'tree',
          owner,
          repo,
          branch,
          tree: treeData,
        });
      }

      // Get specific file content
      if (file) {
        const content = await githubService.getFileContent(owner, repo, file);
        return NextResponse.json({
          success: true,
          operation: 'file',
          owner,
          repo,
          path: file,
          branch,
          content,
        });
      }

      // List directory contents (default operation)
      const contents = await githubService.getRepoContents(owner, repo, path);
      
      // Get repository info for context
      const repoInfo = await githubService.getRepoInfo(owner, repo);

      return NextResponse.json({
        success: true,
        operation: 'browse',
        owner,
        repo,
        path,
        branch,
        contents,
        repoInfo: {
          description: repoInfo.description,
          defaultBranch: repoInfo.defaultBranch,
          language: repoInfo.language,
          stars: repoInfo.stars,
          lastUpdated: repoInfo.updatedAt,
        },
      });

    } catch (apiError: any) {
      // Handle GitHub API specific errors
      if (apiError.status === 404) {
        return NextResponse.json(
          { 
            error: 'Not found',
            details: `Repository ${owner}/${repo} or path "${path}" not found`,
            suggestion: 'Check the repository name and path'
          },
          { status: 404 }
        );
      }

      if (apiError.status === 403) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            details: 'You do not have permission to access this repository',
            suggestion: 'Make sure the repository is public or you have access rights'
          },
          { status: 403 }
        );
      }

      if (apiError.status === 401) {
        return NextResponse.json(
          { 
            error: 'Authentication failed',
            details: 'Your GitHub token may have expired',
            suggestion: 'Reconnect your GitHub account in Settings'
          },
          { status: 401 }
        );
      }

      // Rate limit
      if (apiError.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            details: 'GitHub API rate limit reached',
            suggestion: 'Please wait a few minutes before trying again'
          },
          { status: 429 }
        );
      }

      throw apiError; // Re-throw for general error handler
    }

  } catch (error: any) {
    console.error('GitHub Browse API Error:', error);
    
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
 * POST endpoint for batch operations
 * Allows fetching multiple files/folders in a single request
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
      where: { clerkUserId: clerkUserId },
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
    const { owner, repo, operations, branch = 'main' } = body;

    // Validate
    if (!owner || !repo || !operations || !Array.isArray(operations)) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: 'Required: owner, repo, operations (array)'
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

    // Process batch operations
    const results = await Promise.allSettled(
      operations.map(async (op: any) => {
        const { type, path } = op;

        if (type === 'file') {
          return await githubService.getFileContent(owner, repo, path);
        } else if (type === 'directory') {
          return await githubService.getRepoContents(owner, repo, path);
        } else {
          throw new Error(`Unknown operation type: ${type}`);
        }
      })
    );

    // Format results
    const formattedResults = results.map((result, index) => ({
      operation: operations[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null,
    }));

    return NextResponse.json({
      success: true,
      operation: 'batch',
      owner,
      repo,
      branch,
      results: formattedResults,
      summary: {
        total: results.length,
        successful: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
      },
    });

  } catch (error: any) {
    console.error('GitHub Batch API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Batch operation failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
