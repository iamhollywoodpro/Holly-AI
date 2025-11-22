import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { createCommit, type GitHubFile } from '@/lib/github-api';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { owner, repo, branch, message, files } = body;

    // Validate input
    if (!owner || !repo || !branch || !message || !files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Missing required fields: owner, repo, branch, message, files' },
        { status: 400 }
      );
    }

    // Get user's GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'GitHub not connected. Please connect your GitHub account first.' },
        { status: 403 }
      );
    }

    // Create the commit
    const result = await createCommit({
      owner,
      repo,
      branch,
      message,
      files: files as GitHubFile[],
      token: connection.accessToken,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create commit' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      commit: {
        sha: result.commitSha,
        url: result.commitUrl,
        message: result.message,
      },
    });

  } catch (error: any) {
    console.error('Commit API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
