import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { Octokit } from '@octokit/rest';

/**
 * GET /api/github/commits
 * Fetch recent commit history for a repository
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
    const branch = searchParams.get('branch'); // Optional - defaults to default branch
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

    // Fetch commits
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch || undefined, // Use branch if provided
      per_page: Math.min(perPage, 100), // Max 100
    });

    // Transform commit data to be more user-friendly
    const transformedCommits = commits.map((commit) => ({
      sha: commit.sha,
      shortSha: commit.sha.substring(0, 7),
      message: commit.commit.message,
      author: {
        name: commit.commit.author?.name || 'Unknown',
        email: commit.commit.author?.email || '',
        avatar: commit.author?.avatar_url || null,
        username: commit.author?.login || null,
      },
      date: commit.commit.author?.date || null,
      url: commit.html_url,
      stats: {
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0,
        total: commit.stats?.total || 0,
      },
    }));

    return NextResponse.json({
      success: true,
      commits: transformedCommits,
      count: transformedCommits.length,
    });
  } catch (error: any) {
    console.error('Error fetching commits:', error);

    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch commits' },
      { status: 500 }
    );
  }
}
