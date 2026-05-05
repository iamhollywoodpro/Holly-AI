/**
 * HOLLY AI Builder — Sandbox Service (Phase 11)
 *
 * Provides isolated workspace directories, file operations,
 * command execution, process management, and port detection.
 * Local-first — can be swapped for Docker/Firecracker later.
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import os from 'os';

const execAsync = promisify(exec);

// ─── Constants ────────────────────────────────────────────────────────────────

const SANDBOX_ROOT = path.join(os.tmpdir(), 'holly-builder');
const MAX_OUTPUT_BYTES = 256 * 1024; // 256 KB per command output
const CMD_TIMEOUT_MS = 120_000; // 2 min default timeout
const ALLOWED_COMMANDS = new Set([
  'npm', 'npx', 'node', 'yarn', 'pnpm', 'python', 'python3', 'pip', 'pip3',
  'git', 'ls', 'cat', 'mkdir', 'rm', 'cp', 'mv', 'touch', 'echo', 'find',
  'grep', 'sed', 'awk', 'curl', 'wget', 'unzip', 'tar', 'chmod', 'which',
  'next', 'vite', 'tsc', 'jest', 'vitest', 'eslint', 'prettier',
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SandboxFile {
  path: string;
  content: string;
  size: number;
  isDirectory: boolean;
  language?: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
  size?: number;
  language?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export interface ProcessHandle {
  id: string;
  pid: number;
  command: string;
  cwd: string;
  status: 'running' | 'stopped' | 'crashed';
  port?: number;
  kill: () => void;
  onLog: (cb: (line: string) => void) => void;
}

// ─── In-memory process registry ───────────────────────────────────────────────

const activeProcesses = new Map<string, { proc: ChildProcess; listeners: Array<(line: string) => void> }>();

// ─── Workspace Management ─────────────────────────────────────────────────────

export async function ensureSandboxRoot(): Promise<void> {
  await fs.mkdir(SANDBOX_ROOT, { recursive: true });
}

export function getWorkspaceDir(sessionId: string): string {
  return path.join(SANDBOX_ROOT, sessionId);
}

export async function createWorkspace(sessionId: string): Promise<string> {
  await ensureSandboxRoot();
  const dir = getWorkspaceDir(sessionId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function destroyWorkspace(sessionId: string): Promise<void> {
  const dir = getWorkspaceDir(sessionId);
  await fs.rm(dir, { recursive: true, force: true });
}

// ─── File Operations ──────────────────────────────────────────────────────────

export async function writeFile(workspaceDir: string, filePath: string, content: string): Promise<void> {
  const abs = resolveSafe(workspaceDir, filePath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, 'utf8');
}

export async function readFile(workspaceDir: string, filePath: string): Promise<string> {
  const abs = resolveSafe(workspaceDir, filePath);
  return fs.readFile(abs, 'utf8');
}

export async function deleteFile(workspaceDir: string, filePath: string): Promise<void> {
  const abs = resolveSafe(workspaceDir, filePath);
  await fs.rm(abs, { recursive: true, force: true });
}

export async function renameFile(workspaceDir: string, oldPath: string, newPath: string): Promise<void> {
  const absOld = resolveSafe(workspaceDir, oldPath);
  const absNew = resolveSafe(workspaceDir, newPath);
  await fs.mkdir(path.dirname(absNew), { recursive: true });
  await fs.rename(absOld, absNew);
}

export async function listFiles(workspaceDir: string, subPath = '.'): Promise<FileTreeNode[]> {
  const abs = resolveSafe(workspaceDir, subPath);
  return buildFileTree(abs, workspaceDir, 0, 4);
}

export async function searchCode(workspaceDir: string, query: string): Promise<Array<{ path: string; line: number; text: string }>> {
  try {
    const { stdout } = await execAsync(
      `grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" --include="*.css" -m 5 "${query.replace(/"/g, '\\"')}" .`,
      { cwd: workspaceDir, timeout: 10000 }
    );
    return stdout.split('\n').filter(Boolean).slice(0, 50).map(line => {
      const [fileLine, ...rest] = line.split(':');
      const [file, lineNum] = fileLine.split(':');
      return { path: file, line: parseInt(lineNum) || 0, text: rest.join(':').trim() };
    });
  } catch {
    return [];
  }
}

async function buildFileTree(
  abs: string,
  workspaceDir: string,
  depth: number,
  maxDepth: number
): Promise<FileTreeNode[]> {
  const entries = await fs.readdir(abs, { withFileTypes: true });
  const nodes: FileTreeNode[] = [];

  const IGNORE = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.cache', 'coverage']);

  for (const entry of entries) {
    if (IGNORE.has(entry.name)) continue;
    const entryAbs = path.join(abs, entry.name);
    const relPath = path.relative(workspaceDir, entryAbs);

    if (entry.isDirectory()) {
      const node: FileTreeNode = {
        name: entry.name,
        path: relPath,
        isDirectory: true,
        children: depth < maxDepth ? await buildFileTree(entryAbs, workspaceDir, depth + 1, maxDepth) : [],
      };
      nodes.push(node);
    } else {
      const stat = await fs.stat(entryAbs).catch(() => null);
      nodes.push({
        name: entry.name,
        path: relPath,
        isDirectory: false,
        size: stat?.size ?? 0,
        language: detectLanguage(entry.name),
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ─── Command Execution ────────────────────────────────────────────────────────

export async function runCommand(
  command: string,
  cwd: string,
  opts: { timeoutMs?: number; env?: Record<string, string> } = {}
): Promise<CommandResult> {
  const start = Date.now();

  // Safety check
  const baseCmd = command.trim().split(/\s+/)[0];
  if (!ALLOWED_COMMANDS.has(baseCmd)) {
    return {
      stdout: '',
      stderr: `Command not allowed: ${baseCmd}`,
      exitCode: 1,
      durationMs: 0,
      timedOut: false,
    };
  }

  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn('bash', ['-c', command], {
      cwd,
      env: { ...process.env, ...opts.env, PATH: process.env.PATH || '/usr/bin:/bin:/usr/local/bin' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 3000);
    }, opts.timeoutMs ?? CMD_TIMEOUT_MS);

    proc.on('close', exitCode => {
      clearTimeout(timer);
      resolve({
        stdout: stdout.slice(0, MAX_OUTPUT_BYTES),
        stderr: stderr.slice(0, MAX_OUTPUT_BYTES),
        exitCode: exitCode ?? 1,
        durationMs: Date.now() - start,
        timedOut,
      });
    });
  });
}

// ─── Dev Server / Process Management ─────────────────────────────────────────

export function startDevServer(
  processId: string,
  command: string,
  cwd: string,
  onLog: (line: string) => void
): { pid: number; kill: () => void } {
  const proc = spawn('bash', ['-c', command], {
    cwd,
    env: { ...process.env, PATH: process.env.PATH || '/usr/bin:/bin:/usr/local/bin' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const listeners: Array<(line: string) => void> = [onLog];
  activeProcesses.set(processId, { proc, listeners });

  const pipe = (chunk: Buffer) => {
    const line = chunk.toString();
    listeners.forEach(l => l(line));
  };

  proc.stdout.on('data', pipe);
  proc.stderr.on('data', pipe);

  proc.on('exit', () => activeProcesses.delete(processId));

  return {
    pid: proc.pid ?? 0,
    kill: () => {
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill?.('SIGKILL'), 3000);
      activeProcesses.delete(processId);
    },
  };
}

export function stopProcess(processId: string): void {
  const entry = activeProcesses.get(processId);
  if (entry) {
    entry.proc.kill('SIGTERM');
    setTimeout(() => entry.proc.kill?.('SIGKILL'), 3000);
    activeProcesses.delete(processId);
  }
}

export function isProcessRunning(processId: string): boolean {
  const entry = activeProcesses.get(processId);
  if (!entry) return false;
  return entry.proc.exitCode === null; // still running
}

// ─── Port Detection ───────────────────────────────────────────────────────────

export async function detectOpenPort(
  preferred: number[],
  scanRange: [number, number] = [3000, 9999]
): Promise<number> {
  // Try preferred ports first
  for (const port of preferred) {
    if (await isPortFree(port)) return port;
  }
  // Scan range
  for (let p = scanRange[0]; p <= scanRange[1]; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error('No free ports found');
}

export async function waitForPort(port: number, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortListening(port)) return true;
    await sleep(500);
  }
  return false;
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on('error', () => resolve(false));
  });
}

function isPortListening(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(300);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => resolve(false));
    sock.connect(port, '127.0.0.1');
  });
}

// ─── Framework Detection ──────────────────────────────────────────────────────

export async function detectFramework(workspaceDir: string): Promise<{
  framework: string;
  packageManager: string;
  devCommand: string;
  buildCommand: string;
  installCommand: string;
  port: number;
}> {
  let pkg: Record<string, unknown> = {};
  try {
    const raw = await readFile(workspaceDir, 'package.json');
    pkg = JSON.parse(raw);
  } catch { /* no package.json */ }

  const deps = { ...((pkg.dependencies ?? {}) as Record<string, string>), ...((pkg.devDependencies ?? {}) as Record<string, string>) };
  const scripts = (pkg.scripts ?? {}) as Record<string, string>;

  // Detect package manager
  const hasPnpm = fsSync.existsSync(path.join(workspaceDir, 'pnpm-lock.yaml'));
  const hasYarn = fsSync.existsSync(path.join(workspaceDir, 'yarn.lock'));
  const pm = hasPnpm ? 'pnpm' : hasYarn ? 'yarn' : 'npm';
  const pmInstall = hasPnpm ? 'pnpm install' : hasYarn ? 'yarn install' : 'npm install';

  // Detect framework
  if (deps['next']) {
    return { framework: 'nextjs', packageManager: pm, devCommand: `${pm} run dev`, buildCommand: `${pm} run build`, installCommand: pmInstall, port: 3000 };
  }
  if (deps['vite'] || scripts['dev']?.includes('vite')) {
    return { framework: 'vite', packageManager: pm, devCommand: `${pm} run dev`, buildCommand: `${pm} run build`, installCommand: pmInstall, port: 5173 };
  }
  if (deps['react-scripts']) {
    return { framework: 'cra', packageManager: pm, devCommand: `${pm} start`, buildCommand: `${pm} run build`, installCommand: pmInstall, port: 3000 };
  }
  if (deps['express'] || deps['fastify']) {
    return { framework: 'node', packageManager: pm, devCommand: scripts['dev'] ? `${pm} run dev` : 'node index.js', buildCommand: '', installCommand: pmInstall, port: 3000 };
  }
  if (fsSync.existsSync(path.join(workspaceDir, 'requirements.txt'))) {
    return { framework: 'python', packageManager: 'pip', devCommand: 'python app.py', buildCommand: '', installCommand: 'pip install -r requirements.txt', port: 5000 };
  }

  return { framework: 'static', packageManager: 'npm', devCommand: 'npx serve .', buildCommand: '', installCommand: '', port: 3000 };
}

// ─── Git Operations ───────────────────────────────────────────────────────────

export async function gitInit(workspaceDir: string): Promise<void> {
  await runCommand('git init && git add -A && git commit -m "initial scaffold by HOLLY"', workspaceDir);
}

export async function gitStatus(workspaceDir: string): Promise<string> {
  const r = await runCommand('git status --short', workspaceDir);
  return r.stdout || 'clean';
}

export async function gitDiff(workspaceDir: string): Promise<string> {
  const r = await runCommand('git diff HEAD', workspaceDir);
  return r.stdout.slice(0, 8000);
}

export async function gitCommit(workspaceDir: string, message: string): Promise<CommandResult> {
  await runCommand('git add -A', workspaceDir);
  return runCommand(`git commit -m "${message.replace(/"/g, "'")}"`, workspaceDir);
}

// ─── Workspace Inspection ─────────────────────────────────────────────────────

export async function inspectWorkspace(workspaceDir: string): Promise<{
  framework: Awaited<ReturnType<typeof detectFramework>>;
  files: FileTreeNode[];
  packageJson?: Record<string, unknown>;
  gitStatus?: string;
  hasGit: boolean;
}> {
  const [framework, files] = await Promise.all([
    detectFramework(workspaceDir),
    listFiles(workspaceDir),
  ]);

  let packageJson: Record<string, unknown> | undefined;
  try {
    packageJson = JSON.parse(await readFile(workspaceDir, 'package.json'));
  } catch { /* no package.json */ }

  const hasGit = fsSync.existsSync(path.join(workspaceDir, '.git'));
  let gitStat: string | undefined;
  if (hasGit) {
    gitStat = await gitStatus(workspaceDir).catch(() => undefined);
  }

  return { framework, files, packageJson, gitStatus: gitStat, hasGit };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveSafe(workspaceDir: string, filePath: string): string {
  const abs = path.resolve(workspaceDir, filePath);
  if (!abs.startsWith(path.resolve(workspaceDir))) {
    throw new Error(`Path escape attempt: ${filePath}`);
  }
  return abs;
}

function detectLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescriptreact',
    '.js': 'javascript', '.jsx': 'javascriptreact',
    '.py': 'python', '.css': 'css', '.scss': 'scss',
    '.html': 'html', '.json': 'json', '.md': 'markdown',
    '.yaml': 'yaml', '.yml': 'yaml', '.sh': 'bash',
    '.env': 'plaintext', '.toml': 'toml', '.rs': 'rust',
    '.go': 'go', '.sql': 'sql',
  };
  return map[ext] ?? 'plaintext';
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
