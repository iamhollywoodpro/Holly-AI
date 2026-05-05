import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
    name: "weather-mcp",
    version: "1.0.0"
}, {
    capabilities: {
        tools: {}
    }
});

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_weather",
                description: "Get the current weather for a city",
                inputSchema: {
                    type: "object",
                    properties: {
                        city: { type: "string" }
                    },
                    required: ["city"]
                }
            }
        ]
    };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_weather") {
        const city = request.params.arguments?.city;
        // Mock weather data
        const weather = `The weather in ${city} is currently 72°F and sunny with a slight breeze.`;

        return {
            content: [
                {
                    type: "text",
                    text: weather
                }
            ]
        };
    }

    throw new Error(`Tool not found: ${request.params.name}`);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Mock MCP Server running on stdio");
}

main().catch(console.error);
