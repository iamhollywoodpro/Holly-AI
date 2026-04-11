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

      await client.connect(transport);
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
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Sentinel Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  private _getBaseUrl(): string {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    );
  }

  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    // Stdio / SSE tools
    for (const [serverId, client] of this.clients.entries()) {
      try {
        const result = await client.listTools();
        const tools = result.tools.map((tool) => ({
          serverId,
          name: tool.name,
          description: tool.description || "",
          inputSchema: tool.inputSchema,
        }));
        allTools.push(...tools);
      } catch (err) {
        console.error(`[MCP] Failed to get tools for ${serverId}:`, err);
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
    // HTTP proxy server
    const httpServer = this.httpServers.get(serverId);
    if (httpServer) {
      return httpServer.callHandler(toolName, args);
    }

    // Stdio / SSE client
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`[MCP] Client ${serverId} not connected`);
    }

    const result = await client.callTool({ name: toolName, arguments: args });
    return result;
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId) || this.httpServers.has(serverId);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────
// Exported once — shared across all requests in the same process.
export const mcpManager = new MCPClientManager();
