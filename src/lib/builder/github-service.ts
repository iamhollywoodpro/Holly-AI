/**
 * HOLLY AI Builder — GitHub Integration Service
 *
 * Handles:
 *   - Token validation
 *   - Repo listing
 *   - Clone/import into workspace
 *   - Repo creation
 *   - Remote setup
 *   - Commit + push
 *   - Branch management
 *
 * Security rules:
 *   - Tokens handled server-side only
 *   - Tokens NEVER logged or returned to client
 *   - Operations scoped to user's session workspace
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Octokit } from '@octokit/rest';
import type { SandboxProvider } from './sandbox-provider';

const execAsync = promisify(exec);

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
}

export interface RepoInfo {
  fullName: string;
  name: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;
  htmlUrl: string;
  stars: number;
  language: string | null;
  updatedAt: string;
}

export interface PushResult {
  ok: boolean;
  repoUrl: string;
  branch: string;
  sha?: string;
  error?: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    // Never log the token
    this.octokit = new Octokit({ auth: token });
  }

  /** Validate token and return user info */
  async getUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
    };
  }

  /** List user's repositories */
  async listRepos(page = 1, perPage = 30): Promise<RepoInfo[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: perPage,
      page,
    });
    return data.map(r => ({
      fullName: r.full_name,
      name: r.name,
      description: r.description,
      private: r.private,
      defaultBranch: r.default_branch,
      cloneUrl: r.clone_url,
      htmlUrl: r.html_url,
      stars: r.stargazers_count,
      language: r.language,
      updatedAt: r.updated_at ?? new Date().toISOString(),
    }));
  }

  /** Clone a repo into the sandbox workspace */
  async clone(opts: {
    repoUrl: string;
    branch?: string;
    provider: SandboxProvider;
    sessionId: string;
    token: string;
    onProgress?: (msg: string) => void;
  }): Promise<void> {
    const { repoUrl, branch, provider, sessionId, token, onProgress } = opts;

    // Inject token into HTTPS URL (never log resulting URL)
    const authedUrl = repoUrl.replace('https://', `https://${token}@`);
    const workspaceDir = provider.workspaceDir(sessionId);

    onProgress?.('Cloning repository…');

    const branchFlag = branch ? `--branch ${branch}` : '';
    const cmd = `git clone --depth=1 ${branchFlag} ${authedUrl} . 2>&1`;

    const result = await provider.exec(sessionId, cmd, { timeoutMs: 120_000 });

    // Sanitize output before returning — remove token from any error messages
    const sanitize = (s: string) => s.replace(new RegExp(token, 'g'), '[REDACTED]');

    if (result.exitCode !== 0) {
      throw new Error(`Clone failed: ${sanitize(result.stderr + result.stdout).slice(0, 300)}`);
    }

    // Strip remote auth to avoid leaking token in git config
    await provider.exec(sessionId, `git remote set-url origin ${repoUrl}`, {}).catch(() => {});
    onProgress?.(`Cloned into workspace`);
  }

  /** Create a new GitHub repo */
  async createRepo(opts: {
    name: string;
    description?: string;
    isPrivate?: boolean;
  }): Promise<RepoInfo> {
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name: opts.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: opts.description,
      private: opts.isPrivate ?? false,
      auto_init: false,
    });
    return {
      fullName: data.full_name,
      name: data.name,
      description: data.description,
      private: data.private,
      defaultBranch: data.default_branch,
      cloneUrl: data.clone_url,
      htmlUrl: data.html_url,
      stars: 0,
      language: null,
      updatedAt: data.updated_at ?? new Date().toISOString(),
    };
  }

  /** Push workspace changes to GitHub */
  async push(opts: {
    provider: SandboxProvider;
    sessionId: string;
    token: string;
    repoUrl: string;
    branch?: string;
    commitMessage?: string;
    onProgress?: (msg: string) => void;
  }): Promise<PushResult> {
    const { provider, sessionId, token, repoUrl, onProgress } = opts;
    const branch = opts.branch ?? 'main';
    const commitMessage = opts.commitMessage ?? 'feat: built by HOLLY AI Builder';
    const authedUrl = repoUrl.replace('https://', `https://${token}@`);

    try {
      // Configure git identity
      await provider.exec(sessionId, 'git config user.email "holly@nexusmusicgroup.com" && git config user.name "HOLLY AI"', {});

      onProgress?.('Initialising git…');
      await provider.exec(sessionId, 'git init', {});

      // Set remote
      await provider.exec(sessionId, `git remote remove origin 2>/dev/null; git remote add origin ${authedUrl}`, {});

      // Stage all
      await provider.exec(sessionId, 'git add -A', {});

      // Check if there's anything to commit
      const status = await provider.exec(sessionId, 'git status --porcelain', {});
      if (!status.stdout.trim()) {
        onProgress?.('Nothing to commit');
        // Strip token from URL before returning
        return { ok: true, repoUrl, branch };
      }

      onProgress?.('Committing files…');
      await provider.exec(sessionId, `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {});

      onProgress?.(`Pushing to ${branch}…`);
      const push = await provider.exec(
        sessionId,
        `git push -u origin HEAD:${branch} --force`,
        { timeoutMs: 60_000 }
      );

      // Sanitize output
      const sanitize = (s: string) => s.replace(new RegExp(token, 'g'), '[REDACTED]');

      if (push.exitCode !== 0) {
        return {
          ok: false,
          repoUrl,
          branch,
          error: sanitize(push.stderr + push.stdout).slice(0, 300),
        };
      }

      // Get latest SHA
      const shaResult = await provider.exec(sessionId, 'git rev-parse HEAD', {});
      const sha = shaResult.stdout.trim().slice(0, 7);

      // Update remote URL to non-authed version
      await provider.exec(sessionId, `git remote set-url origin ${repoUrl}`, {}).catch(() => {});

      return { ok: true, repoUrl, branch, sha };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, repoUrl, branch, error: msg.replace(token, '[REDACTED]').slice(0, 300) };
    }
  }

  /** Get current branch and status for a workspace */
  async workspaceStatus(opts: {
    provider: SandboxProvider;
    sessionId: string;
  }): Promise<{ branch: string; dirty: boolean; ahead: number; status: string }> {
    const { provider, sessionId } = opts;
    const branch = await provider.exec(sessionId, 'git branch --show-current', {});
    const status = await provider.exec(sessionId, 'git status --porcelain', {});
    const ahead = await provider.exec(sessionId, 'git rev-list --count @{u}..HEAD 2>/dev/null || echo 0', {});
    return {
      branch: branch.stdout.trim() || 'main',
      dirty: status.stdout.trim().length > 0,
      ahead: parseInt(ahead.stdout.trim(), 10) || 0,
      status: status.stdout.trim().slice(0, 500),
    };
  }
}

/** Load token from DB for a user */
export async function getGitHubToken(userId: string): Promise<string | null> {
  const { prisma } = await import('@/lib/db');
  const conn = await prisma.gitConnection.findFirst({
    where: { userId, provider: 'github', active: true },
    select: { token: true },
  });
  return conn?.token ?? null;
}

/** Store encrypted token (plaintext for now — encrypt in production with KMS/Vault) */
export async function saveGitHubToken(userId: string, token: string, username: string): Promise<void> {
  const { prisma } = await import('@/lib/db');
  await prisma.gitConnection.upsert({
    where: { userId_provider: { userId, provider: 'github' } },
    update: { token, username, active: true, updatedAt: new Date() },
    create: { userId, provider: 'github', token, username, active: true },
  });
}
