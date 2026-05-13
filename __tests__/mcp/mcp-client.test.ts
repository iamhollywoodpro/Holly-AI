/// <reference types="jest" />

/**
 * Phase 2.7 — MCP Tools Test Suite
 *
 * Tests the MCPClientManager class and validates the MCP server
 * tool definitions for schema completeness and correctness.
 */

import { MCPClientManager, MCPTool } from '@/lib/mcp/mcp-client';
import fs from 'fs';
import path from 'path';

// ── Mock the MCP SDK ────────────────────────────────────────────────────────
const mockClientInstances: any[] = [];

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => {
    const instance = {
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      listTools: jest.fn().mockResolvedValue({ tools: [] }),
      callTool: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] }),
    };
    mockClientInstances.push(instance);
    return instance;
  }),
}));

jest.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn().mockImplementation(() => ({})),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse tool definitions from holly-mcp-server.js source.
 * Extracts name, description, inputSchema, and required fields.
 */
function parseServerTools(): Array<{
  name: string;
  description: string;
  inputSchema: any;
  required: string[];
}> {
  const serverPath = path.resolve(process.cwd(), 'scripts', 'holly-mcp-server.js');
  const source = fs.readFileSync(serverPath, 'utf-8');

  // Extract the tools array from ListToolsRequestSchema handler
  const toolsMatch = source.match(/tools:\s*\[([\s\S]*?)\n\s*\]\s*\}\)\)\s*;/);
  if (!toolsMatch) throw new Error('Could not parse tools from server source');

  const toolsBlock = toolsMatch[1];

  // Split into individual tool objects by matching top-level { name: ... } blocks
  const toolObjects: Array<{
    name: string;
    description: string;
    inputSchema: any;
    required: string[];
  }> = [];

  // Match each tool definition: { name: "...", description: "...", inputSchema: { ... } }
  const toolRegex = /\{\s*name:\s*["']([^"']+)["'],\s*\n\s*description:\s*["'`]([^"'`]*?)["'`]/g;
  let match;
  while ((match = toolRegex.exec(toolsBlock)) !== null) {
    const name = match[1];
    const description = match[2];

    // Extract required fields for this tool
    const toolStart = match.index;
    // Find the closing of this tool object (next tool or end of array)
    const nextTool = toolRegex.exec(toolsBlock);
    const toolEnd = nextTool ? nextTool.index : toolsBlock.length;
    toolRegex.lastIndex = match.index + match[0].length; // Reset for next iteration

    const toolBlock = toolsBlock.substring(toolStart, toolEnd);

    // Extract required array
    const requiredMatch = toolBlock.match(/required:\s*\[([^\]]*)\]/);
    const required = requiredMatch
      ? requiredMatch[1]
          .split(',')
          .map((s) => s.trim().replace(/['"]/g, ''))
          .filter(Boolean)
      : [];

    // Extract properties
    const propertiesMatch = toolBlock.match(/properties:\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/);

    toolObjects.push({
      name,
      description,
      inputSchema: {
        type: 'object',
        properties: propertiesMatch ? propertiesMatch[1] : null,
      },
      required,
    });
  }

  return toolObjects;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: MCPClientManager
// ═══════════════════════════════════════════════════════════════════════════════

describe('MCPClientManager', () => {
  let manager: MCPClientManager;

  beforeEach(() => {
    manager = new MCPClientManager();
    mockClientInstances.length = 0;
  });

  // ── registerHttpServer ────────────────────────────────────────────────────

  describe('registerHttpServer', () => {
    it('should register an HTTP server with tools', () => {
      const tools = [
        { name: 'test_tool', description: 'A test tool', inputSchema: { type: 'object' as const, properties: {} } },
      ];
      const handler = jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });

      manager.registerHttpServer('test-server', tools, handler);

      expect(manager.isConnected('test-server')).toBe(true);
    });

    it('should not duplicate if same serverId is registered twice', async () => {
      const tools = [
        { name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' as const, properties: {} } },
      ];
      const handler = jest.fn();

      manager.registerHttpServer('dup-server', tools, handler);
      manager.registerHttpServer('dup-server', tools, handler);

      // Should only appear once in getAllTools
      const allTools = await manager.getAllTools();
      const serverTools = allTools.filter((t) => t.serverId === 'dup-server');
      expect(serverTools).toHaveLength(1);
    });

    it('should register multiple different servers', () => {
      const tools1 = [
        { name: 'tool_a', description: 'Tool A', inputSchema: { type: 'object' as const, properties: {} } },
      ];
      const tools2 = [
        { name: 'tool_b', description: 'Tool B', inputSchema: { type: 'object' as const, properties: {} } },
      ];
      const handler = jest.fn();

      manager.registerHttpServer('server-a', tools1, handler);
      manager.registerHttpServer('server-b', tools2, handler);

      expect(manager.isConnected('server-a')).toBe(true);
      expect(manager.isConnected('server-b')).toBe(true);
    });
  });

  // ── isConnected ───────────────────────────────────────────────────────────

  describe('isConnected', () => {
    it('should return false for unknown server', () => {
      expect(manager.isConnected('nonexistent')).toBe(false);
    });

    it('should return true for registered HTTP server', () => {
      manager.registerHttpServer(
        'known-server',
        [{ name: 'tool', description: 'desc', inputSchema: { type: 'object' as const, properties: {} } }],
        jest.fn()
      );
      expect(manager.isConnected('known-server')).toBe(true);
    });
  });

  // ── getAllTools ───────────────────────────────────────────────────────────

  describe('getAllTools', () => {
    it('should return empty array when no servers connected', async () => {
      const tools = await manager.getAllTools();
      expect(tools).toEqual([]);
    });

    it('should return tools from registered HTTP servers', async () => {
      const tools = [
        {
          name: 'aura_analyze',
          description: 'Analyze music',
          inputSchema: { type: 'object' as const, properties: { title: { type: 'string' } } },
        },
        {
          name: 'aura_recommend',
          description: 'Recommend improvements',
          inputSchema: { type: 'object' as const, properties: { genre: { type: 'string' } } },
        },
      ];
      manager.registerHttpServer('aura-hub', tools, jest.fn());

      const allTools = await manager.getAllTools();

      expect(allTools).toHaveLength(2);
      expect(allTools[0]).toMatchObject({
        serverId: 'aura-hub',
        name: 'aura_analyze',
        description: 'Analyze music',
      });
      expect(allTools[1]).toMatchObject({
        serverId: 'aura-hub',
        name: 'aura_recommend',
        description: 'Recommend improvements',
      });
    });

    it('should merge tools from multiple HTTP servers', async () => {
      const auraTools = [
        { name: 'aura_tool', description: 'AURA', inputSchema: { type: 'object' as const, properties: {} } },
      ];
      const sentinelTools = [
        { name: 'sentinel_tool', description: 'Sentinel', inputSchema: { type: 'object' as const, properties: {} } },
      ];

      manager.registerHttpServer('aura-hub', auraTools, jest.fn());
      manager.registerHttpServer('sentinel-hub', sentinelTools, jest.fn());

      const allTools = await manager.getAllTools();
      expect(allTools).toHaveLength(2);
      expect(allTools.map((t) => t.serverId).sort()).toEqual(['aura-hub', 'sentinel-hub']);
    });

    it('should include serverId in each tool', async () => {
      manager.registerHttpServer(
        'my-server',
        [{ name: 't1', description: 'Tool 1', inputSchema: { type: 'object' as const, properties: {} } }],
        jest.fn()
      );

      const tools = await manager.getAllTools();
      expect(tools[0].serverId).toBe('my-server');
    });

    it('should preserve inputSchema in tools', async () => {
      const schema = {
        type: 'object' as const,
        properties: {
          code: { type: 'string', description: 'Source code' },
          language: { type: 'string', description: 'Language' },
        },
        required: ['code', 'language'],
      };
      manager.registerHttpServer(
        'code-server',
        [{ name: 'analyze', description: 'Analyze code', inputSchema: schema }],
        jest.fn()
      );

      const tools = await manager.getAllTools();
      expect(tools[0].inputSchema).toEqual(schema);
    });
  });

  // ── callTool ──────────────────────────────────────────────────────────────

  describe('callTool', () => {
    it('should route to HTTP server callHandler', async () => {
      const handler = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"score": 95}' }],
      });
      manager.registerHttpServer(
        'test-hub',
        [{ name: 'my_tool', description: 'desc', inputSchema: { type: 'object' as const, properties: {} } }],
        handler
      );

      const result = await manager.callTool('test-hub', 'my_tool', { key: 'value' });

      expect(handler).toHaveBeenCalledWith('my_tool', { key: 'value' });
      expect(result).toEqual({ content: [{ type: 'text', text: '{"score": 95}' }] });
    });

    it('should throw for unknown server', async () => {
      await expect(manager.callTool('unknown', 'tool', {})).rejects.toThrow(
        'Client unknown not connected'
      );
    });

    it('should pass through handler errors gracefully', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Network timeout'));
      manager.registerHttpServer(
        'failing-hub',
        [{ name: 'tool', description: 'desc', inputSchema: { type: 'object' as const, properties: {} } }],
        handler
      );

      await expect(manager.callTool('failing-hub', 'tool', {})).rejects.toThrow('Network timeout');
    });
  });

  // ── connectStdio build guard ──────────────────────────────────────────────

  describe('connectStdio', () => {
    it('should skip during Next.js build phase', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      process.env.NEXT_PHASE = 'phase-production-build';

      try {
        await manager.connectStdio('build-test', 'node', ['test.js']);
        expect(manager.isConnected('build-test')).toBe(false);
      } finally {
        process.env.NEXT_PHASE = originalPhase;
      }
    });

    it('should skip during Docker build phase', async () => {
      const originalDocker = process.env.DOCKER_BUILD;
      process.env.DOCKER_BUILD = 'true';

      try {
        await manager.connectStdio('docker-test', 'node', ['test.js']);
        expect(manager.isConnected('docker-test')).toBe(false);
      } finally {
        process.env.DOCKER_BUILD = originalDocker;
      }
    });
  });

  // ── ensureHollyTools build guard ──────────────────────────────────────────

  describe('ensureHollyTools', () => {
    it('should skip during Docker build phase', async () => {
      const originalDocker = process.env.DOCKER_BUILD;
      process.env.DOCKER_BUILD = 'true';

      try {
        await manager.ensureHollyTools();
        // Should not have registered any HTTP servers
        expect(manager.isConnected('aura-hub')).toBe(false);
        expect(manager.isConnected('sentinel-hub')).toBe(false);
        expect(manager.isConnected('github-hub')).toBe(false);
      } finally {
        process.env.DOCKER_BUILD = originalDocker;
      }
    });

    it('should skip during Next.js build phase', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      process.env.NEXT_PHASE = 'phase-production-build';

      try {
        await manager.ensureHollyTools();
        expect(manager.isConnected('aura-hub')).toBe(false);
      } finally {
        process.env.NEXT_PHASE = originalPhase;
      }
    });

    it('should register HTTP hubs when not in build phase', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      const originalDocker = process.env.DOCKER_BUILD;
      delete process.env.NEXT_PHASE;
      delete process.env.DOCKER_BUILD;

      try {
        // Mock connectStdio to prevent actual subprocess spawn
        const connectSpy = jest.spyOn(manager, 'connectStdio').mockResolvedValue(undefined);

        await manager.ensureHollyTools();

        // HTTP hubs should be registered
        expect(manager.isConnected('aura-hub')).toBe(true);
        expect(manager.isConnected('sentinel-hub')).toBe(true);
        expect(manager.isConnected('github-hub')).toBe(true);

        connectSpy.mockRestore();
      } finally {
        process.env.NEXT_PHASE = originalPhase;
        process.env.DOCKER_BUILD = originalDocker;
      }
    });

    it('should only initialize once (idempotent)', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      const originalDocker = process.env.DOCKER_BUILD;
      delete process.env.NEXT_PHASE;
      delete process.env.DOCKER_BUILD;

      try {
        const connectSpy = jest.spyOn(manager, 'connectStdio').mockResolvedValue(undefined);

        await manager.ensureHollyTools();
        await manager.ensureHollyTools(); // Second call should be no-op

        // connectStdio should only have been called once
        expect(connectSpy).toHaveBeenCalledTimes(1);

        connectSpy.mockRestore();
      } finally {
        process.env.NEXT_PHASE = originalPhase;
        process.env.DOCKER_BUILD = originalDocker;
      }
    });
  });

  // ── disconnect ────────────────────────────────────────────────────────────

  describe('disconnect', () => {
    it('should handle disconnect of non-existent client gracefully', async () => {
      // Should not throw
      await expect(manager.disconnect('nonexistent')).resolves.toBeUndefined();
    });
  });

  // ── HTTP Hub Tool Counts ──────────────────────────────────────────────────

  describe('HTTP Hub Registration', () => {
    it('should register aura-hub with 3 tools', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      const originalDocker = process.env.DOCKER_BUILD;
      delete process.env.NEXT_PHASE;
      delete process.env.DOCKER_BUILD;

      try {
        jest.spyOn(manager, 'connectStdio').mockResolvedValue(undefined);
        await manager.ensureHollyTools();

        const allTools = await manager.getAllTools();
        const auraTools = allTools.filter((t) => t.serverId === 'aura-hub');
        expect(auraTools).toHaveLength(3);

        const auraNames = auraTools.map((t) => t.name).sort();
        expect(auraNames).toEqual([
          'aura_analyze_song',
          'aura_generate_recommendations',
          'aura_identify_hit_potential',
        ]);
      } finally {
        process.env.NEXT_PHASE = originalPhase;
        process.env.DOCKER_BUILD = originalDocker;
      }
    });

    it('should register sentinel-hub with 2 tools', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      const originalDocker = process.env.DOCKER_BUILD;
      delete process.env.NEXT_PHASE;
      delete process.env.DOCKER_BUILD;

      try {
        jest.spyOn(manager, 'connectStdio').mockResolvedValue(undefined);
        await manager.ensureHollyTools();

        const allTools = await manager.getAllTools();
        const sentinelTools = allTools.filter((t) => t.serverId === 'sentinel-hub');
        expect(sentinelTools).toHaveLength(2);

        const sentinelNames = sentinelTools.map((t) => t.name).sort();
        expect(sentinelNames).toEqual([
          'sentinel_analyze_code',
          'sentinel_generate_code',
        ]);
      } finally {
        process.env.NEXT_PHASE = originalPhase;
        process.env.DOCKER_BUILD = originalDocker;
      }
    });

    it('should register github-hub with 7 tools', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      const originalDocker = process.env.DOCKER_BUILD;
      delete process.env.NEXT_PHASE;
      delete process.env.DOCKER_BUILD;

      try {
        jest.spyOn(manager, 'connectStdio').mockResolvedValue(undefined);
        await manager.ensureHollyTools();

        const allTools = await manager.getAllTools();
        const githubTools = allTools.filter((t) => t.serverId === 'github-hub');
        expect(githubTools).toHaveLength(7);

        const githubNames = githubTools.map((t) => t.name).sort();
        expect(githubNames).toEqual([
          'github_create_issue',
          'github_create_or_update_file',
          'github_create_pr',
          'github_get_commits',
          'github_list_files',
          'github_list_prs',
          'github_read_file',
        ]);
      } finally {
        process.env.NEXT_PHASE = originalPhase;
        process.env.DOCKER_BUILD = originalDocker;
      }
    });
  });

  // ── AURA Hub Call Routing ─────────────────────────────────────────────────

  describe('AURA Hub Call Routing', () => {
    it('should return error for unknown AURA action', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      const originalDocker = process.env.DOCKER_BUILD;
      delete process.env.NEXT_PHASE;
      delete process.env.DOCKER_BUILD;

      try {
        jest.spyOn(manager, 'connectStdio').mockResolvedValue(undefined);
        await manager.ensureHollyTools();

        // Call with an unknown tool name
        const result = (await manager.callTool('aura-hub', 'unknown_action', {})) as any;
        expect(result.content[0].text).toContain('Unknown AURA action');
      } finally {
        process.env.NEXT_PHASE = originalPhase;
        process.env.DOCKER_BUILD = originalDocker;
      }
    });
  });

  // ── Sentinel Hub Call Routing ─────────────────────────────────────────────

  describe('Sentinel Hub Call Routing', () => {
    it('should return error for unknown Sentinel action', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      const originalDocker = process.env.DOCKER_BUILD;
      delete process.env.NEXT_PHASE;
      delete process.env.DOCKER_BUILD;

      try {
        jest.spyOn(manager, 'connectStdio').mockResolvedValue(undefined);
        await manager.ensureHollyTools();

        const result = (await manager.callTool('sentinel-hub', 'bad_action', {})) as any;
        expect(result.content[0].text).toContain('Unknown Sentinel action');
      } finally {
        process.env.NEXT_PHASE = originalPhase;
        process.env.DOCKER_BUILD = originalDocker;
      }
    });
  });

  // ── GitHub Hub Tool Schemas ───────────────────────────────────────────────

  describe('GitHub Hub Tool Schemas', () => {
    it('should have required fields on critical tools', async () => {
      const originalPhase = process.env.NEXT_PHASE;
      const originalDocker = process.env.DOCKER_BUILD;
      delete process.env.NEXT_PHASE;
      delete process.env.DOCKER_BUILD;

      try {
        jest.spyOn(manager, 'connectStdio').mockResolvedValue(undefined);
        await manager.ensureHollyTools();

        const allTools = await manager.getAllTools();
        const githubTools = allTools.filter((t) => t.serverId === 'github-hub');

        // github_read_file requires 'path'
        const readFile = githubTools.find((t) => t.name === 'github_read_file')!;
        expect(readFile.inputSchema.required).toContain('path');

        // github_create_or_update_file requires 'path', 'content', 'message'
        const writeFile = githubTools.find((t) => t.name === 'github_create_or_update_file')!;
        expect(writeFile.inputSchema.required).toEqual(
          expect.arrayContaining(['path', 'content', 'message'])
        );

        // github_create_pr requires 'title', 'head'
        const createPr = githubTools.find((t) => t.name === 'github_create_pr')!;
        expect(createPr.inputSchema.required).toEqual(
          expect.arrayContaining(['title', 'head'])
        );

        // github_create_issue requires 'title'
        const createIssue = githubTools.find((t) => t.name === 'github_create_issue')!;
        expect(createIssue.inputSchema.required).toContain('title');
      } finally {
        process.env.NEXT_PHASE = originalPhase;
        process.env.DOCKER_BUILD = originalDocker;
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: MCP Server Tool Definitions (Schema Validation)
// ═══════════════════════════════════════════════════════════════════════════════

describe('MCP Server Tool Definitions', () => {
  let tools: ReturnType<typeof parseServerTools>;

  beforeAll(() => {
    tools = parseServerTools();
  });

  // ── Tool Count ────────────────────────────────────────────────────────────

  describe('Tool Inventory', () => {
    it('should have at least 25 tools defined', () => {
      expect(tools.length).toBeGreaterThanOrEqual(25);
    });

    it('should have unique tool names', () => {
      const names = tools.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should include all critical GitHub tools', () => {
      const githubTools = tools.filter((t) => t.name.startsWith('github_'));
      const requiredGithubTools = [
        'github_read_file',
        'github_list_files',
        'github_create_or_update_file',
        'github_create_pr',
        'github_create_issue',
        'github_list_prs',
        'github_get_commits',
      ];
      const githubNames = githubTools.map((t) => t.name);
      for (const req of requiredGithubTools) {
        expect(githubNames).toContain(req);
      }
    });

    it('should include local file operation tools', () => {
      const localTools = tools.filter((t) => t.name.startsWith('local_'));
      const requiredLocalTools = [
        'local_read_file',
        'local_write_file',
        'local_list_dir',
        'local_run_command',
      ];
      const localNames = localTools.map((t) => t.name);
      for (const req of requiredLocalTools) {
        expect(localNames).toContain(req);
      }
    });

    it('should include web intelligence tools', () => {
      const webTools = tools.filter((t) => t.name.startsWith('web_'));
      expect(webTools.map((t) => t.name)).toContain('web_search');
      expect(webTools.map((t) => t.name)).toContain('web_scrape');
    });

    it('should include memory tools', () => {
      const memoryTools = tools.filter((t) => t.name.startsWith('memory_'));
      const requiredMemoryTools = ['memory_write', 'memory_read', 'memory_list_keys'];
      const memoryNames = memoryTools.map((t) => t.name);
      for (const req of requiredMemoryTools) {
        expect(memoryNames).toContain(req);
      }
    });

    it('should include AURA A&R tools', () => {
      const auraTools = tools.filter((t) => t.name.startsWith('aura_'));
      expect(auraTools.length).toBeGreaterThanOrEqual(2);
    });

    it('should include Sentinel code intelligence tools', () => {
      const sentinelTools = tools.filter((t) => t.name.startsWith('sentinel_'));
      expect(sentinelTools.map((t) => t.name)).toContain('sentinel_analyze_code');
      expect(sentinelTools.map((t) => t.name)).toContain('sentinel_generate_code');
    });

    it('should include self-diagnostic tools', () => {
      expect(tools.map((t) => t.name)).toContain('diagnostic_check');
      expect(tools.map((t) => t.name)).toContain('read_logs');
    });

    it('should include Graphify knowledge graph tools', () => {
      const graphifyTools = tools.filter((t) => t.name.startsWith('graphify_'));
      expect(graphifyTools.map((t) => t.name)).toContain('graphify_query');
      expect(graphifyTools.map((t) => t.name)).toContain('graphify_path');
      expect(graphifyTools.map((t) => t.name)).toContain('graphify_explain');
    });

    it('should include creative and utility tools', () => {
      const utilityNames = ['generate_image', 'get_weather', 'generate_music', 'hybrid_studio'];
      const toolNames = tools.map((t) => t.name);
      for (const name of utilityNames) {
        expect(toolNames).toContain(name);
      }
    });

    it('should include emotional intelligence tools', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('emotional_support');
      expect(toolNames).toContain('analyze_language');
    });

    it('should include self-evolution tools', () => {
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('web_research_ai_tools');
      expect(toolNames).toContain('self_evolve_search');
    });
  });

  // ── Schema Completeness ───────────────────────────────────────────────────

  describe('Schema Completeness', () => {
    it('every tool should have a non-empty name', () => {
      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.name.length).toBeGreaterThan(0);
      }
    });

    it('every tool should have a non-empty description', () => {
      for (const tool of tools) {
        expect(tool.description).toBeTruthy();
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });

    it('every tool should have a name matching snake_case pattern', () => {
      const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
      for (const tool of tools) {
        expect(tool.name).toMatch(snakeCaseRegex);
      }
    });

    it('tools with required fields should have matching properties', () => {
      for (const tool of tools) {
        if (tool.required.length > 0) {
          // If there are required fields, the tool must have properties defined
          expect(tool.inputSchema.properties).not.toBeNull();
        }
      }
    });
  });

  // ── Critical Tool Schemas ─────────────────────────────────────────────────

  describe('Critical Tool Schemas', () => {
    it('github_read_file should require path', () => {
      const tool = tools.find((t) => t.name === 'github_read_file')!;
      expect(tool.required).toContain('path');
    });

    it('github_create_or_update_file should require path, content, message', () => {
      const tool = tools.find((t) => t.name === 'github_create_or_update_file')!;
      expect(tool.required.sort()).toEqual(['content', 'message', 'path']);
    });

    it('github_create_pr should require title and head', () => {
      const tool = tools.find((t) => t.name === 'github_create_pr')!;
      expect(tool.required.sort()).toEqual(['head', 'title']);
    });

    it('github_create_issue should require title', () => {
      const tool = tools.find((t) => t.name === 'github_create_issue')!;
      expect(tool.required).toContain('title');
    });

    it('web_search should require query', () => {
      const tool = tools.find((t) => t.name === 'web_search')!;
      expect(tool.required).toContain('query');
    });

    it('web_scrape should require url', () => {
      const tool = tools.find((t) => t.name === 'web_scrape')!;
      expect(tool.required).toContain('url');
    });

    it('run_code should require code', () => {
      const tool = tools.find((t) => t.name === 'run_code')!;
      expect(tool.required).toContain('code');
    });

    it('run_code_judge0 should require source_code', () => {
      const tool = tools.find((t) => t.name === 'run_code_judge0')!;
      expect(tool.required).toContain('source_code');
    });

    it('memory_write should require key and value', () => {
      const tool = tools.find((t) => t.name === 'memory_write')!;
      expect(tool.required.sort()).toEqual(['key', 'value']);
    });

    it('memory_read should require key', () => {
      const tool = tools.find((t) => t.name === 'memory_read')!;
      expect(tool.required).toContain('key');
    });

    it('generate_image should require prompt', () => {
      const tool = tools.find((t) => t.name === 'generate_image')!;
      expect(tool.required).toContain('prompt');
    });

    it('generate_music should require prompt', () => {
      const tool = tools.find((t) => t.name === 'generate_music')!;
      expect(tool.required).toContain('prompt');
    });

    it('sentinel_analyze_code should require code and language', () => {
      const tool = tools.find((t) => t.name === 'sentinel_analyze_code')!;
      expect(tool.required.sort()).toEqual(['code', 'language']);
    });

    it('sentinel_generate_code should require description and language', () => {
      const tool = tools.find((t) => t.name === 'sentinel_generate_code')!;
      expect(tool.required.sort()).toEqual(['description', 'language']);
    });

    it('diagnostic_check should have no required fields', () => {
      const tool = tools.find((t) => t.name === 'diagnostic_check')!;
      expect(tool.required).toEqual([]);
    });

    it('local_run_command should require command', () => {
      const tool = tools.find((t) => t.name === 'local_run_command')!;
      expect(tool.required).toContain('command');
    });

    it('local_read_file should require path', () => {
      const tool = tools.find((t) => t.name === 'local_read_file')!;
      expect(tool.required).toContain('path');
    });

    it('local_write_file should require path and content', () => {
      const tool = tools.find((t) => t.name === 'local_write_file')!;
      expect(tool.required.sort()).toEqual(['content', 'path']);
    });

    it('aura_ar_analyze should require audioUrl and fileName', () => {
      const tool = tools.find((t) => t.name === 'aura_ar_analyze')!;
      expect(tool.required.sort()).toEqual(['audioUrl', 'fileName']);
    });

    it('emotional_support should require situation', () => {
      const tool = tools.find((t) => t.name === 'emotional_support')!;
      expect(tool.required).toContain('situation');
    });

    it('analyze_language should require message', () => {
      const tool = tools.find((t) => t.name === 'analyze_language')!;
      expect(tool.required).toContain('message');
    });

    it('graphify_query should require query', () => {
      const tool = tools.find((t) => t.name === 'graphify_query')!;
      expect(tool.required).toContain('query');
    });

    it('graphify_path should require from and to', () => {
      const tool = tools.find((t) => t.name === 'graphify_path')!;
      expect(tool.required.sort()).toEqual(['from', 'to']);
    });

    it('graphify_explain should require concept', () => {
      const tool = tools.find((t) => t.name === 'graphify_explain')!;
      expect(tool.required).toContain('concept');
    });

    it('self_evolve_search should require area', () => {
      const tool = tools.find((t) => t.name === 'self_evolve_search')!;
      expect(tool.required).toContain('area');
    });
  });

  // ── Tool Groups ───────────────────────────────────────────────────────────

  describe('Tool Group Coverage', () => {
    it('should have tools from at least 10 functional groups', () => {
      const prefixes = new Set(tools.map((t) => t.name.split('_')[0]));
      // Expected prefixes: github, local, web, run, memory, aura, generate,
      // get, hybrid, philosophy, creative, emotional, analyze, sentinel,
      // self, diagnostic, read, mirror, graphify
      expect(prefixes.size).toBeGreaterThanOrEqual(10);
    });

    it('should categorize tools by group correctly', () => {
      const groups: Record<string, string[]> = {
        github: tools.filter((t) => t.name.startsWith('github_')).map((t) => t.name),
        local: tools.filter((t) => t.name.startsWith('local_')).map((t) => t.name),
        web: tools.filter((t) => t.name.startsWith('web_')).map((t) => t.name),
        memory: tools.filter((t) => t.name.startsWith('memory_')).map((t) => t.name),
        sentinel: tools.filter((t) => t.name.startsWith('sentinel_')).map((t) => t.name),
        graphify: tools.filter((t) => t.name.startsWith('graphify_')).map((t) => t.name),
      };

      // GitHub group should have 7 tools
      expect(groups.github).toHaveLength(7);

      // Local group should have 4 tools
      expect(groups.local).toHaveLength(4);

      // Memory group should have 3 tools
      expect(groups.memory).toHaveLength(3);

      // Sentinel group should have 2 tools
      expect(groups.sentinel).toHaveLength(2);

      // Graphify group should have 3 tools
      expect(groups.graphify).toHaveLength(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: MCPTool Interface Compliance
// ═══════════════════════════════════════════════════════════════════════════════

describe('MCPTool Interface', () => {
  it('should have serverId, name, description, and inputSchema fields', async () => {
    const manager = new MCPClientManager();
    manager.registerHttpServer(
      'test-server',
      [
        {
          name: 'test_tool',
          description: 'Test description',
          inputSchema: {
            type: 'object',
            properties: { input: { type: 'string' } },
            required: ['input'],
          },
        },
      ],
      jest.fn()
    );

    const tools = await manager.getAllTools();
    const tool = tools[0];

    expect(tool).toHaveProperty('serverId', 'test-server');
    expect(tool).toHaveProperty('name', 'test_tool');
    expect(tool).toHaveProperty('description', 'Test description');
    expect(tool).toHaveProperty('inputSchema');
    expect(tool.inputSchema).toHaveProperty('type', 'object');
    expect(tool.inputSchema).toHaveProperty('properties');
  });
});
