import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface MCPTool {
    serverId: string;
    name: string;
    description: string;
    inputSchema: any;
}

export class MCPClientManager {
    private clients: Map<string, Client> = new Map();

    async connectStdio(serverId: string, command: string, args: string[], env?: Record<string, string>) {
        if (this.clients.has(serverId)) return;

        const transport = new StdioClientTransport({
            command,
            args,
            env: { ...process.env, ...env } as Record<string, string>
        });

        const client = new Client({
            name: "holly-mcp-client",
            version: "1.0.0"
        }, {
            capabilities: {}
        });

        await client.connect(transport);
        this.clients.set(serverId, client);
        console.log(`[MCP] Connected to ${serverId} via stdio`);
    }

    async connectSSE(serverId: string, url: string) {
        if (this.clients.has(serverId)) return;

        const endpoint = new URL(url);
        const transport = new SSEClientTransport(endpoint);

        const client = new Client({
            name: "holly-mcp-client",
            version: "1.0.0"
        }, {
            capabilities: {}
        });

        await client.connect(transport);
        this.clients.set(serverId, client);
        console.log(`[MCP] Connected to ${serverId} via SSE`);
    }

    async disconnect(serverId: string) {
        const client = this.clients.get(serverId);
        if (client) {
            await client.close();
            this.clients.delete(serverId);
            console.log(`[MCP] Disconnected from ${serverId}`);
        }
    }

    async getAllTools(): Promise<MCPTool[]> {
        const allTools: MCPTool[] = [];

        for (const [serverId, client] of this.clients.entries()) {
            try {
                const result = await client.listTools();
                const tools = result.tools.map(tool => ({
                    serverId,
                    name: tool.name,
                    description: tool.description || '',
                    inputSchema: tool.inputSchema
                }));
                allTools.push(...tools);
            } catch (err) {
                console.error(`[MCP] Failed to get tools for ${serverId}:`, err);
            }
        }

        return allTools;
    }

    async callTool(serverId: string, toolName: string, args: any) {
        const client = this.clients.get(serverId);
        if (!client) {
            throw new Error(`[MCP] Client ${serverId} not found`);
        }

        const result = await client.callTool({
            name: toolName,
            arguments: args
        });

        return result;
    }
}

// Global instance for singleton use in API routes
export const mcpManager = new MCPClientManager();
