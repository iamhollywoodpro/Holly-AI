/**
 * HOLLY MCP Client Manager
 *
 * Manages Model Context Protocol connections to tool servers.
 * The singleton mcpManager is initialised once at module load (not per request)
 * so we never leak stdio processes.
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

export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private connecting: Map<string, Promise<void>> = new Map();
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

    const endpoint = new URL(url);
    const transport = new SSEClientTransport(endpoint);

    const client = new Client(
      { name: "holly-mcp-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
    this.clients.set(serverId, client);
    console.log(`[MCP] ✅ Connected to ${serverId} via SSE`);
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
   * Initialise the real HOLLY tool server once.
   * Called at module load — no-op if already done.
   */
  async ensureHollyTools(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const serverPath = path.resolve(process.cwd(), "scripts", "holly-mcp-server.js");
      await this.connectStdio("holly-tools", "node", [serverPath]);
    } catch (err) {
      console.warn("[MCP] ⚠️ Could not connect to holly-tools server:", (err as Error).message);
      this.initialized = false; // Allow retry on next request
    }
  }

  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

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

    return allTools;
  }

  async callTool(serverId: string, toolName: string, args: any): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`[MCP] Client ${serverId} not connected`);
    }

    const result = await client.callTool({ name: toolName, arguments: args });
    return result;
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────
// Exported once — shared across all requests in the same process.
export const mcpManager = new MCPClientManager();
