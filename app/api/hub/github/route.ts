/**
 * HOLLY GitHub Hub — HTTP API proxy for all GitHub self-editing tools
 *
 * This route makes GitHub tools (read_file, list_files, create_or_update_file, etc.)
 * available via HTTP instead of stdio subprocess. Critical for Coolify/Docker
 * deployments where the stdio MCP server may fail to start.
 *
 * Called by: mcp-client.ts _registerGitHubHub()
 * Auth: x-internal-token (server-to-server) | Bearer/x-api-key/x-hub-key (external)
 * Tools exposed: github_read_file, github_list_files, github_create_or_update_file,
 *                github_create_pr, github_create_issue, github_list_prs, github_get_commits
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { checkHubRateLimit } from '@/lib/hub/rate-limit';
import { writeLog, newRequestId, startTimer } from '@/lib/hub/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GITHUB_API = 'https://api.github.com';

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || process.env.HOLLY_GITHUB_OWNER || 'iamhollywoodpro';
  const repo  = process.env.GITHUB_REPO  || process.env.HOLLY_GITHUB_REPO  || 'Holly-AI';
  return { token, owner, repo };
}

async function ghRequest(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent':  'Holly-AI/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function ok(text: string) {
  return NextResponse.json({ result: text });
}
function err(text: string, status = 400) {
  return NextResponse.json({ error: text }, { status });
}

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const elapsed   = startTimer();

  const auth = await guardHubRequest(req);
  if (!isAuthSuccess(auth)) return auth.response;

  const rl = checkHubRateLimit(auth.userId, 'github');
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${Math.ceil(rl.resetInMs / 1000)}s.`, code: 'RATE_LIMITED', requestId },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    );
  }

  let parsed: { action: string; args: Record<string, unknown> };
  try {
    parsed = await req.json() as { action: string; args: Record<string, unknown> };
  } catch {
    return err('Invalid JSON body');
  }

  const { action, args } = parsed;
  const { token, owner, repo } = getConfig();

  if (!token) {
    return err('GITHUB_TOKEN is not set in environment variables. Holly cannot access her repository without this.');
  }

  const repoOwner = (args.repo as string | undefined)?.split('/')?.[0] || owner;
  const repoName  = (args.repo as string | undefined)?.split('/')?.[1] || repo;
  const branch    = (args.branch as string) || 'main';

  try {
    let result: string;

    // ── github_read_file ──────────────────────────────────────────────────────
    if (action === 'github_read_file') {
      const filePath = args.path as string;
      if (!filePath) { result = 'path is required'; writeLog({ requestId, timestamp: new Date().toISOString(), tool: 'github', action, userId: auth.userId, apiKeyId: auth.keyId, duration: elapsed(), status: 'error', statusCode: 400, errorMsg: result, inputSize: 0, outputSize: 0 }); return err(result); }

      const { status, data } = await ghRequest('GET', `/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`, token);
      const body = data as Record<string, unknown>;

      if (body.message) result = `GitHub error: ${body.message}`;
      else if (body.encoding === 'base64' && body.content) {
        const content = Buffer.from(body.content as string, 'base64').toString('utf-8');
        result = `📄 ${filePath} (${content.split('\n').length} lines)\n\n${content}`;
      } else if (Array.isArray(data)) result = `${filePath} is a directory. Use github_list_files instead.`;
      else result = `Unexpected response from GitHub API (status ${status}).`;

    // ── github_list_files ─────────────────────────────────────────────────────
    } else if (action === 'github_list_files') {
      const dirPath = (args.path as string) || '';
      const { data } = await ghRequest('GET', `/repos/${repoOwner}/${repoName}/contents/${dirPath}?ref=${branch}`, token);

      if (!Array.isArray(data)) {
        const body = data as Record<string, unknown>;
        result = `GitHub error: ${body.message || 'Unexpected response'}`;
      } else {
        const dirs  = data.filter((i: {type:string}) => i.type === 'dir').map((i: {name:string}) => `📁 ${i.name}/`);
        const files = data.filter((i: {type:string}) => i.type === 'file').map((i: {name:string}) => `📄 ${i.name}`);
        result = `Contents of /${dirPath || '(root)'}:\n\n${[...dirs, ...files].join('\n')}`;
      }

    // ── github_create_or_update_file ──────────────────────────────────────────
    } else if (action === 'github_create_or_update_file') {
      const filePath = args.path as string;
      const content  = args.content as string;
      const message  = args.message as string;
      if (!filePath || !content || !message) { result = 'path, content, and message are required'; writeLog({ requestId, timestamp: new Date().toISOString(), tool: 'github', action, userId: auth.userId, apiKeyId: auth.keyId, duration: elapsed(), status: 'error', statusCode: 400, errorMsg: result, inputSize: 0, outputSize: 0 }); return err(result); }

      const encodedContent = Buffer.from(content, 'utf-8').toString('base64');

      let sha: string | undefined;
      try {
        const { data: existing } = await ghRequest('GET', `/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`, token);
        const existingBody = existing as Record<string, unknown>;
        if (existingBody?.sha) sha = existingBody.sha as string;
      } catch { /* file doesn't exist yet */ }

      const { status, data } = await ghRequest('PUT', `/repos/${repoOwner}/${repoName}/contents/${filePath}`, token, {
        message,
        content: encodedContent,
        branch,
        ...(sha ? { sha } : {}),
      });
      const body = data as Record<string, unknown>;

      if (status === 200 || status === 201) {
        const actionWord = status === 201 ? 'Created' : 'Updated';
        const commit = body.commit as Record<string, unknown> | undefined;
        result = `✅ ${actionWord} ${filePath}\nCommit: ${(commit?.sha as string)?.slice(0, 7) || '?'}\n${commit?.html_url || ''}`;
      } else {
        result = `❌ GitHub write error (${status}): ${JSON.stringify(data)}`;
      }

    // ── github_create_pr ──────────────────────────────────────────────────────
    } else if (action === 'github_create_pr') {
      const { status, data } = await ghRequest('POST', `/repos/${repoOwner}/${repoName}/pulls`, token, {
        title: args.title,
        body:  args.body || '',
        head:  args.head,
        base:  args.base || 'main',
      });
      const body = data as Record<string, unknown>;
      if (status === 201) {
        result = `✅ Pull request created!\nTitle: ${body.title}\nURL:   ${body.html_url}\nNumber: #${body.number}`;
      } else {
        result = `❌ PR creation failed (${status}): ${JSON.stringify(data)}`;
      }

    // ── github_create_issue ───────────────────────────────────────────────────
    } else if (action === 'github_create_issue') {
      const { status, data } = await ghRequest('POST', `/repos/${repoOwner}/${repoName}/issues`, token, {
        title:  args.title,
        body:   args.body || '',
        labels: args.labels || [],
      });
      const body = data as Record<string, unknown>;
      if (status === 201) {
        result = `✅ Issue created!\nTitle: ${body.title}\nURL:   ${body.html_url}\nNumber: #${body.number}`;
      } else {
        result = `❌ Issue creation failed (${status}): ${JSON.stringify(data)}`;
      }

    // ── github_list_prs ───────────────────────────────────────────────────────
    } else if (action === 'github_list_prs') {
      const state = (args.state as string) || 'open';
      const { data } = await ghRequest('GET', `/repos/${repoOwner}/${repoName}/pulls?state=${state}&per_page=20`, token);
      if (!Array.isArray(data)) {
        result = `GitHub error: ${(data as Record<string,unknown>).message}`;
      } else if (data.length === 0) {
        result = `No ${state} pull requests found.`;
      } else {
        const list = data.map((pr: Record<string, unknown>) => `#${pr.number} — ${pr.title}\n  ${pr.html_url}`).join('\n\n');
        result = `${state.toUpperCase()} Pull Requests:\n\n${list}`;
      }

    // ── github_get_commits ────────────────────────────────────────────────────
    } else if (action === 'github_get_commits') {
      const limit = Math.min((args.limit as number) || 10, 30);
      const { data } = await ghRequest('GET', `/repos/${repoOwner}/${repoName}/commits?sha=${branch}&per_page=${limit}`, token);
      if (!Array.isArray(data)) {
        result = `GitHub error: ${(data as Record<string,unknown>).message}`;
      } else {
        const list = data.map((c: Record<string, unknown>) => {
          const commit = c.commit as Record<string, unknown>;
          const msg = (commit?.message as string)?.split('\n')[0];
          return `${(c.sha as string).slice(0, 7)} — ${msg}`;
        }).join('\n');
        result = `Recent commits on ${branch}:\n\n${list}`;
      }

    } else {
      writeLog({ requestId, timestamp: new Date().toISOString(), tool: 'github', action, userId: auth.userId, apiKeyId: auth.keyId, duration: elapsed(), status: 'error', statusCode: 400, errorMsg: `Unknown action: ${action}`, inputSize: 0, outputSize: 0 });
      return err(`Unknown GitHub action: ${action}`);
    }

    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'github', action,
      userId: auth.userId, apiKeyId: auth.keyId,
      duration: elapsed(), status: 'success', statusCode: 200,
      inputSize: JSON.stringify(args).length, outputSize: result.length,
    });

    return ok(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'GitHub hub request failed';
    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'github', action: action || 'unknown',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration: elapsed(), status: 'error', statusCode: 500, errorMsg: msg,
      inputSize: 0, outputSize: 0,
    });
    return NextResponse.json({ error: msg, requestId }, { status: 500 });
  }
}
