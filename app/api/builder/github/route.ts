/**
 * GitHub Integration API for HOLLY Builder
 *
 * POST /api/builder/github          — connect GitHub account (validate + store token)
 * GET  /api/builder/github          — get connection status + user info + repo list
 * DELETE /api/builder/github        — disconnect GitHub
 *
 * POST /api/builder/github/import   — clone a repo into a build session
 * POST /api/builder/github/push     — commit + push workspace to GitHub
 * GET  /api/builder/github/status   — get repo status for current session
 * POST /api/builder/github/create   — create a new GitHub repo
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { GitHubService, getGitHubToken, saveGitHubToken } from '@/lib/builder/github-service';
import { getSandboxProvider } from '@/lib/builder/sandbox-provider';
import { emit } from '@/lib/builder/event-bus';
import { invalidateTree } from '@/lib/builder/file-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_ENABLED = process.env.GITHUB_INTEGRATION_ENABLED !== 'false';

async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { clerkUserId: userId } });
}

// ─── Connect / status / disconnect ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!GITHUB_ENABLED) return NextResponse.json({ error: 'GitHub integration disabled' }, { status: 503 });

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'connect';

  if (action === 'connect') {
    const { token } = await req.json();
    if (!token?.startsWith('ghp_') && !token?.startsWith('github_pat_')) {
      return NextResponse.json({ error: 'Invalid token format. Use a GitHub Personal Access Token.' }, { status: 400 });
    }

    try {
      const svc = new GitHubService(token);
      const ghUser = await svc.getUser();
      await saveGitHubToken(user.id, token, ghUser.login);
      // Return user info but NEVER the token
      return NextResponse.json({ ok: true, username: ghUser.login, name: ghUser.name, avatarUrl: ghUser.avatarUrl });
    } catch (err) {
      return NextResponse.json({ error: 'Token validation failed — check scopes (repo, read:user)' }, { status: 401 });
    }
  }

  if (action === 'import') {
    return handleImport(req, user.id);
  }

  if (action === 'push') {
    return handlePush(req, user.id);
  }

  if (action === 'create') {
    return handleCreate(req, user.id);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET(req: NextRequest) {
  if (!GITHUB_ENABLED) return NextResponse.json({ connected: false, enabled: false });

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUser(userId);
  if (!user) return NextResponse.json({ connected: false });

  const token = await getGitHubToken(user.id);
  if (!token) return NextResponse.json({ connected: false, enabled: true });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');

  try {
    const svc = new GitHubService(token);
    const ghUser = await svc.getUser();

    // If sessionId provided, include repo status
    let repoStatus = null;
    if (sessionId) {
      const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId: user.id } });
      if (session?.workspaceDir) {
        const provider = await getSandboxProvider();
        repoStatus = await svc.workspaceStatus({ provider, sessionId }).catch(() => null);
      }
    }

    // List repos (first page)
    const repos = await svc.listRepos(1, 20).catch(() => []);

    return NextResponse.json({
      connected: true,
      enabled: true,
      username: ghUser.login,
      name: ghUser.name,
      avatarUrl: ghUser.avatarUrl,
      repos,
      repoStatus,
    });
  } catch {
    return NextResponse.json({ connected: false, enabled: true, error: 'Token may be expired' });
  }
}

export async function DELETE(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await getUser(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.gitConnection.updateMany({
    where: { userId: user.id, provider: 'github' },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}

// ─── Import ────────────────────────────────────────────────────────────────────

async function handleImport(req: NextRequest, userId: string) {
  const { sessionId, repoUrl, branch } = await req.json();
  if (!sessionId || !repoUrl) return NextResponse.json({ error: 'sessionId and repoUrl required' }, { status: 400 });

  const token = await getGitHubToken(userId);
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 401 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  emit(sessionId, { type: 'info', title: `📦 Importing from GitHub: ${repoUrl}`, level: 'info', phase: 'inspect' });

  const provider = await getSandboxProvider();

  // Ensure workspace exists
  await provider.create(sessionId).catch(() => {});
  await prisma.buildSession.update({ where: { id: sessionId }, data: { workspaceDir: provider.workspaceDir(sessionId), repoUrl, branch: branch ?? 'main' } });

  try {
    const svc = new GitHubService(token);
    await svc.clone({
      repoUrl, branch, provider, sessionId, token,
      onProgress: (msg) => emit(sessionId, { type: 'info', title: msg, level: 'info', phase: 'inspect' }),
    });

    await invalidateTree(sessionId, 'Repository imported');
    emit(sessionId, { type: 'info', title: '✅ Repository imported successfully', body: repoUrl, level: 'success', phase: 'inspect' });

    return NextResponse.json({ ok: true, repoUrl, branch: branch ?? 'main' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(sessionId, { type: 'error', title: 'Import failed', body: msg, level: 'error' });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── Push ─────────────────────────────────────────────────────────────────────

async function handlePush(req: NextRequest, userId: string) {
  const { sessionId, repoUrl, branch, commitMessage, createNew, repoName, isPrivate } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const token = await getGitHubToken(userId);
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 401 });

  const session = await prisma.buildSession.findFirst({ where: { id: sessionId, userId } });
  if (!session?.workspaceDir) return NextResponse.json({ error: 'Session not found or workspace not ready' }, { status: 404 });

  const svc = new GitHubService(token);
  let targetUrl = repoUrl;

  // Create new repo if requested
  if (createNew) {
    if (!repoName) return NextResponse.json({ error: 'repoName required when createNew=true' }, { status: 400 });
    emit(sessionId, { type: 'info', title: `Creating GitHub repo: ${repoName}`, level: 'info', phase: 'done' });
    try {
      const repo = await svc.createRepo({ name: repoName, description: session.prompt.slice(0, 200), isPrivate });
      targetUrl = repo.cloneUrl;
      emit(sessionId, { type: 'info', title: `✅ Repo created: ${repo.htmlUrl}`, level: 'success', phase: 'done' });
    } catch (err) {
      return NextResponse.json({ error: `Failed to create repo: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
    }
  }

  if (!targetUrl) return NextResponse.json({ error: 'repoUrl or createNew required' }, { status: 400 });

  const provider = await getSandboxProvider();

  emit(sessionId, { type: 'info', title: `📤 Pushing to GitHub: ${targetUrl}`, level: 'info', phase: 'done' });

  const result = await svc.push({
    provider,
    sessionId,
    token,
    repoUrl: targetUrl,
    branch: branch ?? 'main',
    commitMessage,
    onProgress: (msg) => emit(sessionId, { type: 'info', title: msg, level: 'info', phase: 'done' }),
  });

  if (result.ok) {
    await prisma.buildSession.update({
      where: { id: sessionId },
      data: { repoUrl: targetUrl, branch: result.branch },
    });
    emit(sessionId, {
      type: 'info',
      title: `✅ Pushed to ${targetUrl} (${result.branch})${result.sha ? ` @ ${result.sha}` : ''}`,
      level: 'success',
      phase: 'done',
    });
  } else {
    emit(sessionId, { type: 'error', title: 'Push failed', body: result.error, level: 'error' });
  }

  return NextResponse.json(result);
}

// ─── Create repo ───────────────────────────────────────────────────────────────

async function handleCreate(req: NextRequest, userId: string) {
  const { name, description, isPrivate } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const token = await getGitHubToken(userId);
  if (!token) return NextResponse.json({ error: 'GitHub not connected' }, { status: 401 });

  try {
    const svc = new GitHubService(token);
    const repo = await svc.createRepo({ name, description, isPrivate });
    return NextResponse.json({ ok: true, repo });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
