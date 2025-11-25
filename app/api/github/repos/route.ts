// List GitHub Repositories
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserId },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: {
        accessToken: true,
        isConnected: true,
      },
    });
    
    if (!connection || !connection.isConnected) {
      return NextResponse.json(
        { error: 'GitHub not connected' },
        { status: 400 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const sync = searchParams.get('sync') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '30');
    const sort = searchParams.get('sort') || 'updated';
    const direction = searchParams.get('direction') || 'desc';
    
    if (sync) {
      // Fetch from GitHub API and update database
      const githubRepos = await fetchGitHubRepos(
        connection.accessToken,
        page,
        perPage,
        sort,
        direction
      );
      
      // Upsert repositories to database
      for (const repo of githubRepos) {
        await prisma.gitHubRepository.upsert({
          where: {
            userId_githubId: {
              userId: user.id,
              githubId: repo.id.toString(),
            },
          },
          create: {
            userId: user.id,
            githubId: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            description: repo.description,
            url: repo.url,
            htmlUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            sshUrl: repo.ssh_url,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            openIssues: repo.open_issues_count,
            watchers: repo.watchers_count,
            size: repo.size,
            isPrivate: repo.private,
            isFork: repo.fork,
            isArchived: repo.archived,
            defaultBranch: repo.default_branch,
            githubCreatedAt: repo.created_at ? new Date(repo.created_at) : null,
            githubUpdatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
            githubPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
            topics: repo.topics || [],
            lastSyncAt: new Date(),
          },
          update: {
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            openIssues: repo.open_issues_count,
            watchers: repo.watchers_count,
            size: repo.size,
            isPrivate: repo.private,
            isFork: repo.fork,
            isArchived: repo.archived,
            defaultBranch: repo.default_branch,
            githubUpdatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
            githubPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
            topics: repo.topics || [],
            lastSyncAt: new Date(),
          },
        });
      }
    }
    
    // Get repositories from database
    const repos = await prisma.gitHubRepository.findMany({
      where: { userId: user.id },
      orderBy: { githubUpdatedAt: 'desc' },
      take: perPage,
      skip: (page - 1) * perPage,
    });
    
    const total = await prisma.gitHubRepository.count({
      where: { userId: user.id },
    });
    
    return NextResponse.json({
      success: true,
      repos,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
    
  } catch (error: any) {
    console.error('List GitHub repos error:', error);
    return NextResponse.json(
      { error: 'Failed to list repositories' },
      { status: 500 }
    );
  }
}

// Helper function to fetch repos from GitHub API
async function fetchGitHubRepos(
  accessToken: string,
  page: number,
  perPage: number,
  sort: string,
  direction: string
): Promise<any[]> {
  const response = await fetch(
    `https://api.github.com/user/repos?page=${page}&per_page=${perPage}&sort=${sort}&direction=${direction}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }
  
  return response.json();
}
