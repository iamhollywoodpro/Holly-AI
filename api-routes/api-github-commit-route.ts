/**
 * HOLLY GitHub Commit API Route
 * 
 * Endpoint for creating commits and managing files on GitHub.
 * 
 * @route POST /api/github/commit
 */

import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/integrations/github-client';

// ============================================================================
// Types
// ============================================================================

interface CommitRequest {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
  userId?: string;
}

// ============================================================================
// Initialize Services
// ============================================================================

const githubClient = new GitHubClient(
  process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ''
);

// ============================================================================
// POST - Create/Update File
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: CommitRequest = await request.json();
    const { owner, repo, path, content, message, branch = 'main', userId } = body;

    // Validate required fields
    if (!owner || !repo || !path || !content || !message) {
      return NextResponse.json(
        { error: 'Owner, repo, path, content, and message are required' },
        { status: 400 }
      );
    }

    // Validate path format
    if (path.startsWith('/') || path.endsWith('/')) {
      return NextResponse.json(
        { error: 'Path should not start or end with /' },
        { status: 400 }
      );
    }

    // Create or update file
    const result = await githubClient.createOrUpdateFile({
      owner,
      repo,
      path,
      content,
      message,
      branch
    });

    return NextResponse.json(
      {
        success: true,
        commit: {
          sha: result.commit.sha,
          message: result.commit.message,
          url: result.commit.html_url,
          author: result.commit.author,
          date: result.commit.date
        },
        file: {
          path: result.content.path,
          sha: result.content.sha,
          size: result.content.size,
          url: result.content.html_url
        }
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('GitHub commit API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create/update file',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Get File Content
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const repo = searchParams.get('repo');
    const path = searchParams.get('path');
    const branch = searchParams.get('branch') || 'main';

    if (!owner || !repo || !path) {
      return NextResponse.json(
        { error: 'Owner, repo, and path parameters are required' },
        { status: 400 }
      );
    }

    const file = await githubClient.getFileContent(owner, repo, path, branch);

    return NextResponse.json(
      {
        success: true,
        file: {
          path: file.path,
          content: file.content,
          sha: file.sha,
          size: file.size,
          url: file.html_url,
          downloadUrl: file.download_url
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('GitHub get file API error:', error);
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to get file content',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete File
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { owner, repo, path, message, branch = 'main' } = body;

    if (!owner || !repo || !path || !message) {
      return NextResponse.json(
        { error: 'Owner, repo, path, and message are required' },
        { status: 400 }
      );
    }

    // Get current file SHA (required for deletion)
    const file = await githubClient.getFileContent(owner, repo, path, branch);

    // Delete file
    const result = await githubClient.deleteFile({
      owner,
      repo,
      path,
      message,
      sha: file.sha,
      branch
    });

    return NextResponse.json(
      {
        success: true,
        message: `File ${path} deleted successfully`,
        commit: {
          sha: result.commit.sha,
          message: result.commit.message
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('GitHub delete file API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete file',
        message: error.message
      },
      { status: 500 }
    );
  }
}
