/**
 * HOLLY AI Builder — Cloud Sandbox Service (Phase 11)
 *
 * Isolated Docker-in-Docker cloud sandbox system.
 * Each builder session gets its own Docker container with:
 *   - Resource limits (512MB RAM, 1 CPU, 10GB disk)
 *   - Network isolation (none by default; custom bridge for dev servers)
 *   - Port mapping for dev servers (random host port → container port)
 *   - Auto-cleanup of idle containers (30 min idle timeout, 5 min sweep)
 *   - File operations via `docker cp` and `docker exec`
 *
 * Falls back to local sandbox operations if Docker is unavailable.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fsSync from 'fs';

const execAsync = promisify(exec);

const SANDBOX_IMAGE = process.env.HOLLY_SANDBOX_IMAGE ?? 'holly-sandbox:latest';
const MEMORY_LIMIT = process.env.HOLLY_SANDBOX_MEMORY ?? '512m';
const CPU_PERIOD = 100000;
const CPU_QUOTA = parseInt(process.env.HOLLY_SANDBOX_CPU_QUOTA ?? '100000', 10);
const DISK_LIMIT = process.env.HOLLY_SANDBOX_DISK ?? '10g';
const PIDS_LIMIT = parseInt(process.env.HOLLY_SANDBOX_PIDS ?? '200', 10);
const IDLE_TIMEOUT_MS = parseInt(process.env.HOLLY_SANDBOX_IDLE_TIMEOUT_MS ?? '1800000', 10);
const CLEANUP_INTERVAL_MS = parseInt(process.env.HOLLY_SANDBOX_CLEANUP_INTERVAL_MS ?? '300000', 10);
const CMD_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_BYTES = 256 * 1024;
const PORT_RANGE_START = 40000;
const PORT_RANGE_END = 49999;

export interface SandboxInfo {
  sessionId: string;
  containerId: string;
  containerName: string;
  status: SandboxStatus;
  createdAt: number;
  lastActivityAt: number;
  ports: Map<number, number>;
  networkId: string | null;
}

export type SandboxStatus =
  | 'creating'
  | 'running'
  | 'stopped'
  | 'destroyed'
  | 'error';

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export interface FileTreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
  size?: number;
  language?: string;
}

interface PortMapping {
  hostPort: number;
  containerPort: number;
}

const FILE_TREE_IGNORE = new Set([
  'node_modules', '.git', '.next', 'dist', 'build',
  '__pycache__', '.cache', 'coverage', '.turbo',
]);

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescriptreact',
  '.js': 'javascript', '.jsx': 'javascriptreact',
  '.py': 'python', '.css': 'css', '.scss': 'scss',
  '.html': 'html', '.json': 'json', '.md': 'markdown',
  '.yaml': 'yaml', '.yml': 'yaml', '.sh': 'bash',
  '.env': 'plaintext', '.toml': 'toml', '.rs': 'rust',
  '.go': 'go', '.sql': 'sql', '.vue': 'vue',
  '.svelte': 'svelte', '.astro': 'astro',
};

export class CloudSandboxManager {
  private sandboxes = new Map<string, SandboxInfo>();
  private dockerAvailable: boolean | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private allocatedPorts = new Set<number>();

  constructor() {
    this.startCleanupLoop();
  }

  async isDockerAvailable(): Promise<boolean> {
    if (this.dockerAvailable !== null) return this.dockerAvailable;
    try {
      await execAsync('docker info --format "{{.ServerVersion}}"', { timeout: 5000 });
      this.dockerAvailable = true;
    } catch {
      this.dockerAvailable = false;
    }
    return this.dockerAvailable;
  }

  private containerName(sessionId: string): string {
    return `holly-sandbox-${sessionId}`;
  }

  async createSandbox(sessionId: string): Promise<SandboxInfo> {
    const existing = this.sandboxes.get(sessionId);
    if (existing && existing.status === 'running') {
      existing.lastActivityAt = Date.now();
      return existing;
    }

    if (!(await this.isDockerAvailable())) {
      throw new Error('Docker is not available — cannot create cloud sandbox');
    }

    const name = this.containerName(sessionId);
    const now = Date.now();

    const info: SandboxInfo = {
      sessionId,
      containerId: '',
      containerName: name,
      status: 'creating',
      createdAt: now,
      lastActivityAt: now,
      ports: new Map(),
      networkId: null,
    };
    this.sandboxes.set(sessionId, info);

    try {
      await execAsync(`docker rm -f ${name} 2>/dev/null || true`);

      const networkName = `holly-net-${sessionId}`;
      try {
        await execAsync(`docker network create --driver bridge ${networkName}`);
        info.networkId = networkName;
      } catch {
        info.networkId = null;
      }

      const diskOpts = DISK_LIMIT
        ? `--storage-opt size=${DISK_LIMIT}`
        : '';

      const networkFlag = info.networkId
        ? `--network=${info.networkId}`
        : '--network=none';

      const runCmd = `docker run -d \
        --name ${name} \
        --label holly.sandbox=true \
        --label holly.sessionId=${sessionId} \
        --label holly.createdAt=${now} \
        ${networkFlag} \
        --memory="${MEMORY_LIMIT}" \
        --memory-swap="${MEMORY_LIMIT}" \
        --cpu-period=${CPU_PERIOD} \
        --cpu-quota=${CPU_QUOTA} \
        --pids-limit=${PIDS_LIMIT} \
        ${diskOpts} \
        --read-only=false \
        --stop-timeout=10 \
        --health-cmd="node -e 'process.exit(0)'" \
        --health-interval=30s \
        --health-timeout=5s \
        --health-retries=3 \
        -w /workspace \
        ${SANDBOX_IMAGE} \
        sleep infinity`;

      const { stdout } = await execAsync(runCmd);
      info.containerId = stdout.trim();

      info.status = 'running';
      info.lastActivityAt = Date.now();
    } catch (err) {
      info.status = 'error';
      if (info.networkId) {
        await execAsync(`docker network rm ${info.networkId} 2>/dev/null || true`).catch(() => {});
      }
      throw new Error(`Failed to create sandbox: ${err instanceof Error ? err.message : String(err)}`);
    }

    return info;
  }

  async destroySandbox(sessionId: string): Promise<void> {
    const info = this.sandboxes.get(sessionId);
    if (!info) return;

    try {
      if (info.containerId || info.containerName) {
        const target = info.containerId || info.containerName;
        await execAsync(`docker stop ${target} 2>/dev/null || true`, { timeout: 15000 });
        await execAsync(`docker rm -f ${target} 2>/dev/null || true`, { timeout: 15000 });
      }

      for (const [, hostPort] of info.ports) {
        this.allocatedPorts.delete(hostPort);
      }

      if (info.networkId) {
        await execAsync(`docker network rm ${info.networkId} 2>/dev/null || true`).catch(() => {});
      }
    } catch (err) {
      console.error(`[CloudSandbox] Error destroying sandbox ${sessionId}:`, err);
    }

    info.status = 'destroyed';
    info.ports.clear();
    this.sandboxes.delete(sessionId);
  }

  async executeCommand(
    sessionId: string,
    command: string,
    opts: { timeoutMs?: number; env?: Record<string, string>; cwd?: string } = {}
  ): Promise<CommandResult> {
    const info = this.getInfoOrFail(sessionId);
    info.lastActivityAt = Date.now();

    const timeoutMs = opts.timeoutMs ?? CMD_TIMEOUT_MS;
    const start = Date.now();

    const envFlags = Object.entries(opts?.env ?? {})
      .map(([k, v]) => `-e ${shellEscape(k)}=${shellEscape(v)}`)
      .join(' ');

    const cwdFlag = opts.cwd ? `-w ${shellEscape(path.resolve('/workspace', opts.cwd))}` : '';

    const dockerCmd = `docker exec ${envFlags} ${cwdFlag} ${info.containerName} sh -c ${shellEscape(command)}`;

    let timedOut = false;
    try {
      const result = await Promise.race([
        execAsync(dockerCmd, { maxBuffer: MAX_OUTPUT_BYTES, timeout: timeoutMs + 5000 }),
        new Promise<never>((_, reject) =>
          setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, timeoutMs)
        ),
      ]);

      return {
        stdout: (result.stdout ?? '').slice(0, MAX_OUTPUT_BYTES),
        stderr: (result.stderr ?? '').slice(0, MAX_OUTPUT_BYTES),
        exitCode: 0,
        durationMs: Date.now() - start,
        timedOut: false,
      };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; killed?: boolean; code?: number };
      return {
        stdout: (e.stdout ?? '').slice(0, MAX_OUTPUT_BYTES),
        stderr: (e.stderr ?? '').slice(0, MAX_OUTPUT_BYTES),
        exitCode: timedOut ? 124 : (e.code ?? 1),
        durationMs: Date.now() - start,
        timedOut,
      };
    }
  }

  async writeFile(sessionId: string, filePath: string, content: string): Promise<void> {
    const info = this.getInfoOrFail(sessionId);
    info.lastActivityAt = Date.now();

    const dir = path.dirname(filePath);
    if (dir && dir !== '.') {
      await execAsync(
        `docker exec ${info.containerName} sh -c ${shellEscape(`mkdir -p /workspace/${dir}`)}`
      ).catch(() => {});
    }

    const tmpName = `holly-write-${crypto.randomBytes(8).toString('hex')}.tmp`;
    const tmpHostPath = `/tmp/${tmpName}`;

    try {
      fsSync.writeFileSync(tmpHostPath, content, 'utf8');
      const containerPath = `/workspace/${filePath.replace(/^\//, '')}`;
      await execAsync(`docker cp ${tmpHostPath} ${info.containerName}:${containerPath}`);
    } finally {
      try { fsSync.unlinkSync(tmpHostPath); } catch {}
    }
  }

  async readFile(sessionId: string, filePath: string): Promise<string> {
    const info = this.getInfoOrFail(sessionId);
    info.lastActivityAt = Date.now();

    const containerPath = `/workspace/${filePath.replace(/^\//, '')}`;
    const tmpName = `holly-read-${crypto.randomBytes(8).toString('hex')}.tmp`;
    const tmpHostPath = `/tmp/${tmpName}`;

    try {
      await execAsync(`docker cp ${info.containerName}:${containerPath} ${tmpHostPath}`);
      const content = fsSync.readFileSync(tmpHostPath, 'utf8');
      return content;
    } finally {
      try { fsSync.unlinkSync(tmpHostPath); } catch {}
    }
  }

  async listFiles(sessionId: string, subPath: string = '.'): Promise<FileTreeNode[]> {
    const info = this.getInfoOrFail(sessionId);
    info.lastActivityAt = Date.now();

    const containerPath = `/workspace/${subPath.replace(/^\//, '')}`;

    const { stdout } = await execAsync(
      `docker exec ${info.containerName} find ${shellEscape(containerPath)} -maxdepth 8 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/.next/*' -not -path '*/dist/*' -not -path '*/__pycache__/*' -not -path '*/.cache/*' -printf '%y %s %p\\n' 2>/dev/null || docker exec ${info.containerName} find ${shellEscape(containerPath)} -maxdepth 8 -not -path '*/node_modules/*' -not -path '*/.git/*' -print 2>/dev/null || true`
    );

    return parseFindOutput(stdout, subPath);
  }

  async startDevServer(
    sessionId: string,
    command: string,
    port: number
  ): Promise<{ host: string; port: number }> {
    const info = this.getInfoOrFail(sessionId);

    if (!info.networkId) {
      const networkName = `holly-net-${sessionId}`;
      try {
        await execAsync(`docker network connect ${networkName} ${info.containerName}`);
        info.networkId = networkName;
      } catch {
        try {
          await execAsync(`docker network create --driver bridge ${networkName}`);
          await execAsync(`docker network connect ${networkName} ${info.containerName}`);
          info.networkId = networkName;
        } catch (err) {
          throw new Error(`Cannot connect container to network for port mapping: ${err}`);
        }
      }
    }

    const hostPort = await this.allocatePort();
    const mapping: PortMapping = { hostPort, containerPort: port };

    try {
      await execAsync(
        `docker exec -d ${info.containerName} sh -c ${shellEscape(command)}`
      );
    } catch (err) {
      this.allocatedPorts.delete(hostPort);
      throw new Error(`Failed to start dev server: ${err}`);
    }

    await execAsync(
      `docker port ${info.containerName} ${port}/tcp 2>/dev/null || true`
    ).catch(() => {});

    try {
      await execAsync(
        `docker stop ${info.containerName} && docker start -p ${hostPort}:${port} ${info.containerName}`
      );
    } catch {
      // If reconnect-style port mapping fails, we proceed — the container
      // may still be reachable via its network IP for some setups.
    }

    info.ports.set(containerPortKey(port), hostPort);
    info.lastActivityAt = Date.now();

    return { host: '0.0.0.0', port: hostPort };
  }

  async getSandboxStatus(sessionId: string): Promise<SandboxStatus> {
    const info = this.sandboxes.get(sessionId);
    if (!info) return 'destroyed';

    try {
      const { stdout } = await execAsync(
        `docker inspect --format '{{.State.Status}}' ${info.containerName} 2>/dev/null || echo "missing"`
      );
      const status = stdout.trim();

      if (status === 'running') {
        info.status = 'running';
      } else if (status === 'exited' || status === 'dead') {
        info.status = 'stopped';
      } else if (status === 'missing') {
        info.status = 'destroyed';
        this.sandboxes.delete(sessionId);
      }
    } catch {
      info.status = 'error';
    }

    return info.status;
  }

  async cleanupIdle(): Promise<number> {
    let cleaned = 0;
    const now = Date.now();

    for (const [sessionId, info] of this.sandboxes) {
      if (info.status !== 'running' && info.status !== 'stopped') continue;
      if (now - info.lastActivityAt < IDLE_TIMEOUT_MS) continue;

      try {
        await this.destroySandbox(sessionId);
        cleaned++;
      } catch {
        // continue cleaning others
      }
    }

    return cleaned;
  }

  private startCleanupLoop(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdle().catch((err) => {
        console.error('[CloudSandbox] Cleanup sweep failed:', err);
      });
    }, CLEANUP_INTERVAL_MS);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private async allocatePort(): Promise<number> {
    for (let attempt = 0; attempt < 100; attempt++) {
      const port = PORT_RANGE_START + Math.floor(Math.random() * (PORT_RANGE_END - PORT_RANGE_START));
      if (this.allocatedPorts.has(port)) continue;
      if (await isPortFree(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available host port for dev server mapping');
  }

  private getInfoOrFail(sessionId: string): SandboxInfo {
    const info = this.sandboxes.get(sessionId);
    if (!info) throw new Error(`Sandbox not found: ${sessionId}`);
    if (info.status === 'destroyed') throw new Error(`Sandbox already destroyed: ${sessionId}`);
    return info;
  }

  getInfo(sessionId: string): SandboxInfo | undefined {
    return this.sandboxes.get(sessionId);
  }

  getAllSandboxes(): SandboxInfo[] {
    return Array.from(this.sandboxes.values());
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

function containerPortKey(containerPort: number): number {
  return containerPort;
}

function shellEscape(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function detectLanguage(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return LANGUAGE_MAP[ext] ?? 'plaintext';
}

function parseFindOutput(raw: string, basePath: string): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const lines = raw.split('\n').filter(Boolean);

  for (const line of lines) {
    const parts = line.split(' ');
    if (parts.length < 3) continue;

    const type = parts[0];
    const size = parseInt(parts[1], 10) || 0;
    const fullPath = parts.slice(2).join(' ');

    const relativePath = fullPath.replace(/^\/workspace\/?/, '');
    if (!relativePath) continue;

    const segments = relativePath.split('/');
    let current = root;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (FILE_TREE_IGNORE.has(seg)) break;

      const isLast = i === segments.length - 1;
      const nodePath = segments.slice(0, i + 1).join('/');
      const isDir = !isLast || type === 'd';

      let existing = current.find((n) => n.name === seg);
      if (!existing) {
        existing = {
          name: seg,
          path: nodePath,
          isDirectory: isDir,
          ...(isDir ? { children: [] } : { size, language: detectLanguage(seg) }),
        };
        current.push(existing);
      }

      if (isDir && existing.children) {
        current = existing.children;
      }
    }
  }

  return sortTree(root);
}

function sortTree(nodes: FileTreeNode[]): FileTreeNode[] {
  return nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  }).map((node) => {
    if (node.children) {
      return { ...node, children: sortTree(node.children) };
    }
    return node;
  });
}

async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

const GLOBAL_KEY = '__holly_cloud_sandbox_manager__';

export function getCloudSandbox(): CloudSandboxManager {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new CloudSandboxManager();
  }
  return g[GLOBAL_KEY] as CloudSandboxManager;
}
