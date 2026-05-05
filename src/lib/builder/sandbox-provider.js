"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerSandboxProvider = exports.LocalSandboxProvider = void 0;
exports.getSandboxProvider = getSandboxProvider;
exports.waitForPort = waitForPort;
exports.getWorkspaceDir = hostWorkspaceDir;
exports.buildFileTree = buildFileTree;
exports.detectLanguage = detectLanguage;
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const net_1 = __importDefault(require("net"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// ─── Shared utilities ─────────────────────────────────────────────────────────
const SANDBOX_ROOT = path_1.default.join(os_1.default.tmpdir(), 'holly-builder');
const MAX_OUTPUT = 256 * 1024;
async function ensureRoot() {
    await promises_1.default.mkdir(SANDBOX_ROOT, { recursive: true });
}
function hostWorkspaceDir(sessionId) {
    return path_1.default.join(SANDBOX_ROOT, sessionId);
}
function resolveSafe(workspaceDir, filePath) {
    const abs = path_1.default.resolve(workspaceDir, filePath);
    if (!abs.startsWith(workspaceDir))
        throw new Error('Path traversal rejected');
    return abs;
}
function detectLanguage(filename) {
    const ext = path_1.default.extname(filename).toLowerCase();
    const map = {
        '.ts': 'typescript', '.tsx': 'typescriptreact', '.js': 'javascript',
        '.jsx': 'javascriptreact', '.py': 'python', '.json': 'json',
        '.css': 'css', '.html': 'html', '.md': 'markdown', '.sh': 'bash',
        '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml', '.rs': 'rust',
        '.go': 'go', '.java': 'java', '.cpp': 'cpp', '.c': 'c',
        '.env': 'plaintext', '.gitignore': 'plaintext',
    };
    return map[ext] ?? 'plaintext';
}
async function buildFileTree(dir, base, depth = 0) {
    if (depth > 8)
        return [];
    const IGNORE = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.cache', 'coverage']);
    let entries;
    try {
        entries = await promises_1.default.readdir(dir, { withFileTypes: true });
    }
    catch {
        return [];
    }
    const nodes = [];
    for (const e of entries) {
        if (IGNORE.has(e.name))
            continue;
        const rel = path_1.default.join(base, e.name);
        const abs = path_1.default.join(dir, e.name);
        if (e.isDirectory()) {
            nodes.push({ name: e.name, path: rel, isDirectory: true, children: await buildFileTree(abs, rel, depth + 1) });
        }
        else {
            const stat = await promises_1.default.stat(abs).catch(() => null);
            nodes.push({ name: e.name, path: rel, isDirectory: false, size: stat?.size, language: detectLanguage(e.name) });
        }
    }
    return nodes.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory)
            return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}
async function isPortFree(port) {
    return new Promise(resolve => {
        const s = net_1.default.createServer();
        s.listen(port, '127.0.0.1', () => { s.close(() => resolve(true)); });
        s.on('error', () => resolve(false));
    });
}
async function isPortListening(port) {
    return new Promise(resolve => {
        const s = net_1.default.createConnection({ port, host: '127.0.0.1' });
        s.on('connect', () => { s.destroy(); resolve(true); });
        s.on('error', () => resolve(false));
    });
}
const registry = new Map();
function spawnProcess(processId, command, cwd, env) {
    const existing = registry.get(processId);
    if (existing) {
        try {
            existing.proc.kill('SIGTERM');
        }
        catch { }
        registry.delete(processId);
    }
    const proc = (0, child_process_1.spawn)('sh', ['-c', command], {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
    });
    const entry = { proc, logListeners: [], exitListeners: [] };
    registry.set(processId, entry);
    const onData = (data) => {
        const line = data.toString().slice(0, MAX_OUTPUT);
        entry.logListeners.forEach(fn => { try {
            fn(line);
        }
        catch { } });
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.on('exit', (code) => {
        registry.delete(processId);
        entry.exitListeners.forEach(fn => { try {
            fn(code);
        }
        catch { } });
    });
    return {
        id: processId,
        kill: () => { try {
            proc.kill('SIGTERM');
        }
        catch { } registry.delete(processId); },
        onLog: (cb) => { entry.logListeners.push(cb); },
        onExit: (cb) => { entry.exitListeners.push(cb); },
    };
}
function killProcess(processId) {
    const e = registry.get(processId);
    if (e) {
        try {
            e.proc.kill('SIGTERM');
        }
        catch { }
        registry.delete(processId);
    }
}
function isProcRunning(processId) {
    return registry.has(processId);
}
// ─── LocalSandboxProvider ─────────────────────────────────────────────────────
class LocalSandboxProvider {
    constructor() {
        this.type = 'local';
        this.sandboxes = new Map();
    }
    async create(sessionId) {
        await ensureRoot();
        const dir = hostWorkspaceDir(sessionId);
        await promises_1.default.mkdir(dir, { recursive: true });
        const info = { sessionId, provider: 'local', workspaceDir: dir };
        this.sandboxes.set(sessionId, info);
        return info;
    }
    async destroy(sessionId) {
        // Kill all procs for this session
        for (const [id] of registry) {
            if (id.startsWith(`${sessionId}:`))
                killProcess(id);
        }
        const dir = hostWorkspaceDir(sessionId);
        await promises_1.default.rm(dir, { recursive: true, force: true }).catch(() => { });
        this.sandboxes.delete(sessionId);
    }
    async exec(sessionId, command, opts) {
        const cwd = hostWorkspaceDir(sessionId);
        const timeoutMs = opts?.timeoutMs ?? 120000;
        const start = Date.now();
        let timedOut = false;
        try {
            const { stdout, stderr } = await Promise.race([
                execAsync(command, { cwd, env: { ...process.env, ...opts?.env }, maxBuffer: MAX_OUTPUT }),
                new Promise((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, timeoutMs)),
            ]);
            return { stdout: stdout.slice(0, MAX_OUTPUT), stderr: stderr.slice(0, MAX_OUTPUT), exitCode: 0, durationMs: Date.now() - start, timedOut: false };
        }
        catch (err) {
            const e = err;
            return {
                stdout: (e.stdout ?? '').slice(0, MAX_OUTPUT),
                stderr: (e.stderr ?? String(err)).slice(0, MAX_OUTPUT),
                exitCode: timedOut ? 124 : (e.code ?? 1),
                durationMs: Date.now() - start,
                timedOut,
            };
        }
    }
    startProcess(processId, sessionId, command, opts) {
        const cwd = hostWorkspaceDir(sessionId);
        const handle = spawnProcess(processId, command, cwd, opts?.env);
        if (opts?.onLog)
            handle.onLog(opts.onLog);
        if (opts?.onExit)
            handle.onExit(opts.onExit);
        return handle;
    }
    stopProcess(processId) { killProcess(processId); }
    isRunning(processId) { return isProcRunning(processId); }
    async writeFile(sessionId, filePath, content) {
        const dir = hostWorkspaceDir(sessionId);
        const abs = resolveSafe(dir, filePath);
        await promises_1.default.mkdir(path_1.default.dirname(abs), { recursive: true });
        await promises_1.default.writeFile(abs, content, 'utf8');
    }
    async readFile(sessionId, filePath) {
        const dir = hostWorkspaceDir(sessionId);
        return promises_1.default.readFile(resolveSafe(dir, filePath), 'utf8');
    }
    async deleteFile(sessionId, filePath) {
        const dir = hostWorkspaceDir(sessionId);
        await promises_1.default.rm(resolveSafe(dir, filePath), { force: true });
    }
    async listFiles(sessionId, subPath = '.') {
        const dir = hostWorkspaceDir(sessionId);
        return buildFileTree(path_1.default.join(dir, subPath), subPath);
    }
    workspaceDir(sessionId) { return hostWorkspaceDir(sessionId); }
    async detectPort(sessionId, candidates) {
        for (const p of candidates) {
            if (await isPortFree(p))
                return p;
        }
        // Random port 3100-4000
        for (let i = 0; i < 20; i++) {
            const p = 3100 + Math.floor(Math.random() * 900);
            if (await isPortFree(p))
                return p;
        }
        return candidates[0];
    }
    info(sessionId) { return this.sandboxes.get(sessionId); }
}
exports.LocalSandboxProvider = LocalSandboxProvider;
// ─── DockerSandboxProvider ────────────────────────────────────────────────────
const DOCKER_IMAGE = process.env.HOLLY_DOCKER_IMAGE ?? 'node:20-slim';
const DOCKER_MEM_LIMIT = process.env.HOLLY_DOCKER_MEM ?? '512m';
const DOCKER_CPU_QUOTA = process.env.HOLLY_DOCKER_CPU_QUOTA ?? '50000'; // 50% of 1 core
const DOCKER_PIDS_LIMIT = process.env.HOLLY_DOCKER_PIDS ?? '100';
const DOCKER_TIMEOUT_S = 3600; // 1 hour TTL
class DockerSandboxProvider {
    constructor() {
        this.type = 'docker';
        this.sandboxes = new Map();
        this.available = null;
    }
    async isDockerAvailable() {
        if (this.available !== null)
            return this.available;
        try {
            await execAsync('docker info --format "{{.ServerVersion}}"');
            this.available = true;
        }
        catch {
            this.available = false;
        }
        return this.available;
    }
    containerName(sessionId) { return `holly-builder-${sessionId.slice(0, 12)}`; }
    async create(sessionId) {
        await ensureRoot();
        const workspaceDir = hostWorkspaceDir(sessionId);
        await promises_1.default.mkdir(workspaceDir, { recursive: true });
        const name = this.containerName(sessionId);
        // Remove any stale container
        await execAsync(`docker rm -f ${name}`).catch(() => { });
        await execAsync(`docker run -d --name ${name} \
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
        ${DOCKER_IMAGE} sleep ${DOCKER_TIMEOUT_S}`);
        // Install basic tools in container
        await execAsync(`docker exec ${name} sh -c "npm config set fund false --quiet 2>/dev/null; true"`).catch(() => { });
        const info = { sessionId, provider: 'docker', workspaceDir, containerId: name };
        this.sandboxes.set(sessionId, info);
        return info;
    }
    async destroy(sessionId) {
        const name = this.containerName(sessionId);
        // Kill local process handles
        for (const [id] of registry) {
            if (id.startsWith(`${sessionId}:`))
                killProcess(id);
        }
        await execAsync(`docker rm -f ${name}`).catch(() => { });
        const workspaceDir = hostWorkspaceDir(sessionId);
        await promises_1.default.rm(workspaceDir, { recursive: true, force: true }).catch(() => { });
        this.sandboxes.delete(sessionId);
    }
    async exec(sessionId, command, opts) {
        const name = this.containerName(sessionId);
        const timeoutMs = opts?.timeoutMs ?? 120000;
        const start = Date.now();
        const envFlags = Object.entries(opts?.env ?? {}).map(([k, v]) => `-e ${k}="${v}"`).join(' ');
        const dockerCmd = `docker exec ${envFlags} ${name} sh -c ${JSON.stringify(command)}`;
        let timedOut = false;
        try {
            const { stdout, stderr } = await Promise.race([
                execAsync(dockerCmd, { maxBuffer: MAX_OUTPUT }),
                new Promise((_, reject) => setTimeout(() => { timedOut = true; reject(new Error('timeout')); }, timeoutMs)),
            ]);
            return { stdout: stdout.slice(0, MAX_OUTPUT), stderr: stderr.slice(0, MAX_OUTPUT), exitCode: 0, durationMs: Date.now() - start, timedOut: false };
        }
        catch (err) {
            const e = err;
            return {
                stdout: (e.stdout ?? '').slice(0, MAX_OUTPUT),
                stderr: (e.stderr ?? String(err)).slice(0, MAX_OUTPUT),
                exitCode: timedOut ? 124 : (e.code ?? 1),
                durationMs: Date.now() - start,
                timedOut,
            };
        }
    }
    startProcess(processId, sessionId, command, opts) {
        const name = this.containerName(sessionId);
        const envFlags = Object.entries(opts?.env ?? {}).map(([k, v]) => `-e ${k}="${v}"`).join(' ');
        const dockerCmd = `docker exec ${envFlags} -i ${name} sh -c ${JSON.stringify(command)}`;
        const handle = spawnProcess(processId, dockerCmd, os_1.default.tmpdir(), opts?.env);
        if (opts?.onLog)
            handle.onLog(opts.onLog);
        if (opts?.onExit)
            handle.onExit(opts.onExit);
        return handle;
    }
    stopProcess(processId) { killProcess(processId); }
    isRunning(processId) { return isProcRunning(processId); }
    // File ops go through host-mounted volume
    async writeFile(sessionId, filePath, content) {
        const dir = hostWorkspaceDir(sessionId);
        const abs = resolveSafe(dir, filePath);
        await promises_1.default.mkdir(path_1.default.dirname(abs), { recursive: true });
        await promises_1.default.writeFile(abs, content, 'utf8');
    }
    async readFile(sessionId, filePath) {
        return promises_1.default.readFile(resolveSafe(hostWorkspaceDir(sessionId), filePath), 'utf8');
    }
    async deleteFile(sessionId, filePath) {
        await promises_1.default.rm(resolveSafe(hostWorkspaceDir(sessionId), filePath), { force: true });
    }
    async listFiles(sessionId, subPath = '.') {
        const dir = hostWorkspaceDir(sessionId);
        return buildFileTree(path_1.default.join(dir, subPath), subPath);
    }
    workspaceDir(sessionId) { return hostWorkspaceDir(sessionId); }
    async detectPort(_sessionId, candidates) {
        for (const p of candidates) {
            if (await isPortFree(p))
                return p;
        }
        for (let i = 0; i < 20; i++) {
            const p = 3100 + Math.floor(Math.random() * 900);
            if (await isPortFree(p))
                return p;
        }
        return candidates[0];
    }
    info(sessionId) { return this.sandboxes.get(sessionId); }
}
exports.DockerSandboxProvider = DockerSandboxProvider;
// ─── Singleton factory ─────────────────────────────────────────────────────────
const SANDBOX_PROVIDER_ENV = (process.env.SANDBOX_PROVIDER ?? 'local').toLowerCase();
const key = '__holly_sandbox_provider__';
async function buildProvider() {
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
let _providerPromise = null;
function getSandboxProvider() {
    const g = globalThis;
    if (!g[key]) {
        _providerPromise = buildProvider();
        g[key] = _providerPromise;
    }
    return g[key];
}
// Re-export helpers used by old sandbox.ts callers so we don't break imports
async function waitForPort(port, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await isPortListening(port))
            return true;
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}
