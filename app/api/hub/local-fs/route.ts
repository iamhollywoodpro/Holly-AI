/**
 * POST /api/hub/local-fs — HTTP Hub for local filesystem tools
 *
 * Provides `local_read_file`, `local_write_file`, `local_list_dir`,
 * and `local_run_command` as HTTP endpoints so they work even when
 * the stdio MCP subprocess fails in Docker/Coolify.
 *
 * Secured via x-internal-token (server-to-server only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execAsync = promisify(execFile);
const REPO_ROOT = process.cwd();

function verifyInternal(req: NextRequest): boolean {
  const token = req.headers.get('x-internal-token');
  const secret = process.env.INTERNAL_API_SECRET;
  return !!(secret && token && token === secret);
}

function safePath(input: string): string {
  const resolved = path.resolve(REPO_ROOT, input);
  if (!resolved.startsWith(REPO_ROOT)) {
    throw new Error('Path traversal blocked');
  }
  return resolved;
}

export async function POST(req: NextRequest) {
  if (!verifyInternal(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const tool = body.tool as string;
    const args = body.args ?? {};

    switch (tool) {

      // ── local_read_file ────────────────────────────────────────────────────
      case 'local_read_file': {
        if (!args.path) return NextResponse.json({ error: 'path required' }, { status: 400 });
        const fullPath = safePath(args.path);
        if (!existsSync(fullPath)) {
          return NextResponse.json({ ok: true, result: `File not found at ${args.path}` });
        }
        const content = await readFile(fullPath, 'utf-8');
        const lines = content.split('\n').length;
        return NextResponse.json({
          ok: true,
          result: `${args.path} (${lines} lines)\n\n${content}`,
        });
      }

      // ── local_write_file ───────────────────────────────────────────────────
      case 'local_write_file': {
        if (!args.path) return NextResponse.json({ error: 'path required' }, { status: 400 });
        if (args.content === undefined) return NextResponse.json({ error: 'content required' }, { status: 400 });
        const fullPath = safePath(args.path);
        const dir = path.dirname(fullPath);
        if (!existsSync(dir)) await mkdir(dir, { recursive: true });
        await writeFile(fullPath, args.content, 'utf-8');
        return NextResponse.json({ ok: true, result: `Successfully wrote to ${args.path}` });
      }

      // ── local_list_dir ────────────────────────────────────────────────────
      case 'local_list_dir': {
        const dirPath = safePath(args.path || '.');
        if (!existsSync(dirPath)) {
          return NextResponse.json({ ok: true, result: `Directory not found at ${args.path}` });
        }
        const entries = await readdir(dirPath, { withFileTypes: true });
        const dirs = entries.filter(e => e.isDirectory()).map(e => `${e.name}/`);
        const files = entries.filter(e => e.isFile()).map(e => e.name);
        return NextResponse.json({
          ok: true,
          result: `Contents of ${args.path || '.'}:\n\n${[...dirs, ...files].join('\n')}`,
        });
      }

      // ── local_run_command ──────────────────────────────────────────────────
      case 'local_run_command': {
        if (!args.command) return NextResponse.json({ error: 'command required' }, { status: 400 });

        // Only allow safe commands — block dangerous operations
        const blocked = ['rm -rf /', 'mkfs', 'dd if=', ':(){:|:&};:', 'shutdown', 'reboot'];
        if (blocked.some(b => args.command.includes(b))) {
          return NextResponse.json({ ok: true, result: `Command blocked for safety: ${args.command}` });
        }

        const cwd = args.cwd ? safePath(args.cwd) : REPO_ROOT;
        const timeout = Math.min(args.timeout || 30_000, 120_000);

        try {
          const { stdout, stderr } = await execAsync('sh', ['-c', args.command], {
            cwd,
            timeout,
            maxBuffer: 5 * 1024 * 1024, // 5 MB
          });

          let result = `Command: ${args.command}\n`;
          if (stdout) result += `stdout:\n${stdout.substring(0, 50_000)}\n`;
          if (stderr) result += `stderr:\n${stderr.substring(0, 10_000)}\n`;
          return NextResponse.json({ ok: true, result });
        } catch (err: unknown) {
          const e = err as Error & { stdout?: string; stderr?: string };
          let result = `Command failed: ${args.command}\n`;
          if (e.stdout) result += `stdout:\n${e.stdout.substring(0, 50_000)}\n`;
          if (e.stderr) result += `stderr:\n${e.stderr.substring(0, 10_000)}\n`;
          result += `Error: ${e.message}`;
          return NextResponse.json({ ok: true, result });
        }
      }

      default:
        return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
