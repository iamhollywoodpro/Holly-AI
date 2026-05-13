/**
 * HOLLY MCP Client Manager
 *
 * Manages Model Context Protocol connections to tool servers.
 * The singleton mcpManager is initialised once at module load (not per request)
 * so we never leak stdio processes.
 *
 * Connected servers:
 *   holly-tools   — stdio  — scripts/holly-mcp-server.js (25 tools)
 *   aura-hub      — HTTP   — /api/hub/aura (A&R engine)
 *   sentinel-hub  — HTTP   — /api/hub/sentinel (code intelligence)
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { ToolHealthMonitor, DEFAULT_HEALTH_CONFIG } from '@/lib/mcp/tool-health-monitor';

export interface MCPTool {
  serverId: string;
  name: string;
  description: string;
  inputSchema: any;
}

interface HttpServer {
  tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>;
  callHandler: (toolName: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private connecting: Map<string, Promise<void>> = new Map();
  private httpServers: Map<string, HttpServer> = new Map();
  private initialized = false;

  /**
   * Connect to an MCP server via stdio transport.
   * Safe to call multiple times — skips if already connected.
   */
  async connectStdio(
    serverId: string,
    command: string,
    args: string[],
    env?: Record<string, string>
  ): Promise<void> {
    // ── Build Guard ──────────────────────────────────────────────────────────
    // Do NOT spawn tool server subprocesses during the Next.js build phase.
    // This consumes excessive memory and causes OOM crashes (exit code 255).
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.DOCKER_BUILD === 'true') {
      console.log(`[MCP] Skipping stdio connection to ${serverId} during build phase.`);
      return;
    }

    if (this.clients.has(serverId)) return;

    // Deduplicate concurrent connection attempts
    if (this.connecting.has(serverId)) {
      return this.connecting.get(serverId);
    }

    const connectPromise = (async () => {
      const transport = new StdioClientTransport({
        command,
        args,
        env: { ...process.env, ...env } as Record<string, string>,
      });

      const client = new Client(
        { name: "holly-mcp-client", version: "1.0.0" },
        { capabilities: {} }
      );

      // Race against a 10s timeout — prevents hanging forever in Docker
      // if the stdio subprocess fails to boot (missing deps, OOM, etc.)
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`[MCP] stdio connect timeout for ${serverId} (10s)`)), 10_000)
      );

      await Promise.race([client.connect(transport), timeout]);
      this.clients.set(serverId, client);
      this.connecting.delete(serverId);
      console.log(`[MCP] ✅ Connected to ${serverId} via stdio`);
    })();

    this.connecting.set(serverId, connectPromise);
    return connectPromise;
  }

  async connectSSE(serverId: string, url: string): Promise<void> {
    if (this.clients.has(serverId)) return;

    // Deduplicate concurrent connection attempts
    if (this.connecting.has(serverId)) {
      return this.connecting.get(serverId);
    }

    const connectPromise = (async () => {
      const endpoint = new URL(url);
      const transport = new SSEClientTransport(endpoint);

      const client = new Client(
        { name: "holly-mcp-client", version: "1.0.0" },
        { capabilities: {} }
      );

      await client.connect(transport);
      this.clients.set(serverId, client);
      this.connecting.delete(serverId);
      console.log(`[MCP] ✅ Connected to ${serverId} via SSE`);
    })();

    this.connecting.set(serverId, connectPromise);
    return connectPromise;
  }

  /**
   * Register a virtual server backed by HTTP API calls (not SSE transport).
   * Allows Hub endpoints (AURA, Sentinel) to appear as MCP tool servers without
   * requiring a separate SSE stream. Tools are proxied via callTool().
   */
  registerHttpServer(
    serverId: string,
    tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>,
    callHandler: (toolName: string, args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
  ): void {
    if (this.httpServers.has(serverId)) return;
    this.httpServers.set(serverId, { tools, callHandler });
    console.log(`[MCP] ✅ Registered HTTP server ${serverId} with ${tools.length} tool(s)`);
  }

  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.close();
      this.clients.delete(serverId);
      console.log(`[MCP] Disconnected from ${serverId}`);
    }
  }

  /**
   * Initialise all HOLLY tool servers once.
   * Called at module load — no-op if already done.
   */
  async ensureHollyTools(): Promise<void> {
    // ── Build Guard ──────────────────────────────────────────────────────────
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.DOCKER_BUILD === 'true') {
      return;
    }

    if (this.initialized) return;
    this.initialized = true;

    // 1. stdio holly-tools server (25 core tools)
    try {
      const serverPath = path.resolve(process.cwd(), "scripts", "holly-mcp-server.js");
      await this.connectStdio("holly-tools", "node", [serverPath]);
    } catch (err) {
      console.warn("[MCP] ⚠️ Could not connect to holly-tools server:", (err as Error).message);
      this.initialized = false; // Allow retry on next request
    }

    // 2. AURA Hub — HTTP proxy server (music A&R engine)
    this._registerAuraHub();

    // 3. Sentinel Hub — HTTP proxy server (code intelligence)
    this._registerSentinelHub();

    // 4. GitHub Hub — HTTP proxy server (self-editing tools — critical for sovereign autonomy)
    // These MUST be HTTP-based so they work even if the stdio server fails in Docker.
    this._registerGitHubHub();
  }

  // ── AURA Hub registration ──────────────────────────────────────────────────
  private _registerAuraHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'aura-hub',
      [
        {
          name: 'aura_analyze_song',
          description: 'HOLLY AURA A&R Engine — deep music analysis. Analyses a song for commercial potential, Billboard Hit Score, production quality, songwriting strength, and provides A&R feedback. Input: title, artist, genre, lyrics, bpm, key, mood.',
          inputSchema: {
            type: 'object',
            properties: {
              title:   { type: 'string', description: 'Song title (required)' },
              artist:  { type: 'string', description: 'Artist name' },
              genre:   { type: 'string', description: 'Genre (hip-hop, pop, R&B, etc.)' },
              lyrics:  { type: 'string', description: 'Lyrics or transcript' },
              bpm:     { type: 'number', description: 'Tempo in BPM' },
              key:     { type: 'string', description: 'Musical key, e.g. C Major' },
              mood:    { type: 'string', description: 'Mood / vibe' },
            },
            required: ['title'],
          },
        },
        {
          name: 'aura_generate_recommendations',
          description: 'AURA music improvement recommendations. Given a song, returns chord progressions, melody ideas, lyric edits, production tips, and a summary. Input: title, genre, lyrics, currentKey, currentBpm, targetMood, targetAudience, areas.',
          inputSchema: {
            type: 'object',
            properties: {
              title:         { type: 'string', description: 'Song title' },
              genre:         { type: 'string', description: 'Genre' },
              lyrics:        { type: 'string', description: 'Current lyrics' },
              currentKey:    { type: 'string', description: 'Current key' },
              currentBpm:    { type: 'number', description: 'Current BPM' },
              targetMood:    { type: 'string', description: 'Target mood/vibe after improvement' },
              targetAudience: { type: 'string', description: 'Target audience/market' },
              areas:         { type: 'array', items: { type: 'string' }, description: 'Areas to improve: melody, chords, lyrics, structure, production' },
            },
            required: [],
          },
        },
        {
          name: 'aura_identify_hit_potential',
          description: 'AURA hit potential identifier. Returns a hitScore (0-100), verdict (high/medium/low), confidence, market analysis, strengths, weaknesses, comparable artists, and release recommendation.',
          inputSchema: {
            type: 'object',
            properties: {
              title:        { type: 'string', description: 'Song title' },
              genre:        { type: 'string', description: 'Genre' },
              artist:       { type: 'string', description: 'Artist name' },
              lyrics:       { type: 'string', description: 'Lyrics' },
              targetMarket: { type: 'string', description: 'Target market, e.g. US mainstream, UK R&B' },
              releaseDate:  { type: 'string', description: 'Planned release date' },
              similarArtists: { type: 'string', description: 'Comparable artists' },
            },
            required: [],
          },
        },
      ],
      async (toolName, args) => {
        const actionMap: Record<string, string> = {
          aura_analyze_song: 'analyze_song',
          aura_generate_recommendations: 'generate_recommendations',
          aura_identify_hit_potential: 'identify_hit_potential',
        };
        const action = actionMap[toolName];
        if (!action) return { content: [{ type: 'text', text: `Unknown AURA action: ${toolName}` }] };

        try {
          const res = await fetch(`${baseUrl}/api/hub/aura/${action}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || 'holly-internal',
            },
            body: JSON.stringify(args),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `AURA Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── Sentinel Hub registration ──────────────────────────────────────────────
  private _registerSentinelHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'sentinel-hub',
      [
        {
          name: 'sentinel_analyze_code',
          description: 'HOLLY Sentinel code intelligence — analyzes code for quality score (0-100), errors, warnings, security vulnerabilities, performance issues, and returns auto-fixed code when possible.',
          inputSchema: {
            type: 'object',
            properties: {
              code:       { type: 'string', description: 'Source code to analyze' },
              language:   { type: 'string', description: 'Programming language' },
              filename:   { type: 'string', description: 'Filename for context' },
              context:    { type: 'string', description: 'Additional context about the code' },
              focusAreas: { type: 'array', items: { type: 'string' }, description: 'security, performance, style, errors' },
            },
            required: ['code', 'language'],
          },
        },
        {
          name: 'sentinel_generate_code',
          description: 'HOLLY Sentinel code generator — generates production-ready code from a description, with usage examples, dependencies, and test stubs.',
          inputSchema: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'What the code should do' },
              language:    { type: 'string', description: 'Programming language' },
              framework:   { type: 'string', description: 'Framework context, e.g. Next.js, React, FastAPI' },
              style:       { type: 'string', description: 'Code style: functional, class-based, hooks' },
              context:     { type: 'string', description: 'Existing code context' },
              requirements: { type: 'array', items: { type: 'string' }, description: 'Specific requirements' },
            },
            required: ['description', 'language'],
          },
        },
      ],
      async (toolName, args) => {
        const actionMap: Record<string, string> = {
          sentinel_analyze_code: 'analyze_code',
          sentinel_generate_code: 'generate_code',
        };
        const action = actionMap[toolName];
        if (!action) return { content: [{ type: 'text', text: `Unknown Sentinel action: ${toolName}` }] };

        try {
          const res = await fetch(`${baseUrl}/api/hub/sentinel/${action}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || 'holly-internal',
            },
            body: JSON.stringify(args),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Sentinel Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── GitHub Hub registration ────────────────────────────────────────────────
  // HTTP-based GitHub tools — work even when stdio MCP server fails in Docker.
  // These are Holly's sovereign self-editing tools. They MUST be always available.
  private _registerGitHubHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'github-hub',
      [
        {
          name: 'github_read_file',
          description: 'Read any file from Holly\'s GitHub repository. Returns full file content with line count. Use this FIRST before making any changes.',
          inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'File path (e.g. app/api/chat/route.ts)' }, branch: { type: 'string', description: 'Branch (default: main)' }, repo: { type: 'string', description: 'Override repo (default: Holly\'s own repo)' } }, required: ['path'] },
        },
        {
          name: 'github_list_files',
          description: 'List files and directories in Holly\'s GitHub repository. Use this to browse and find files to read or edit.',
          inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Directory path (empty for root)' }, branch: { type: 'string', description: 'Branch (default: main)' }, repo: { type: 'string', description: 'Override repo' } } },
        },
        {
          name: 'github_create_or_update_file',
          description: 'Create or update a file in Holly\'s GitHub repository with a commit. This is how Holly actually edits her own code and makes changes go live.',
          inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'File path to create/update' }, content: { type: 'string', description: 'Full new file content (not a diff — the complete file)' }, message: { type: 'string', description: 'Commit message (e.g. "fix: resolve streaming hang in chat route")' }, branch: { type: 'string', description: 'Branch (default: main)' }, repo: { type: 'string', description: 'Override repo' } }, required: ['path', 'content', 'message'] },
        },
        {
          name: 'github_create_pr',
          description: 'Create a pull request in Holly\'s GitHub repository for larger changes that need review.',
          inputSchema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, head: { type: 'string', description: 'Source branch' }, base: { type: 'string', description: 'Target branch (default: main)' }, repo: { type: 'string' } }, required: ['title', 'head'] },
        },
        {
          name: 'github_create_issue',
          description: 'Create a GitHub issue in Holly\'s repository to track bugs, features, or improvements.',
          inputSchema: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' }, labels: { type: 'array', items: { type: 'string' } }, repo: { type: 'string' } }, required: ['title'] },
        },
        {
          name: 'github_list_prs',
          description: 'List open or closed pull requests in Holly\'s GitHub repository.',
          inputSchema: { type: 'object', properties: { state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Filter by state (default: open)' }, repo: { type: 'string' } } },
        },
        {
          name: 'github_get_commits',
          description: 'Get recent commit history from Holly\'s GitHub repository to see what changes have been made.',
          inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Number of commits (default: 10)' }, branch: { type: 'string' }, repo: { type: 'string' } } },
        },
      ],
      async (toolName, args) => {
        try {
          const res = await fetch(`${baseUrl}/api/hub/github`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || 'holly-internal',
            },
            body: JSON.stringify({ action: toolName, args }),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json() as { result?: string; error?: string };
          const text = data.result || data.error || 'No response from GitHub hub';
          return { content: [{ type: 'text', text }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `GitHub Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  private _getBaseUrl(): string {
    // CRITICAL: These are server-to-server calls within the same Docker container.
    // We must use localhost, NOT NEXT_PUBLIC_APP_URL (which is a browser-side variable).
    // Using the public domain from inside Docker routes traffic out & back in, causing hangs.
    return process.env.INTERNAL_API_URL
      || `http://localhost:${process.env.PORT || 3000}`;
  }

  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    // Stdio / SSE tools
    for (const [serverId, client] of this.clients.entries()) {
      try {
        // 10s timeout — listTools can hang if the stdio subprocess is dead
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`listTools timeout for ${serverId}`)), 10_000)
        );
        const result = await Promise.race([client.listTools(), timeoutPromise]);
        const tools = result.tools.map((tool) => ({
          serverId,
          name: tool.name,
          description: tool.description || "",
          inputSchema: tool.inputSchema,
        }));
        allTools.push(...tools);
      } catch (err) {
        console.error(`[MCP] Failed to get tools for ${serverId}:`, (err as Error).message);
      }
    }

    // HTTP proxy tools (AURA Hub, Sentinel Hub)
    for (const [serverId, server] of this.httpServers.entries()) {
      const tools = server.tools.map((tool) => ({
        serverId,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
      allTools.push(...tools);
    }

    return allTools;
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Check if tool is disabled by health monitor (Phase A wiring)
    if (typeof toolHealthMonitor !== 'undefined' && !toolHealthMonitor.isToolEnabled(toolName)) {
      throw new Error(`[MCP] Tool ${toolName} is currently disabled due to repeated failures`);
    }

    try {
      // HTTP proxy server
      const httpServer = this.httpServers.get(serverId);
      if (httpServer) {
        // 30s timeout for HTTP tool calls
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`HTTP tool timeout: ${toolName} (30s)`)), 30_000)
        );
        const result = await Promise.race([httpServer.callHandler(toolName, args), timeoutPromise]);
        // Track success (Phase A wiring)
        try { toolHealthMonitor.recordSuccess(toolName); } catch { /* non-critical */ }
        return result;
      }

      // Stdio / SSE client
      const client = this.clients.get(serverId);
      if (!client) {
        throw new Error(`[MCP] Client ${serverId} not connected — tool unavailable`);
      }

      // 30s timeout — prevents hanging forever if stdio subprocess is dead
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Stdio tool timeout: ${toolName} (30s)`)), 30_000)
      );

      const result = await Promise.race([
        client.callTool({ name: toolName, arguments: args }),
        timeoutPromise,
      ]);
      // Track success (Phase A wiring)
      try { toolHealthMonitor.recordSuccess(toolName); } catch { /* non-critical */ }
      return result;
    } catch (error) {
      // Track failure (Phase A wiring)
      try { toolHealthMonitor.recordFailure(toolName, error instanceof Error ? error.message : String(error)); } catch { /* non-critical */ }
      throw error;
    }
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId) || this.httpServers.has(serverId);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────
// Exported once — shared across all requests in the same process.
export const mcpManager = new MCPClientManager();

// ─── Tool Health Monitor (Phase A wiring) ──────────────────────────────────
export const toolHealthMonitor = new ToolHealthMonitor(DEFAULT_HEALTH_CONFIG);
