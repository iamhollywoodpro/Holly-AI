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
 *   taste-hub     — HTTP   — /api/hub/taste (taste + judgment, Phase 4)
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

    // 5. Self-Code Hub — HTTP proxy for self-code awareness + autonomous modifications
    this._registerSelfCodeHub();

    // 6. Builder Hub — HTTP proxy for starting build sessions from chat
    this._registerBuilderHub();

    // 7. Web Sense Hub — HTTP proxy for deep search, browsing, screenshots, and interaction
    this._registerWebSenseHub();

    // 8. Code Gen Hub — HTTP proxy for project scaffolding, code generation, search, and patching
    this._registerCodeGenHub();

    // 9. Taste + Judgment Hub — HTTP proxy for taste signals, quality assessment, and preference learning
    this._registerTasteHub();

    // 10. Temporal Sense Hub — HTTP proxy for time awareness, pattern recognition, proactive insights
    this._registerTemporalHub();

    // 11. Collaborative Sense Hub — HTTP proxy for multi-agent coordination, task delegation, result aggregation
    this._registerCollaborativeHub();

    // 12. Project Lifecycle Hub — HTTP proxy for full project building, deployment, monitoring, and client handoff
    this._registerProjectHub();

    // 13. Local FS Hub — HTTP proxy for file read/write/list/run (stdio-independent)
    this._registerLocalFsHub();

    // 14. Diagnostic Hub — HTTP proxy for system diagnostics (stdio-independent)
    this._registerDiagnosticHub();
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
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
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
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
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
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
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

  // ── Self-Code Hub registration ──────────────────────────────────────────────
  // HTTP-based self-code tools — lets Holly inspect, propose, and apply changes
  // to her own codebase. Works even when stdio MCP server fails in Docker.
  private _registerSelfCodeHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'self-code-hub',
      [
        {
          name: 'self_code_apply',
          description: "Apply a self-code modification to Holly's own codebase. Actions: 'inspect' a file to read it, 'ask' a question about code, 'propose' an improvement, 'approve' and apply a proposal, or 'architecture' for an overview. Changes are validated, backed up, and logged.",
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['inspect', 'ask', 'propose', 'approve', 'architecture'], description: "Self-code action: 'inspect' a file, 'ask' about code, 'propose' an improvement, 'approve' and apply a proposal, or 'architecture' overview" },
              filePath: { type: 'string', description: "File path to inspect or modify (e.g. 'app/api/chat/route.ts')" },
              question: { type: 'string', description: "Question about Holly's code (for 'ask' action)" },
              proposalType: { type: 'string', enum: ['bug_fix', 'refactor', 'feature', 'performance', 'security', 'documentation'], description: "Type of proposal (for 'propose' action)" },
              description: { type: 'string', description: 'Description of the proposed change' },
              proposal: { type: 'object', description: 'Full proposal object to approve and apply (for approve action)' },
              approved: { type: 'boolean', description: 'Whether to approve the proposal' },
              creatorNote: { type: 'string', description: 'Optional note from creator' },
            },
            required: ['action'],
          },
        },
        {
          name: 'trigger_deploy',
          description: "Trigger Holly's own redeployment via Coolify webhook. After self-code changes are pushed to GitHub, call this to pull the new image and restart.",
          inputSchema: {
            type: 'object',
            properties: {
              reason: { type: 'string', description: 'Reason for the deployment (logged)' },
            },
            required: [],
          },
        },
      ],
      async (toolName, args) => {
        try {
          if (toolName === 'trigger_deploy') {
            const res = await fetch(`${baseUrl}/api/deploy/trigger`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-token': process.env.INTERNAL_API_SECRET || '',
              },
              body: JSON.stringify(args),
              signal: AbortSignal.timeout(30_000),
            });
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
          }

          // self_code_apply → /api/self-code
          const action = args.action as string;

          // 'architecture' uses GET endpoint
          if (action === 'architecture') {
            const res = await fetch(`${baseUrl}/api/self-code`, {
              method: 'GET',
              headers: {
                'x-internal-token': process.env.INTERNAL_API_SECRET || '',
              },
              signal: AbortSignal.timeout(30_000),
            });
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
          }

          const validActions = ['inspect', 'ask', 'propose', 'approve'];
          if (!validActions.includes(action)) return { content: [{ type: 'text', text: `Unknown self-code action: ${action}. Valid: ${validActions.join(', ')}, architecture` }] };

          const payload: Record<string, unknown> = { action };
          if (args.filePath) payload.filePath = args.filePath;
          if (args.question) payload.question = args.question;
          if (args.proposalType) payload.type = args.proposalType;
          if (args.description) payload.description = args.description;
          if (args.proposal) payload.proposal = args.proposal;
          if (args.approved !== undefined) payload.approved = args.approved;
          if (args.creatorNote) payload.creatorNote = args.creatorNote;
          if (args.userId) payload.userId = args.userId;

          const res = await fetch(`${baseUrl}/api/self-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Self-Code Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── Builder Hub registration ──────────────────────────────────────────────
  // Lets Holly start full build sessions from chat. The builder creates an
  // isolated sandbox, generates code, installs deps, and starts a dev server.
  // Uses Prisma directly to avoid Clerk auth issues with internal HTTP calls.
  private _registerBuilderHub(): void {
    this.registerHttpServer(
      'builder-hub',
      [
        {
          name: 'start_build',
          description: "Start a full autonomous build session. Holly creates an isolated sandbox, generates a complete app from your description, installs dependencies, and starts a dev server. Returns a session ID and link to view the live build. Use this when the user wants to build a complete app, website, or tool from scratch.",
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'What to build — detailed description of the app, website, or tool' },
              projectType: { type: 'string', enum: ['webapp', 'api', 'mobile', 'cli', 'library'], description: 'Type of project (default: webapp)' },
              stack: { type: 'string', enum: ['nextjs', 'react', 'vue', 'svelte', 'express', 'fastapi', 'flask'], description: 'Tech stack (default: nextjs)' },
              userId: { type: 'string', description: 'Internal user ID (passed automatically by chat route)' },
            },
            required: ['prompt'],
          },
        },
      ],
      async (toolName, args) => {
        if (toolName !== 'start_build') {
          return { content: [{ type: 'text', text: `Unknown builder action: ${toolName}` }] };
        }

        try {
          // Use dynamic import to avoid circular deps at module load
          const { prisma } = await import('@/lib/db');

          // Resolve user — either from explicit userId arg or from Clerk context
          let dbUserId = args.userId as string | undefined;
          if (!dbUserId) {
            // Try to get from the running request's Clerk context
            try {
              const { auth } = await import('@clerk/nextjs/server');
              const { userId: clerkId } = await auth();
              if (clerkId) {
                const user = await prisma.user.findUnique({ where: { clerkUserId: clerkId } });
                if (user) dbUserId = user.id;
              }
            } catch { /* No Clerk context available */ }
          }

          if (!dbUserId) {
            return { content: [{ type: 'text', text: 'Cannot start build: no user context available. Ask the user to try again.' }] };
          }

          // Create session directly via Prisma
          const session = await prisma.buildSession.create({
            data: {
              userId: dbUserId,
              prompt: (args.prompt as string).trim(),
              projectType: (args.projectType as string) || 'webapp',
              stack: (args.stack as string) || 'nextjs',
              repoUrl: null,
              status: 'idle',
              phase: 'init',
            },
          });

          // Start the builder agent in background
          try {
            const { runBuilderAgent } = await import('@/lib/builder/agent');
            runBuilderAgent(session.id).catch(err => {
              console.error('[BuilderHub] Agent error:', err);
            });
          } catch (agentErr) {
            console.error('[BuilderHub] Failed to import agent:', agentErr);
            return { content: [{ type: 'text', text: `Build session created (${session.id}) but agent failed to start: ${(agentErr as Error).message}` }] };
          }

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                ok: true,
                sessionId: session.id,
                status: 'building',
                message: `🚀 Build session started! The autonomous builder is now working on: "${args.prompt}"`,
                viewBuild: `${appUrl}/builder`,
                tip: 'The user can view the live build progress at the Builder page. Share the viewBuild link.',
              }, null, 2),
            }],
          };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Builder Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── Web Sense Hub registration ───────────────────────────────────────────
  // HTTP-based web tools — deep search, browsing, screenshots, and interaction.
  // These give Holly the ability to see and explore the internet autonomously.
  private _registerWebSenseHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'web-sense-hub',
      [
        {
          name: 'web_deep_search',
          description: 'Deep web search — searches Google (via Serper.dev) or DuckDuckGo, returns comprehensive results with summaries, key insights, and source URLs. Use this for research, finding information, checking facts, or exploring topics.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query — what to search for' },
              type: { type: 'string', enum: ['quick', 'comprehensive'], description: 'quick = just results, comprehensive = full summary + insights (default: comprehensive)' },
              maxResults: { type: 'number', description: 'Max number of results (default: 10)' },
              timeRange: { type: 'string', enum: ['day', 'week', 'month', 'year', 'all'], description: 'Time range filter (default: all)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'web_browse',
          description: 'Navigate to any URL and read its content. Returns the page title, text content, and links. Can also click elements, fill forms, and take screenshots. Use this to visit websites, read articles, test your own UI, or interact with web pages.',
          inputSchema: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['navigate', 'click', 'fill', 'screenshot', 'extract_text', 'extract_links', 'quick_fetch'],
                description: 'What to do: navigate to URL, click element, fill form field, take screenshot, extract text/links, or quick_fetch (grab page without keeping session)',
              },
              url: { type: 'string', description: 'URL to navigate to (for navigate/quick_fetch actions)' },
              sessionId: { type: 'string', description: 'Browser session ID (returned from navigate). Required for click/fill/screenshot/extract actions.' },
              selector: { type: 'string', description: 'CSS selector for click/fill actions (e.g. "button.submit", "#search-input")' },
              value: { type: 'string', description: 'Value to fill in (for fill action)' },
              fullPage: { type: 'boolean', description: 'Take full-page screenshot (default: false, viewport only)' },
            },
            required: ['action'],
          },
        },
        {
          name: 'web_screenshot',
          description: 'Take a screenshot of any URL or the current browser session. Returns a PNG image as base64. Use this to visually inspect websites, your own UI, or capture visual content.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to screenshot (creates a temporary session)' },
              sessionId: { type: 'string', description: 'Existing browser session ID (alternative to url)' },
              fullPage: { type: 'boolean', description: 'Capture full page (default: viewport only)' },
              width: { type: 'number', description: 'Viewport width (default: 1920)' },
              height: { type: 'number', description: 'Viewport height (default: 1080)' },
            },
          },
        },
      ],
      async (toolName, args) => {
        try {
          // web_deep_search → /api/web-agent/deep-search
          if (toolName === 'web_deep_search') {
            const res = await fetch(`${baseUrl}/api/web-agent/deep-search`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-token': process.env.INTERNAL_API_SECRET || '',
              },
              body: JSON.stringify(args),
              signal: AbortSignal.timeout(30_000),
            });
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
          }

          // web_browse → /api/web-agent/browse
          if (toolName === 'web_browse') {
            const res = await fetch(`${baseUrl}/api/web-agent/browse`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-token': process.env.INTERNAL_API_SECRET || '',
              },
              body: JSON.stringify(args),
              signal: AbortSignal.timeout(30_000),
            });
            const data = await res.json();
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
          }

          // web_screenshot → /api/web-agent/browse with screenshot action
          if (toolName === 'web_screenshot') {
            // If URL provided, do a quick navigate + screenshot
            if (args.url && !args.sessionId) {
              const browseRes = await fetch(`${baseUrl}/api/web-agent/browse`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-internal-token': process.env.INTERNAL_API_SECRET || '',
                },
                body: JSON.stringify({ action: 'create_session' }),
                signal: AbortSignal.timeout(10_000),
              });
              const sessionData = await browseRes.json();
              if (sessionData.sessionId) {
                // Navigate
                await fetch(`${baseUrl}/api/web-agent/browse`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-internal-token': process.env.INTERNAL_API_SECRET || '',
                  },
                  body: JSON.stringify({ action: 'navigate', url: args.url, sessionId: sessionData.sessionId }),
                  signal: AbortSignal.timeout(15_000),
                });
                // Screenshot
                const ssRes = await fetch(`${baseUrl}/api/web-agent/browse`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-internal-token': process.env.INTERNAL_API_SECRET || '',
                  },
                  body: JSON.stringify({ action: 'screenshot', sessionId: sessionData.sessionId, fullPage: args.fullPage }),
                  signal: AbortSignal.timeout(15_000),
                });
                const ssData = await ssRes.json();
                // Clean up
                await fetch(`${baseUrl}/api/web-agent/browse`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-internal-token': process.env.INTERNAL_API_SECRET || '',
                  },
                  body: JSON.stringify({ action: 'close_session', sessionId: sessionData.sessionId }),
                  signal: AbortSignal.timeout(5_000),
                });
                return { content: [{ type: 'text', text: JSON.stringify(ssData, null, 2) }] };
              }
              return { content: [{ type: 'text', text: 'Failed to create browser session for screenshot' }] };
            }
            // Existing session screenshot
            if (args.sessionId) {
              const ssRes = await fetch(`${baseUrl}/api/web-agent/browse`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-internal-token': process.env.INTERNAL_API_SECRET || '',
                },
                body: JSON.stringify({ action: 'screenshot', sessionId: args.sessionId, fullPage: args.fullPage }),
                signal: AbortSignal.timeout(15_000),
              });
              const ssData = await ssRes.json();
              return { content: [{ type: 'text', text: JSON.stringify(ssData, null, 2) }] };
            }
            return { content: [{ type: 'text', text: 'Provide either url or sessionId for screenshot' }] };
          }

          return { content: [{ type: 'text', text: `Unknown Web Sense action: ${toolName}` }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Web Sense Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── Code Gen Hub registration ───────────────────────────────────────────
  // HTTP-based code generation tools — scaffold, generate, search, patch.
  // These give Holly the ability to build complete applications from scratch.
  private _registerCodeGenHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'code-gen-hub',
      [
        {
          name: 'project_scaffold',
          description: 'Scaffold a new project from a template. Creates a complete project structure with all necessary files. Templates: nextjs, react, static, api, cli, express, fullstack. Use this when starting a new project from scratch.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name (lowercase, hyphens allowed)' },
              template: { type: 'string', enum: ['nextjs', 'react', 'static', 'api', 'cli', 'express', 'fullstack'], description: 'Project template type' },
              description: { type: 'string', description: 'Brief project description' },
              typescript: { type: 'boolean', description: 'Use TypeScript (default: true)' },
              tailwind: { type: 'boolean', description: 'Include Tailwind CSS (nextjs/react only, default: true)' },
              database: { type: 'string', enum: ['sqlite', 'postgres', 'mongodb', 'none'], description: 'Database to include (default: none)' },
            },
            required: ['name', 'template'],
          },
        },
        {
          name: 'code_generate',
          description: 'Generate code from a description. Can generate single or multiple files. Supports generate, modify, complete, debug, and refactor modes. Uses Holly\'s Smart Router to pick the best model for the task.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'What to generate — be specific about what the code should do' },
              language: { type: 'string', description: 'Programming language (default: typescript)' },
              framework: { type: 'string', description: 'Framework to use (e.g. react, express, nextjs)' },
              fileName: { type: 'string', description: 'Target file name (optional)' },
              context: { type: 'string', description: 'Additional context — existing code, related files, requirements' },
              existingCode: { type: 'string', description: 'Existing code to modify/complete/debug (for modify/debug/refactor/complete modes)' },
              mode: { type: 'string', enum: ['generate', 'modify', 'complete', 'debug', 'refactor'], description: 'Generation mode (default: generate)' },
            },
            required: ['prompt'],
          },
        },
        {
          name: 'code_search',
          description: 'Search across a codebase for code patterns. Returns matching files with line numbers and context. Use this to understand existing code before making changes.',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query — text or regex pattern' },
              directory: { type: 'string', description: 'Directory to search in (default: current directory)' },
              filePattern: { type: 'string', description: 'File glob pattern filter (e.g. "*.tsx", "*.py")' },
              maxResults: { type: 'number', description: 'Maximum results (default: 50)' },
              caseSensitive: { type: 'boolean', description: 'Case sensitive search (default: false)' },
            },
            required: ['query'],
          },
        },
        {
          name: 'code_patch',
          description: 'Apply a targeted patch to a file. Finds specific content and replaces it. Uses fuzzy matching to handle minor whitespace differences. Safer than rewriting entire files.',
          inputSchema: {
            type: 'object',
            properties: {
              filePath: { type: 'string', description: 'Path to the file to patch' },
              oldContent: { type: 'string', description: 'Content to find (provide enough context for a unique match)' },
              newContent: { type: 'string', description: 'Replacement content' },
              replaceAll: { type: 'boolean', description: 'Replace all occurrences (default: false — requires unique match)' },
            },
            required: ['filePath', 'oldContent', 'newContent'],
          },
        },
        {
          name: 'project_build',
          description: 'Build, test, and validate a project. Runs the build command and reports results. Use this after generating or modifying code to verify everything works.',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Project directory to build' },
              command: { type: 'string', description: 'Build command (default: auto-detected from package.json)' },
              timeout: { type: 'number', description: 'Timeout in seconds (default: 120)' },
            },
            required: ['directory'],
          },
        },
      ],
      async (toolName, args) => {
        try {
          const res = await fetch(`${baseUrl}/api/code-gen`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify({
              action: toolName === 'project_scaffold' ? 'scaffold'
                    : toolName === 'code_generate' ? 'generate'
                    : toolName === 'code_search' ? 'search'
                    : toolName === 'code_patch' ? 'apply-patch'
                    : toolName === 'project_build' ? 'build'
                    : toolName,
              options: toolName === 'project_scaffold' ? args : undefined,
              request: toolName === 'code_generate' ? args : undefined,
              patch: toolName === 'code_patch' ? args : undefined,
              searchOptions: toolName === 'code_search' ? args : undefined,
            }),
            signal: AbortSignal.timeout(60_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Code Gen Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── Taste + Judgment Hub registration (Phase 4) ─────────────────────────
  private _registerTasteHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'taste-judgment-hub',
      [
        {
          name: 'taste_record_signal',
          description: "Record a taste signal for the user — tracks their preferences across tone, format, length, humor, technical level, emoji use, and topics. Signals are positive, negative, or neutral. Holly uses these to learn the user's style over time.",
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: ['tone', 'length', 'format', 'humor', 'emoji', 'technical', 'topic'], description: 'What dimension this signal is about' },
              item:      { type: 'string', description: 'What the signal refers to, e.g. "bullet_lists", "formal_tone", "code_blocks"' },
              signal:    { type: 'string', enum: ['positive', 'negative', 'neutral'], description: 'Sentiment of the signal' },
              context:   { type: 'string', description: 'Brief context (message snippet)' },
              weight:    { type: 'number', description: 'Signal strength 0.0-2.0 (default: 1.0)' },
              source:    { type: 'string', enum: ['implicit', 'explicit', 'feedback'], description: 'How this signal was detected (default: implicit)' },
            },
            required: ['category', 'item', 'signal'],
          },
        },
        {
          name: 'taste_batch_signals',
          description: 'Record multiple taste signals at once. Useful when analyzing a message that reveals several preferences simultaneously.',
          inputSchema: {
            type: 'object',
            properties: {
              signals: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: { type: 'string' },
                    item:      { type: 'string' },
                    signal:    { type: 'string' },
                    context:   { type: 'string' },
                    weight:    { type: 'number' },
                    source:    { type: 'string' },
                  },
                  required: ['category', 'item', 'signal'],
                },
                description: 'Array of taste signals to record',
              },
            },
            required: ['signals'],
          },
        },
        {
          name: 'taste_get_profile',
          description: "Get the user's current taste profile — their learned preferences for tone, verbosity, humor, technical level, emoji usage, preferred topics, and formats. Returns null if no profile exists yet.",
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'taste_assess_quality',
          description: 'Assess the quality of code, content, or design. Uses the Smart Router to pick the best AI model for evaluation. Returns a score (0-100), grade, strengths, weaknesses, and suggestions.',
          inputSchema: {
            type: 'object',
            properties: {
              type:    { type: 'string', enum: ['code', 'content', 'design'], description: 'What type of content to assess' },
              input:   { type: 'string', description: 'The content to assess' },
              context: { type: 'string', description: 'Additional context about the content' },
            },
            required: ['type', 'input'],
          },
        },
        {
          name: 'taste_detect_signals',
          description: "Automatically detect implicit taste signals from a user's message and optional assistant response. Returns detected signals and auto-records them to the user's profile.",
          inputSchema: {
            type: 'object',
            properties: {
              userMessage:       { type: 'string', description: "The user's message to analyze for implicit signals" },
              assistantResponse: { type: 'string', description: "Holly's previous response (for format detection)" },
            },
            required: ['userMessage'],
          },
        },
      ],
      async (toolName, args) => {
        try {
          const actionMap: Record<string, string> = {
            taste_record_signal:  'record_signal',
            taste_batch_signals:  'batch_signals',
            taste_get_profile:    'get_profile',
            taste_assess_quality: 'assess_quality',
            taste_detect_signals: 'detect_signals',
          };
          const action = actionMap[toolName];
          if (!action) return { content: [{ type: 'text', text: `Unknown Taste Hub action: ${toolName}` }] };

          const res = await fetch(`${baseUrl}/api/hub/taste`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify({ action, ...args }),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Taste Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }


  // ── Temporal Sense Hub registration ────────────────────────────────────────
  private _registerTemporalHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'temporal-sense-hub',
      [
        {
          name: 'temporal_record_event',
          description: "Record a temporal event — tracks when things happen (conversations, code changes, deployments, milestones). Events are the raw data for Holly's temporal awareness and pattern recognition.",
          inputSchema: {
            type: 'object',
            properties: {
              eventType:  { type: 'string', enum: ['conversation', 'code_change', 'deployment', 'milestone', 'commit', 'file_change', 'deployment_status', 'quality_alert'], description: 'What kind of event' },
              category:   { type: 'string', enum: ['work', 'personal', 'project', 'learning', 'social'], description: 'Event category' },
              title:      { type: 'string', description: 'Human-readable description of the event' },
              description:{ type: 'string', description: 'Optional longer description' },
              metadata:   { type: 'object', description: 'Flexible payload (file paths, URLs, commit SHAs, etc.)' },
              importance: { type: 'number', description: 'How significant 0.0-1.0 (default: 0.5)' },
              projectRef: { type: 'string', description: 'Optional project or conversation ID reference' },
            },
            required: ['eventType', 'category', 'title'],
          },
        },
        {
          name: 'temporal_get_recent',
          description: 'Get recent temporal events for the user. Optionally filter by type, category, time range, or minimum importance.',
          inputSchema: {
            type: 'object',
            properties: {
              eventType:     { type: 'string', description: 'Filter by event type' },
              category:      { type: 'string', description: 'Filter by category' },
              since:         { type: 'string', description: 'ISO date string — only events after this time' },
              limit:         { type: 'number', description: 'Max events to return (default: 20)' },
              minImportance: { type: 'number', description: 'Minimum importance threshold 0.0-1.0' },
            },
          },
        },
        {
          name: 'temporal_get_timeline',
          description: "Get a chronological timeline of the user's events within a date range. Useful for understanding what the user has been working on.",
          inputSchema: {
            type: 'object',
            properties: {
              from:       { type: 'string', description: 'Start date (ISO string)' },
              to:         { type: 'string', description: 'End date (ISO string)' },
              category:   { type: 'string', description: 'Filter by category' },
              projectRef: { type: 'string', description: 'Filter by project reference' },
            },
          },
        },
        {
          name: 'temporal_start_session',
          description: "Start tracking an activity session. Records what the user is working on, auto-closes any previous open session.",
          inputSchema: {
            type: 'object',
            properties: {
              sessionType:    { type: 'string', enum: ['coding', 'conversation', 'research', 'creative', 'review', 'deployment'], description: 'Type of session' },
              topic:          { type: 'string', description: 'Main topic of the session' },
              projectRef:     { type: 'string', description: 'Project being worked on' },
              conversationId: { type: 'string', description: 'Active conversation ID' },
            },
            required: ['sessionType'],
          },
        },
        {
          name: 'temporal_end_session',
          description: 'End an active activity session, recording final message count, tools used, topics, and productivity.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId:   { type: 'string', description: 'The session ID to end' },
              messageCount:{ type: 'number', description: 'Messages exchanged during session' },
              toolsUsed:   { type: 'array', items: { type: 'string' }, description: 'MCP tools invoked during session' },
              topics:      { type: 'array', items: { type: 'string' }, description: 'Topics discussed during session' },
              productivity:{ type: 'number', description: 'Estimated productivity 0.0-1.0' },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'temporal_detect_patterns',
          description: "Analyze the user's temporal events and detect recurring patterns — work schedules, activity cycles, topic rhythms, focus patterns. Returns discovered patterns with confidence scores.",
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'temporal_get_patterns',
          description: "Retrieve the user's learned temporal patterns. Optionally filter by type and minimum confidence.",
          inputSchema: {
            type: 'object',
            properties: {
              patternType:  { type: 'string', description: 'Filter: work_schedule, activity_cycle, topic_rhythm, deadline_pattern, focus_pattern' },
              minConfidence:{ type: 'number', description: 'Minimum confidence threshold 0.0-1.0' },
            },
          },
        },
        {
          name: 'temporal_generate_insights',
          description: "Generate proactive insights and suggestions based on temporal data. Holly uses this to say things like 'you haven\'t worked on X in a while' or 'this might be a good time to refactor Y'.",
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'temporal_get_pending_insights',
          description: 'Get proactive insights that have not yet been shown to the user. These are suggestions Holly can proactively offer.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Max insights to return (default: 5)' },
            },
          },
        },
        {
          name: 'temporal_mark_insight_shown',
          description: 'Mark a proactive insight as shown to the user.',
          inputSchema: {
            type: 'object',
            properties: { insightId: { type: 'string', description: 'The insight ID' } },
            required: ['insightId'],
          },
        },
        {
          name: 'temporal_mark_insight_acted_on',
          description: 'Mark a proactive insight as acted on by the user.',
          inputSchema: {
            type: 'object',
            properties: {
              insightId: { type: 'string', description: 'The insight ID' },
              feedback:  { type: 'string', description: 'User feedback on the insight' },
            },
            required: ['insightId'],
          },
        },
        {
          name: 'temporal_dismiss_insight',
          description: 'Dismiss a proactive insight — user is not interested.',
          inputSchema: {
            type: 'object',
            properties: { insightId: { type: 'string', description: 'The insight ID' } },
            required: ['insightId'],
          },
        },
        {
          name: 'temporal_get_context',
          description: "Get a formatted temporal context string for injection into the system prompt. Includes current time, active session summary, recent activity, known patterns, and pending insights. Holly uses this to be time-aware.",
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'temporal_cleanup',
          description: 'Remove expired temporal events and insights. Returns count of cleaned items.',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      async (toolName, args) => {
        try {
          const actionMap: Record<string, string> = {
            temporal_record_event:       'record_event',
            temporal_get_recent:         'get_recent_events',
            temporal_get_timeline:       'get_timeline',
            temporal_start_session:      'start_session',
            temporal_end_session:        'end_session',
            temporal_detect_patterns:    'detect_patterns',
            temporal_get_patterns:       'get_patterns',
            temporal_generate_insights:  'generate_insights',
            temporal_get_pending_insights:'get_pending_insights',
            temporal_mark_insight_shown: 'mark_insight_shown',
            temporal_mark_insight_acted_on: 'mark_insight_acted_on',
            temporal_dismiss_insight:    'dismiss_insight',
            temporal_get_context:        'get_temporal_context',
            temporal_cleanup:            'cleanup_expired',
          };
          const action = actionMap[toolName];
          if (!action) return { content: [{ type: 'text', text: `Unknown Temporal Hub action: ${toolName}` }] };

          const res = await fetch(`${baseUrl}/api/hub/temporal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify({ action, ...args }),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Temporal Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── Collaborative Sense Hub registration (Phase 6) ───────────────────────
  private _registerCollaborativeHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'collaborative-sense-hub',
      [
        {
          name: 'collab_create_session',
          description: "Create a coordination session for multi-agent collaboration. Specify a goal, strategy (parallel, sequential, pipeline, map_reduce, swarm), and max concurrency. Returns the new session with its ID.",
          inputSchema: {
            type: 'object',
            properties: {
              title:          { type: 'string', description: 'Session name (e.g. "Build landing page", "Research competitors")' },
              description:    { type: 'string', description: 'What the session should accomplish' },
              goal:           { type: 'string', description: 'The overarching goal for all agents' },
              strategy:       { type: 'string', enum: ['parallel', 'sequential', 'pipeline', 'map_reduce', 'swarm'], description: 'Coordination strategy (default: parallel)' },
              maxConcurrency: { type: 'number', description: 'Max agents running simultaneously (default: 3)' },
              sharedContext:  { type: 'object', description: 'Shared knowledge/context for all agents' },
            },
            required: ['title', 'goal'],
          },
        },
        {
          name: 'collab_spawn_agent',
          description: "Spawn a new Holly agent instance within a coordination session. Each agent gets a role, capabilities, and an assigned task. Agents work semi-independently and report results.",
          inputSchema: {
            type: 'object',
            properties: {
              sessionId:     { type: 'string', description: 'The coordination session ID' },
              role:          { type: 'string', enum: ['coder', 'researcher', 'reviewer', 'tester', 'coordinator', 'general'], description: "Agent's role" },
              displayName:   { type: 'string', description: 'Human-readable name (e.g. "Holly-Coder-1")' },
              capabilities:  { type: 'array', items: { type: 'string' }, description: 'What this agent can do: ["code_gen", "web_search", "taste", "temporal"]' },
              assignedTask:  { type: 'string', description: 'The task description for this agent' },
              priority:      { type: 'number', description: 'Priority 1-10, 1=highest (default: 5)' },
              maxIterations: { type: 'number', description: 'Max tool-calling iterations (default: 15)' },
              parentAgentId: { type: 'string', description: 'Parent agent if spawned by another agent' },
              sharedContext: { type: 'object', description: 'Agent-specific context override' },
            },
            required: ['sessionId', 'role'],
          },
        },
        {
          name: 'collab_create_task',
          description: "Create a new task in a coordination session. Tasks can have dependencies on other tasks, and are assigned to agents. Supports code, research, review, test, deploy, analyze, and design tasks.",
          inputSchema: {
            type: 'object',
            properties: {
              sessionId:    { type: 'string', description: 'The coordination session ID' },
              title:        { type: 'string', description: 'Short task title' },
              description:  { type: 'string', description: 'Detailed task specification' },
              taskType:     { type: 'string', enum: ['code', 'research', 'review', 'test', 'deploy', 'analyze', 'design'], description: 'Type of task' },
              priority:     { type: 'number', description: 'Priority 1-10 (default: 5)' },
              dependencies: { type: 'array', items: { type: 'string' }, description: 'Task IDs that must complete before this one' },
              inputContext: { type: 'string', description: 'Context needed to start the task' },
              agentId:      { type: 'string', description: 'Auto-assign to this agent' },
              deadlineAt:   { type: 'string', description: 'ISO date deadline' },
            },
            required: ['sessionId', 'title', 'description', 'taskType'],
          },
        },
        {
          name: 'collab_assign_task',
          description: 'Assign a pending task to a specific agent. The agent will claim the task and begin work.',
          inputSchema: {
            type: 'object',
            properties: {
              taskId:  { type: 'string', description: 'The task ID' },
              agentId: { type: 'string', description: 'The agent to assign it to' },
            },
            required: ['taskId', 'agentId'],
          },
        },
        {
          name: 'collab_update_agent_status',
          description: "Update an agent's status. Use to report progress, completion, or failure. Can include the agent's result output.",
          inputSchema: {
            type: 'object',
            properties: {
              agentId:        { type: 'string', description: 'The agent instance ID' },
              status:         { type: 'string', enum: ['idle', 'working', 'waiting', 'completed', 'failed', 'terminated'], description: 'New status' },
              result:         { type: 'string', description: 'Full result output (on completion)' },
              resultSummary:  { type: 'string', description: 'Condensed result summary' },
              errorMessage:   { type: 'string', description: 'Error details (on failure)' },
              iterationCount: { type: 'number', description: 'Current iteration count' },
              metadata:       { type: 'object', description: 'Extra data: model used, tokens, timing' },
            },
            required: ['agentId', 'status'],
          },
        },
        {
          name: 'collab_update_task_status',
          description: "Update a task's status and optionally attach output, quality score, or review notes.",
          inputSchema: {
            type: 'object',
            properties: {
              taskId:        { type: 'string', description: 'The task ID' },
              status:        { type: 'string', enum: ['claimed', 'in_progress', 'review', 'completed', 'failed', 'cancelled'], description: 'New status' },
              output:        { type: 'string', description: 'Task output/result' },
              outputSummary: { type: 'string', description: 'Condensed output' },
              qualityScore:  { type: 'number', description: 'Quality assessment 0.0-1.0' },
              reviewNotes:   { type: 'string', description: 'Reviewer feedback' },
            },
            required: ['taskId', 'status'],
          },
        },
        {
          name: 'collab_send_message',
          description: "Send a message between agents. Use for coordination, questions, status updates, or passing results. Leave toAgentId empty for broadcast.",
          inputSchema: {
            type: 'object',
            properties: {
              sessionId:   { type: 'string', description: 'The coordination session' },
              fromAgentId: { type: 'string', description: 'Sending agent ID' },
              toAgentId:   { type: 'string', description: 'Receiving agent ID (omit for broadcast)' },
              messageType: { type: 'string', enum: ['task_assignment', 'status_update', 'result', 'question', 'answer', 'coordination', 'error'], description: 'Message type' },
              content:     { type: 'string', description: 'Message body' },
              metadata:    { type: 'object', description: 'Extra data' },
            },
            required: ['sessionId', 'fromAgentId', 'messageType', 'content'],
          },
        },
        {
          name: 'collab_get_messages',
          description: 'Get inter-agent messages for a session. Optionally filter by agent, time, or unread status.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId:   { type: 'string', description: 'The session' },
              agentId:     { type: 'string', description: 'Filter by agent' },
              since:       { type: 'string', description: 'ISO date — only messages after this time' },
              unreadOnly:  { type: 'boolean', description: 'Only unread messages' },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'collab_get_session_status',
          description: "Get full session status: agents, tasks, progress percentage, and message counts.",
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'The session ID' },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'collab_decompose_goal',
          description: "Use AI to decompose a session's goal into a structured set of subtasks. Returns suggested tasks with titles, descriptions, types, and priorities. Does NOT auto-create tasks — just returns suggestions.",
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'The session whose goal to decompose' },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'collab_aggregate_results',
          description: "Collect all completed agent/task results from a session and use AI to synthesize a final aggregated result. Updates the session with the final output.",
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'The session to aggregate' },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'collab_get_session_history',
          description: 'List past coordination sessions for the user. Optionally filter by status or strategy.',
          inputSchema: {
            type: 'object',
            properties: {
              status:   { type: 'string', description: 'Filter by status' },
              strategy: { type: 'string', description: 'Filter by strategy' },
              limit:    { type: 'number', description: 'Max sessions (default: 20)' },
              offset:   { type: 'number', description: 'Offset for pagination' },
            },
          },
        },
        {
          name: 'collab_cleanup_session',
          description: 'Terminate all running agents, cancel pending tasks, and close a coordination session. Use when done or when aborting.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'The session to clean up' },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'collab_heartbeat',
          description: 'Agent heartbeat signal. Updates last-seen timestamp and checks for timed-out agents. Agents should call this periodically while working.',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string', description: 'The agent sending a heartbeat' },
            },
            required: ['agentId'],
          },
        },
        {
          name: 'collab_list_active_agents',
          description: 'List all active (idle, working, or waiting) agents in a session.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'The session' },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'collab_get_task_queue',
          description: 'Get the task queue for a session. Optionally filter by task status.',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: { type: 'string', description: 'The session' },
              status:    { type: 'string', description: 'Filter by task status' },
            },
            required: ['sessionId'],
          },
        },
      ],
      async (toolName, args) => {
        try {
          const actionMap: Record<string, string> = {
            collab_create_session:       'create_session',
            collab_spawn_agent:          'spawn_agent',
            collab_create_task:          'create_task',
            collab_assign_task:          'assign_task',
            collab_update_agent_status:  'update_agent_status',
            collab_update_task_status:   'update_task_status',
            collab_send_message:         'send_message',
            collab_get_messages:         'get_messages',
            collab_get_session_status:   'get_session_status',
            collab_decompose_goal:       'decompose_goal',
            collab_aggregate_results:    'aggregate_results',
            collab_get_session_history:  'get_session_history',
            collab_cleanup_session:      'cleanup_session',
            collab_heartbeat:            'heartbeat',
            collab_list_active_agents:   'list_active_agents',
            collab_get_task_queue:       'get_task_queue',
          };
          const action = actionMap[toolName];
          if (!action) return { content: [{ type: 'text', text: `Unknown Collaborative Hub action: ${toolName}` }] };

          const res = await fetch(`${baseUrl}/api/hub/collaborative`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify({ action, ...args }),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Collaborative Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── Local FS Hub registration ──────────────────────────────────────────────
  // Provides local_read_file, local_write_file, local_list_dir, local_run_command
  // via HTTP so they work even when the stdio MCP subprocess fails in Docker.
  private _registerLocalFsHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'local-fs-hub',
      [
        {
          name: 'local_read_file',
          description: "Read a file from Holly's local codebase. Returns file contents with line count.",
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: "Relative file path (e.g. 'app/api/chat/route.ts')" },
            },
            required: ['path'],
          },
        },
        {
          name: 'local_write_file',
          description: "Write content to a file in Holly's local codebase. Creates directories if needed.",
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: "Relative file path (e.g. 'src/lib/utils.ts')" },
              content: { type: 'string', description: 'File content to write' },
            },
            required: ['path', 'content'],
          },
        },
        {
          name: 'local_list_dir',
          description: "List contents of a directory in Holly's local codebase.",
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: "Relative directory path (default: '.')" },
            },
            required: [],
          },
        },
        {
          name: 'local_run_command',
          description: "Run a shell command in Holly's local codebase. Use for builds, tests, git operations.",
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string', description: "Shell command to run (e.g. 'npm run build')" },
              cwd: { type: 'string', description: "Working directory (default: repo root)" },
              timeout: { type: 'number', description: "Timeout in ms (default: 30000, max: 120000)" },
            },
            required: ['command'],
          },
        },
      ],
      async (toolName, args) => {
        try {
          const res = await fetch(`${baseUrl}/api/hub/local-fs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify({ tool: toolName, args }),
            signal: AbortSignal.timeout(60_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: data.result || JSON.stringify(data) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Local FS Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }

  // ── Diagnostic Hub registration ────────────────────────────────────────────
  // Provides diagnostic_check via HTTP so it works without stdio subprocess.
  private _registerDiagnosticHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'diagnostic-hub',
      [
        {
          name: 'diagnostic_check',
          description: "Run diagnostic checks on Holly's systems. Checks: health, tts, llm, memory, image.",
          inputSchema: {
            type: 'object',
            properties: {
              checks: {
                type: 'array',
                items: { type: 'string', enum: ['health', 'tts', 'llm', 'memory', 'image'] },
                description: "Which checks to run (default: all)",
              },
            },
            required: [],
          },
        },
      ],
      async (toolName, args) => {
        try {
          const res = await fetch(`${baseUrl}/api/hub/diagnostic`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify({ checks: args.checks }),
            signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          return { content: [{ type: 'text', text: data.result || JSON.stringify(data) }] };
        } catch (e: unknown) {
          return { content: [{ type: 'text', text: `Diagnostic Hub error: ${(e as Error).message}` }] };
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

      // Media tools need longer — image generation can take 60s+ on cold starts
      const isMediaTool = ['generate_image', 'generate_video', 'generate_music', 'hybrid_studio'].includes(toolName);
      const toolTimeout = isMediaTool ? 120_000 : 30_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Stdio tool timeout: ${toolName} (${toolTimeout / 1000}s)`)), toolTimeout)
      );

      // Media tools get a higher failure threshold — they're inherently flakier
      if (isMediaTool) {
        try { toolHealthMonitor.enableTool(toolName); } catch { /* reset circuit breaker */ }
      }

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

  // ── Project Lifecycle Hub registration (Phase 7) ──────────────────────────
  private _registerProjectHub(): void {
    const baseUrl = this._getBaseUrl();
    this.registerHttpServer(
      'project-hub',
      [
        // PROJECT
        {
          name: 'project_create',
          description: 'HOLLY Project Lifecycle — create a new project. Input: name (required), description, clientName, clientEmail, stack (nextjs/react/static/express/fullstack), framework, database, hostingTargets, deadline, tags.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Project name (required)' },
              description: { type: 'string', description: 'Project description' },
              clientName: { type: 'string', description: 'Client or org name' },
              clientEmail: { type: 'string', description: 'Client contact email' },
              stack: { type: 'string', description: 'Tech stack: nextjs, react, static, express, fullstack' },
              framework: { type: 'string', description: 'Specific framework version' },
              database: { type: 'string', description: 'Database: postgres, mysql, sqlite, none' },
              hostingTargets: { type: 'array', items: { type: 'string' }, description: 'Hosting platforms: vercel, netlify, aws, coolify, railway, digitalocean' },
              deadline: { type: 'string', description: 'Project deadline (ISO date)' },
              tags: { type: 'array', items: { type: 'string' }, description: 'Project tags' },
            },
            required: ['name'],
          },
        },
        {
          name: 'project_get',
          description: 'Get a project with all deployments, alerts, and handoffs.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string', description: 'Project ID' } },
            required: ['projectId'],
          },
        },
        {
          name: 'project_list',
          description: 'List projects with optional status filter.',
          inputSchema: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Filter by status: ideation, planning, scaffolding, developing, testing, staging, deploying, live, maintenance, archived' },
              limit: { type: 'number', description: 'Max results (default 50)' },
            },
          },
        },
        {
          name: 'project_update_status',
          description: 'Update project status. Automatically manages timestamps (startedAt, deliveredAt, archivedAt).',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              status: { type: 'string', description: 'New status' },
              phase: { type: 'string', description: 'Current workflow phase' },
            },
            required: ['projectId', 'status'],
          },
        },
        {
          name: 'project_update_quality',
          description: 'Update project quality scores: qualityScore, testCoverage, performanceScore, accessibilityScore, securityScore (0-100 each).',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              qualityScore: { type: 'number' },
              testCoverage: { type: 'number' },
              performanceScore: { type: 'number' },
              accessibilityScore: { type: 'number' },
              securityScore: { type: 'number' },
            },
            required: ['projectId'],
          },
        },
        {
          name: 'project_generate_brief',
          description: 'AI-generate a comprehensive project brief from the project details.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'project_generate_architecture',
          description: 'AI-generate architecture documentation for the project.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'project_generate_roadmap',
          description: 'AI-generate a phased development roadmap for the project.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'project_archive',
          description: 'Archive a project.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'project_delete',
          description: 'Permanently delete a project and all associated data.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        // DEPLOYMENT
        {
          name: 'deployment_create',
          description: 'Create a deployment record for a project. Supports: vercel, netlify, aws, coolify, railway, digitalocean.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              platform: { type: 'string', description: 'Hosting platform' },
              environment: { type: 'string', description: 'production, staging, preview' },
              branch: { type: 'string' },
              commitSha: { type: 'string' },
              autoDeploy: { type: 'boolean' },
              branchAutoDeploy: { type: 'string' },
              customDomain: { type: 'string' },
            },
            required: ['projectId', 'platform'],
          },
        },
        {
          name: 'deployment_update',
          description: 'Update deployment status (pending/building/deploying/live/failed/rolled_back).',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentId: { type: 'string' },
              status: { type: 'string' },
              error: { type: 'string' },
              buildLog: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['deploymentId', 'status'],
          },
        },
        {
          name: 'deployment_record_metrics',
          description: 'Record build/deploy performance metrics.',
          inputSchema: {
            type: 'object',
            properties: {
              deploymentId: { type: 'string' },
              buildDurationSec: { type: 'number' },
              deployDurationSec: { type: 'number' },
              coldStartMs: { type: 'number' },
            },
            required: ['deploymentId'],
          },
        },
        {
          name: 'deployment_generate_pipeline',
          description: 'AI-generate CI/CD pipeline configuration for a specific platform and stack.',
          inputSchema: {
            type: 'object',
            properties: {
              platform: { type: 'string', description: 'Target platform' },
              stack: { type: 'string', description: 'Tech stack' },
              framework: { type: 'string' },
              database: { type: 'string' },
              environment: { type: 'string' },
            },
            required: ['platform', 'stack'],
          },
        },
        {
          name: 'deployment_history',
          description: 'Get full deployment history for a project with success rate and metrics.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'deployment_rollback',
          description: 'Rollback to the last successful deployment.',
          inputSchema: {
            type: 'object',
            properties: { deploymentId: { type: 'string' } },
            required: ['deploymentId'],
          },
        },
        // MONITORING
        {
          name: 'monitoring_create_alert',
          description: 'Create a monitoring alert (uptime/performance/error/security/ssl/cost).',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              type: { type: 'string', description: 'Alert type' },
              severity: { type: 'string', description: 'info, warning, critical, emergency' },
              title: { type: 'string' },
              description: { type: 'string' },
              metric: { type: 'string' },
              metricValue: { type: 'number' },
              thresholdValue: { type: 'number' },
            },
            required: ['projectId', 'type', 'title'],
          },
        },
        {
          name: 'monitoring_get_alerts',
          description: 'List monitoring alerts with filters.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              status: { type: 'string' },
              severity: { type: 'string' },
              type: { type: 'string' },
              limit: { type: 'number' },
            },
          },
        },
        {
          name: 'monitoring_check_uptime',
          description: 'Run an uptime check on a project by hitting its live URL.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'monitoring_security_scan',
          description: 'AI-powered security scan for a project. Generates vulnerability findings and updates security score.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'monitoring_performance_audit',
          description: 'AI-powered performance audit. Analyzes Core Web Vitals and generates optimization recommendations.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'monitoring_acknowledge_alert',
          description: 'Acknowledge a monitoring alert.',
          inputSchema: {
            type: 'object',
            properties: { alertId: { type: 'string' } },
            required: ['alertId'],
          },
        },
        {
          name: 'monitoring_resolve_alert',
          description: 'Resolve a monitoring alert.',
          inputSchema: {
            type: 'object',
            properties: { alertId: { type: 'string' }, resolvedBy: { type: 'string' } },
            required: ['alertId'],
          },
        },
        {
          name: 'monitoring_escalate_alert',
          description: 'Escalate a monitoring alert (increases severity and escalation level).',
          inputSchema: {
            type: 'object',
            properties: { alertId: { type: 'string' } },
            required: ['alertId'],
          },
        },
        {
          name: 'monitoring_get_health',
          description: 'Get overall project health: active alerts, quality scores, recent deployments, health status.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'monitoring_cleanup_alerts',
          description: 'Delete old resolved alerts (default: older than 30 days).',
          inputSchema: {
            type: 'object',
            properties: { olderThanDays: { type: 'number' } },
          },
        },
        // HANDOFF
        {
          name: 'handoff_create',
          description: 'Create a client handoff package for a project.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              version: { type: 'string', description: 'Handoff version (default 1.0)' },
              supportDays: { type: 'number', description: 'Days of post-handoff support (default 30)' },
            },
            required: ['projectId'],
          },
        },
        {
          name: 'handoff_generate_all_docs',
          description: 'AI-generate ALL client handoff documents: overview, architecture, API docs, deployment guide, maintenance guide, troubleshooting, security notes, cost estimate.',
          inputSchema: {
            type: 'object',
            properties: { projectId: { type: 'string' } },
            required: ['projectId'],
          },
        },
        {
          name: 'handoff_deliver',
          description: 'Mark a handoff as delivered to the client. Starts the support period.',
          inputSchema: {
            type: 'object',
            properties: { handoffId: { type: 'string' } },
            required: ['handoffId'],
          },
        },
        {
          name: 'handoff_accept',
          description: 'Record client acceptance of a handoff with optional feedback and rating.',
          inputSchema: {
            type: 'object',
            properties: {
              handoffId: { type: 'string' },
              feedback: { type: 'string', description: 'Client feedback text' },
              rating: { type: 'number', description: 'Client rating 1-5 stars' },
            },
            required: ['handoffId'],
          },
        },
        {
          name: 'handoff_get',
          description: 'Get a handoff with project relation.',
          inputSchema: {
            type: 'object',
            properties: { handoffId: { type: 'string' } },
            required: ['handoffId'],
          },
        },
        {
          name: 'handoff_list',
          description: 'List handoffs with optional filters.',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              status: { type: 'string', description: 'draft, review, delivered, accepted' },
              limit: { type: 'number' },
            },
          },
        },
      ],
      async (toolName: string, args: Record<string, unknown>) => {
        try {
          const baseUrl = this._getBaseUrl();
          const actionMap: Record<string, string> = {
            project_create: 'create_project',
            project_get: 'get_project',
            project_list: 'list_projects',
            project_update_status: 'update_project_status',
            project_update_quality: 'update_quality',
            project_generate_brief: 'generate_brief',
            project_generate_architecture: 'generate_architecture',
            project_generate_roadmap: 'generate_roadmap',
            project_archive: 'archive_project',
            project_delete: 'delete_project',
            deployment_create: 'create_deployment',
            deployment_update: 'update_deployment',
            deployment_record_metrics: 'record_build_metrics',
            deployment_generate_pipeline: 'generate_pipeline',
            deployment_history: 'deployment_history',
            deployment_rollback: 'rollback_deployment',
            monitoring_create_alert: 'create_alert',
            monitoring_get_alerts: 'get_alerts',
            monitoring_check_uptime: 'check_uptime',
            monitoring_security_scan: 'run_security_scan',
            monitoring_performance_audit: 'run_performance_audit',
            monitoring_acknowledge_alert: 'acknowledge_alert',
            monitoring_resolve_alert: 'resolve_alert',
            monitoring_escalate_alert: 'escalate_alert',
            monitoring_get_health: 'get_project_health',
            monitoring_cleanup_alerts: 'cleanup_alerts',
            handoff_create: 'create_handoff',
            handoff_generate_all_docs: 'generate_all_docs',
            handoff_deliver: 'deliver_handoff',
            handoff_accept: 'accept_handoff',
            handoff_get: 'get_handoff',
            handoff_list: 'list_handoffs',
          };

          const action = actionMap[toolName];
          if (!action) throw new Error(`Unknown project hub tool: ${toolName}`);

          const res = await fetch(`${baseUrl}/api/hub/project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-internal-token': process.env.INTERNAL_API_SECRET || '' },
            body: JSON.stringify({ action, ...args }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Project Hub error: ${res.status}`);
          return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        } catch (e) {
          return { content: [{ type: 'text', text: `Project Hub error: ${(e as Error).message}` }] };
        }
      }
    );
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────
// Exported once — shared across all requests in the same process.
export const mcpManager = new MCPClientManager();

// ─── Tool Health Monitor (Phase A wiring) ──────────────────────────────────
export const toolHealthMonitor = new ToolHealthMonitor(DEFAULT_HEALTH_CONFIG);
