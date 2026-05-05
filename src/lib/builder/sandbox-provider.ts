/**
 * HOLLY AI Builder — Sandbox Provider Abstraction
 *
 * Provides a clean interface so orchestration never touches raw fs/process
 * directly. Switch SANDBOX_PROVIDER=docker|local at runtime.
 *
 * Providers:
 *   LocalSandboxProvider  — /tmp/holly-builder/<id>, process registry, no
 *                           container overhead. Fallback always available.
 *   DockerSandboxProvider — docker run per session, resource limits, clean
 *                           isolation. Requires Docker daemon.
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';

const execAsync = promisify(exec);

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export interface ProcessHandle {
  id: string;
  kill: () => void;
  onLog: (cb: (line: string) => void) => void;
  onExit: (cb: (code: number | null) => void) => void;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
  size?: number;
  language?: string;
}

export interface SandboxInfo {
  sessionId: string;
  provider: 'local' | 'docker';
  workspaceDir: string;          // host-side path (always available)
  containerId?: string;          // docker container ID
  previewTarget?: string;        // host:port for preview proxy
}

// ─── Provider interface ────────────────────────────────────────────────────────

export interface SandboxProvider {
  readonly type: 'local' | 'docker';

  /** Create sandbox for session, returns SandboxInfo */
  create(sessionId: string): Promise<SandboxInfo>;

  /** Destroy sandbox — kill procs, remove container/dir */
  destroy(sessionId: string): Promise<void>;

  /** Execute a command to completion */
  exec(sessionId: string, command: string, opts?: {
    timeoutMs?: number;
    env?: Record<string, string>;
  }): Promise<CommandResult>;

  /** Start a long-running process (dev server etc.) */
  startProcess(processId: string, sessionId: string, command: string, opts?: {
    env?: Record<string, string>;
    onLog?: (line: string) => void;
    onExit?: (code: number | null) => void;
  }): ProcessHandle;

  /** Stop a running process */
  stopProcess(processId: string): void;

  /** Is a process running? */
  isRunning(processId: string): boolean;

  /** Write a file into the workspace */
  writeFile(sessionId: string, filePath: string, content: string): Promise<void>;

  /** Read a file from the workspace */
  readFile(sessionId: string, filePath: string): Promise<string>;

  /** Delete a file */
  deleteFile(sessionId: string, filePath: string): Promise<void>;

  /** List workspace file tree */
  listFiles(sessionId: string, subPath?: string): Promise<FileTreeNode[]>;

  /** Get workspace host path */
  workspaceDir(sessionId: string): string;

  /** Detect which port the preview is on (returns host port) */
  detectPort(sessionId: string, candidates: number[]): Promise<number>;

  /** Get info about current sandbox */
  info(sessionId: string): SandboxInfo | undefined;
}

// ─── Shared utilities ─────────────────────────────────────────────────────────

const SANDBOX_ROOT = path.join(os.tmpdir(), 'holly-builder');
const MAX_OUTPUT = 256 * 1024;

async function ensureRoot() {
  await fs.mkdir(SANDBOX_ROOT, { recursive: true });
}

function hostWorkspaceDir(sessionId: string): string {
  return path.join(SANDBOX_ROOT, sessionId);
}

function resolveSafe(workspaceDir: string, filePath: string): string {
  const abs = path.resolve(workspaceDir, filePath);
  if (!abs.startsWith(workspaceDir)) throw new Error('Path traversal rejected');
  return abs;
}

function detectLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescriptreact', '.js': 'javascript',
    '.jsx': 'javascriptreact', '.py': 'python', '.json': 'json',
    '.css': 'css', '.html': 'html', '.md': 'markdown', '.sh': 'bash',
    '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml', '.rs': 'rust',
    '.go': 'go', '.java': 'java', '.cpp': 'cpp', '.c': 'c',
    '.env': 'plaintext', '.gitignore': 'plaintext',
  };
  return map[ext] ?? 'plaintext';
}

async function buildFileTree(dir: string, base: string, depth = 0): Promise<FileTreeNode[]> {
  if (depth > 8) return [];
  const IGNORE = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.cache', 'coverage']);
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return []; }
  const nodes: FileTreeNode[] = [];
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const rel = path.join(base, e.name);
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      nodes.push({ name: e.name, path: rel, isDirectory: true, children: await buildFileTree(abs, rel, depth + 1) });
    } else {
      const stat = await fs.stat(abs).catch(() => null);
      nodes.push({ name: e.name, path: rel, isDirectory: false, size: stat?.size, language: detectLanguage(e.name) });
    }
  }
  return nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function isPortFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const s = net.createServer();
    s.listen(port, '127.0.0.1', () => { s.close(() => resolve(true)); });
    s.on('error', () => resolve(false));
  });
}

async function isPortListening(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const s = net.createConnection({ port, host: '127.0.0.1' });
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => resolve(false));
  });
}

// ─── Local process registry (shared across providers) ─────────────────────────

interface ActiveProc {
  proc: ChildProcess;
  logListeners: Array<(line: string) => void>;
  exitListeners: Array<(code: number | null) => void>;
}

const registry = new Map<string, ActiveProc>();

function spawnProcess(
  processId: string,
  command: string,
  cwd: string,
  env?: Record<string, string>
): ProcessHandle {
  const existing = registry.get(processId);
  if (existing) {
    try { existing.proc.kill('SIGTERM'); } catch {}
    registry.delete(processId);
  }

  const proc = spawn('sh', ['-c', command], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  const entry: ActiveProc = { proc, logListeners: [], exitListeners: [] };
  registry.set(processId, entry);

  const onData = (data: Buffer) => {
    const line = data.toString().slice(0, MAX_OUTPUT);
    entry.logListeners.forEach(fn => { try { fn(line); } catch {} });
  };
  proc.stdout?.on('data', onData);
  proc.stderr?.on('data', onData);
  proc.on('exit', (code) => {
    registry.delete(processId);
    entry.exitListeners.forEach(fn => { try { fn(code); } catch {} });
  });

  return {
    id: processId,
    kill: () => { try { proc.kill('SIGTERM'); } catch {} registry.delete(processId); },
    onLog: (cb) => { entry.logListeners.push(cb); },
    onExit: (cb) => { entry.exitListeners.push(cb); },
  };
}

function killProcess(processId: string) {
  const e = registry.get(processId);
  if (e) { try { e.proc.kill('SIGTERM'); } catch {} registry.delete(processId); }
}

function isProcRunning(processId: string): boolean {
  return registry.has(processId);
}

// ─── LocalSandboxProvider ─────────────────────────────────────────────────────

export class LocalSandboxProvider implements SandboxProvider {
  readonly type = 'local' as const;
  private sandboxes = new Map<string, SandboxInfo>();

  async create(sessionId: string): Promise<SandboxInfo> {
    await ensureRoot();
    const dir = hostWorkspaceDir(sessionId);
    await fs.mkdir(dir, { recursive: true });
    const info: SandboxInfo = { sessionId, provider: 'local', workspaceDir: dir };
    this.sandboxes.set(sessionId, info);
    return info;
  }

  async destroy(sessionId: string): Promise<void> {
    // Kill all procs for this session
    for (const [id] of registry) {
      if (id.startsWith(`${sessionId}:`)) killProcess(id);
    }
    const dir = hostWorkspaceDir(sessionId);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    this.sandboxes.delete(sessionId);
  }

  async exec(sessionId: string, command: string, opts?: { timeoutMs?: number; env?: Record<string, string> }): Promise<CommandResult> {
    const cwd = hostWorkspaceDir(sessionId);
    const timeoutMs = opts?.timeoutMs ?? 120_000;
    const start = Date.now();
    let timedOut = false;
    try {
      const { stdout, stderr } = await Promise.race([
        execAsync(command, { cwd, env: { ...process.env, ...opts?.env }, maxBuffer: MAX_OUTPUT }),
        new Promise<never>((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, timeoutMs)),
      ]);
      return { stdout: stdout.slice(0, MAX_OUTPUT), stderr: stderr.slice(0, MAX_OUTPUT), exitCode: 0, durationMs: Date.now() - start, timedOut: false };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: (e.stdout ?? '').slice(0, MAX_OUTPUT),
        stderr: (e.stderr ?? String(err)).slice(0, MAX_OUTPUT),
        exitCode: timedOut ? 124 : (e.code ?? 1),
        durationMs: Date.now() - start,
        timedOut,
      };
    }
  }

  startProcess(processId: string, sessionId: string, command: string, opts?: {
    env?: Record<string, string>;
    onLog?: (line: string) => void;
    onExit?: (code: number | null) => void;
  }): ProcessHandle {
    const cwd = hostWorkspaceDir(sessionId);
    const handle = spawnProcess(processId, command, cwd, opts?.env);
    if (opts?.onLog) handle.onLog(opts.onLog);
    if (opts?.onExit) handle.onExit(opts.onExit);
    return handle;
  }

  stopProcess(processId: string): void { killProcess(processId); }
  isRunning(processId: string): boolean { return isProcRunning(processId); }

  async writeFile(sessionId: string, filePath: string, content: string): Promise<void> {
    const dir = hostWorkspaceDir(sessionId);
    const abs = resolveSafe(dir, filePath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
  }

  async readFile(sessionId: string, filePath: string): Promise<string> {
    const dir = hostWorkspaceDir(sessionId);
    return fs.readFile(resolveSafe(dir, filePath), 'utf8');
  }

  async deleteFile(sessionId: string, filePath: string): Promise<void> {
    const dir = hostWorkspaceDir(sessionId);
    await fs.rm(resolveSafe(dir, filePath), { force: true });
  }

  async listFiles(sessionId: string, subPath = '.'): Promise<FileTreeNode[]> {
    const dir = hostWorkspaceDir(sessionId);
    return buildFileTree(path.join(dir, subPath), subPath);
  }

  workspaceDir(sessionId: string): string { return hostWorkspaceDir(sessionId); }

  async detectPort(sessionId: string, candidates: number[]): Promise<number> {
    for (const p of candidates) {
      if (await isPortFree(p)) return p;
    }
    // Random port 3100-4000
    for (let i = 0; i < 20; i++) {
      const p = 3100 + Math.floor(Math.random() * 900);
      if (await isPortFree(p)) return p;
    }
    return candidates[0];
  }

  info(sessionId: string): SandboxInfo | undefined { return this.sandboxes.get(sessionId); }
}

// ─── DockerSandboxProvider ────────────────────────────────────────────────────

const DOCKER_IMAGE = process.env.HOLLY_DOCKER_IMAGE ?? 'node:20-slim';
const DOCKER_MEM_LIMIT = process.env.HOLLY_DOCKER_MEM ?? '512m';
const DOCKER_CPU_QUOTA = process.env.HOLLY_DOCKER_CPU_QUOTA ?? '50000'; // 50% of 1 core
const DOCKER_PIDS_LIMIT = process.env.HOLLY_DOCKER_PIDS ?? '100';
const DOCKER_TIMEOUT_S = 3600; // 1 hour TTL

export class DockerSandboxProvider implements SandboxProvider {
  readonly type = 'docker' as const;
  private sandboxes = new Map<string, SandboxInfo>();
  private available: boolean | null = null;

  async isDockerAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;
    try {
      await execAsync('docker info --format "{{.ServerVersion}}"');
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  private containerName(sessionId: string) { return `holly-builder-${sessionId.slice(0, 12)}`; }

  async create(sessionId: string): Promise<SandboxInfo> {
    await ensureRoot();
    const workspaceDir = hostWorkspaceDir(sessionId);
    await fs.mkdir(workspaceDir, { recursive: true });

    const name = this.containerName(sessionId);

    // Remove any stale container
    await execAsync(`docker rm -f ${name}`).catch(() => {});

    await execAsync(
      `docker run -d --name ${name} \
        --label holly.session=${sessionId} \
        --label holly.builder=true \
        -v "${workspaceDir}:/workspace" \
        -w /workspace \
        --memory="${DOCKER_MEM_LIMIT}" \
        --cpu-quota="${DOCKER_CPU_QUOTA}" \
        --pids-limit="${DOCKER_PIDS_LIMIT}" \
        --network=bridge \
        --read-only=false \
        --stop-timeout=10 \
        ${DOCKER_IMAGE} sleep ${DOCKER_TIMEOUT_S}`
    );

    // Install basic tools in container
    await execAsync(`docker exec ${name} sh -c "npm config set fund false --quiet 2>/dev/null; true"`).catch(() => {});

    const info: SandboxInfo = { sessionId, provider: 'docker', workspaceDir, containerId: name };
    this.sandboxes.set(sessionId, info);
    return info;
  }

  async destroy(sessionId: string): Promise<void> {
    const name = this.containerName(sessionId);
    // Kill local process handles
    for (const [id] of registry) {
      if (id.startsWith(`${sessionId}:`)) killProcess(id);
    }
    await execAsync(`docker rm -f ${name}`).catch(() => {});
    const workspaceDir = hostWorkspaceDir(sessionId);
    await fs.rm(workspaceDir, { recursive: true, force: true }).catch(() => {});
    this.sandboxes.delete(sessionId);
  }

  async exec(sessionId: string, command: string, opts?: { timeoutMs?: number; env?: Record<string, string> }): Promise<CommandResult> {
    const name = this.containerName(sessionId);
    const timeoutMs = opts?.timeoutMs ?? 120_000;
    const start = Date.now();

    const envFlags = Object.entries(opts?.env ?? {}).map(([k, v]) => `-e ${k}="${v}"`).join(' ');
    const dockerCmd = `docker exec ${envFlags} ${name} sh -c ${JSON.stringify(command)}`;

    let timedOut = false;
    try {
      const { stdout, stderr } = await Promise.race([
        execAsync(dockerCmd, { maxBuffer: MAX_OUTPUT }),
        new Promise<never>((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, timeoutMs)),
      ]);
      return { stdout: stdout.slice(0, MAX_OUTPUT), stderr: stderr.slice(0, MAX_OUTPUT), exitCode: 0, durationMs: Date.now() - start, timedOut: false };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return {
        stdout: (e.stdout ?? '').slice(0, MAX_OUTPUT),
        stderr: (e.stderr ?? String(err)).slice(0, MAX_OUTPUT),
        exitCode: timedOut ? 124 : (e.code ?? 1),
        durationMs: Date.now() - start,
        timedOut,
      };
    }
  }

  startProcess(processId: string, sessionId: string, command: string, opts?: {
    env?: Record<string, string>;
    onLog?: (line: string) => void;
    onExit?: (code: number | null) => void;
  }): ProcessHandle {
    const name = this.containerName(sessionId);
    const envFlags = Object.entries(opts?.env ?? {}).map(([k, v]) => `-e ${k}="${v}"`).join(' ');
    const dockerCmd = `docker exec ${envFlags} -i ${name} sh -c ${JSON.stringify(command)}`;
    const handle = spawnProcess(processId, dockerCmd, os.tmpdir(), opts?.env);
    if (opts?.onLog) handle.onLog(opts.onLog);
    if (opts?.onExit) handle.onExit(opts.onExit);
    return handle;
  }

  stopProcess(processId: string): void { killProcess(processId); }
  isRunning(processId: string): boolean { return isProcRunning(processId); }

  // File ops go through host-mounted volume
  async writeFile(sessionId: string, filePath: string, content: string): Promise<void> {
    const dir = hostWorkspaceDir(sessionId);
    const abs = resolveSafe(dir, filePath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
  }

  async readFile(sessionId: string, filePath: string): Promise<string> {
    return fs.readFile(resolveSafe(hostWorkspaceDir(sessionId), filePath), 'utf8');
  }

  async deleteFile(sessionId: string, filePath: string): Promise<void> {
    await fs.rm(resolveSafe(hostWorkspaceDir(sessionId), filePath), { force: true });
  }

  async listFiles(sessionId: string, subPath = '.'): Promise<FileTreeNode[]> {
    const dir = hostWorkspaceDir(sessionId);
    return buildFileTree(path.join(dir, subPath), subPath);
  }

  workspaceDir(sessionId: string): string { return hostWorkspaceDir(sessionId); }

  async detectPort(_sessionId: string, candidates: number[]): Promise<number> {
    for (const p of candidates) {
      if (await isPortFree(p)) return p;
    }
    for (let i = 0; i < 20; i++) {
      const p = 3100 + Math.floor(Math.random() * 900);
      if (await isPortFree(p)) return p;
    }
    return candidates[0];
  }

  info(sessionId: string): SandboxInfo | undefined { return this.sandboxes.get(sessionId); }
}

// ─── Singleton factory ─────────────────────────────────────────────────────────

const SANDBOX_PROVIDER_ENV = (process.env.SANDBOX_PROVIDER ?? 'local').toLowerCase();
const key = '__holly_sandbox_provider__';

async function buildProvider(): Promise<SandboxProvider> {
  if (SANDBOX_PROVIDER_ENV === 'docker') {
    const docker = new DockerSandboxProvider();
    if (await docker.isDockerAvailable()) {
      console.log('[Sandbox] Using DockerSandboxProvider');
      return docker;
    }
    console.warn('[Sandbox] Docker unavailable — falling back to LocalSandboxProvider');
  }
  console.log('[Sandbox] Using LocalSandboxProvider');
  return new LocalSandboxProvider();
}

// Lazy singleton
let _providerPromise: Promise<SandboxProvider> | null = null;

export function getSandboxProvider(): Promise<SandboxProvider> {
  const g = globalThis as Record<string, unknown>;
  if (!g[key]) {
    _providerPromise = buildProvider();
    g[key] = _providerPromise;
  }
  return g[key] as Promise<SandboxProvider>;
}

// Re-export helpers used by old sandbox.ts callers so we don't break imports
export async function waitForPort(port: number, timeoutMs = 30_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortListening(port)) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

export { hostWorkspaceDir as getWorkspaceDir, buildFileTree, detectLanguage };
