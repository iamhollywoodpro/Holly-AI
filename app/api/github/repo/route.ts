/**
 * POST /api/github/repo
 * Create a new GitHub repository for the authenticated user.
 * Requires: { name, description?, private?, autoInit? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description = '', private: isPrivate = false, autoInit = true } = body;

    if (!name) {
      return NextResponse.json({ error: 'Repository name is required' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Get GitHub connection
    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: { accessToken: true, isConnected: true },
    });

    if (!connection?.isConnected || !connection.accessToken) {
      return NextResponse.json(
        { error: 'GitHub account not connected. Please connect GitHub in Settings → Integrations.' },
        { status: 400 }
      );
    }

    // Create repo via GitHub API
    const ghRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: autoInit,
      }),
    });

    if (!ghRes.ok) {
      const err = await ghRes.json().catch(() => ({ message: ghRes.statusText }));
      // 422 = repo already exists
      if (ghRes.status === 422) {
        return NextResponse.json(
          { error: `Repository "${name}" already exists on GitHub`, githubError: err },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'GitHub API error', detail: err?.message ?? ghRes.statusText },
        { status: ghRes.status }
      );
    }

    const repo = await ghRes.json();

    // Upsert to local DB
    try {
      await prisma.gitHubRepository.upsert({
        where: { userId_githubId: { userId: user.id, githubId: repo.id.toString() } },
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
          stars: repo.stargazers_count ?? 0,
          forks: repo.forks_count ?? 0,
          openIssues: repo.open_issues_count ?? 0,
          watchers: repo.watchers_count ?? 0,
          size: repo.size ?? 0,
          isPrivate: repo.private,
          isFork: repo.fork,
          isArchived: repo.archived,
          defaultBranch: repo.default_branch ?? 'main',
          githubCreatedAt: repo.created_at ? new Date(repo.created_at) : null,
          githubUpdatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
          topics: repo.topics ?? [],
          lastSyncAt: new Date(),
        },
        update: {
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          htmlUrl: repo.html_url,
          isPrivate: repo.private,
          defaultBranch: repo.default_branch ?? 'main',
          lastSyncAt: new Date(),
        },
      });
    } catch (dbErr: any) {
      console.warn('[GitHub/repo] DB upsert failed (non-fatal):', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      repository: {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        private: repo.private,
        defaultBranch: repo.default_branch,
        description: repo.description,
        createdAt: repo.created_at,
      },
    });

  } catch (error: any) {
    console.error('[GitHub/repo] Error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}

/**
 * GET /api/github/repo?owner=:owner&name=:name
 * Fetch a single repository from GitHub.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const name = searchParams.get('name');

    if (!owner || !name) {
      return NextResponse.json({ error: 'owner and name query params are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const connection = await prisma.gitHubConnection.findUnique({
      where: { userId: user.id },
      select: { accessToken: true, isConnected: true },
    });
    if (!connection?.isConnected || !connection.accessToken) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }

    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!ghRes.ok) {
      const err = await ghRes.json().catch(() => ({ message: ghRes.statusText }));
      return NextResponse.json(
        { error: 'GitHub API error', detail: err?.message },
        { status: ghRes.status }
      );
    }

    const repo = await ghRes.json();
    return NextResponse.json({ success: true, repository: repo });

  } catch (error: any) {
    console.error('[GitHub/repo GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 });
  }
}
