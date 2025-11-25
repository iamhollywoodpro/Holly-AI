import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { compareBranches, getCommits } from '@/lib/github-api';

/**
 * GET /api/github/compare
 * Compare two branches to get commits and file changes for PR template generation
 * 
 * Query Params:
 * - owner: Repository owner
 * - repo: Repository name
 * - base: Base branch (target)
 * - head: Head branch (source, your changes)
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
    const base = searchParams.get('base');
    const head = searchParams.get('head');

    if (!owner || !repo || !base || !head) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner, repo, base, head' },
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

    // Compare branches
    const comparison = await compareBranches(
      owner,
      repo,
      base,
      head,
      connection.accessToken
    );

    return NextResponse.json({
      success: true,
      comparison,
    });
  } catch (error: any) {
    console.error('Error comparing branches:', error);

    // Handle specific errors
    if (error.message?.includes('Not Found')) {
      return NextResponse.json(
        { error: 'Branch not found or no commits to compare' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to compare branches' },
      { status: 500 }
    );
  }
}
