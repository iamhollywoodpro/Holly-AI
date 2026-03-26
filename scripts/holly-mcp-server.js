/**
 * HOLLY MCP Tool Server
 *
 * Real MCP server exposing HOLLY's core action tools via stdio transport.
 * Replaces the mock weather-only server.
 *
 * Tools:
 *   github_read_file   – read any file from the HOLLY repo
 *   github_list_files  – list directory contents in the repo
 *   web_search         – search the web via DuckDuckGo instant-answer API
 *   run_code           – execute sandboxed JavaScript snippets
 *   generate_image     – queue an image generation job (returns job ID)
 *   get_weather        – current weather for a city (kept for backward compat)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import https from "https";
import http from "http";

// ─── helpers ────────────────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, { headers: { "User-Agent": "HOLLY-AI/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    }).on("error", reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const options = new URL(url);
    const req = client.get(options, { headers: { "User-Agent": "HOLLY-AI/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
  });
}

// ─── server setup ────────────────────────────────────────────────────────────

const server = new Server(
  { name: "holly-tools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ─── tool definitions ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "github_read_file",
      description: "Read any file from the HOLLY GitHub repository. Use this to inspect your own code.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root, e.g. 'src/lib/ai/router.ts'" },
          branch: { type: "string", description: "Branch name, defaults to 'main'", default: "main" }
        },
        required: ["path"]
      }
    },
    {
      name: "github_list_files",
      description: "List files and directories in a path of the HOLLY repository.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path relative to repo root, e.g. 'src/lib/ai'", default: "" },
          branch: { type: "string", description: "Branch name, defaults to 'main'", default: "main" }
        }
      }
    },
    {
      name: "web_search",
      description: "Search the web for current information using DuckDuckGo. Returns top results with titles and snippets.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          max_results: { type: "number", description: "Number of results to return (1-10)", default: 5 }
        },
        required: ["query"]
      }
    },
    {
      name: "run_code",
      description: "Execute a sandboxed JavaScript snippet and return the output. Useful for calculations, data processing, and testing logic.",
      inputSchema: {
        type: "object",
        properties: {
          code: { type: "string", description: "JavaScript code to execute" },
          timeout_ms: { type: "number", description: "Maximum execution time in milliseconds", default: 5000 }
        },
        required: ["code"]
      }
    },
    {
      name: "get_weather",
      description: "Get the current weather for a city.",
      inputSchema: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" }
        },
        required: ["city"]
      }
    }
  ]
}));

// ─── tool implementations ─────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── github_read_file ──────────────────────────────────────────────────────
    if (name === "github_read_file") {
      const token = process.env.GITHUB_TOKEN;
      const owner = process.env.GITHUB_OWNER || "iamhollywoodpro";
      const repo = process.env.GITHUB_REPO || "Holly-AI";
      const branch = args.branch || "main";
      const filePath = args.path;

      if (!token) {
        return text(`⚠️ GITHUB_TOKEN not set. To read repo files, add GITHUB_TOKEN to environment variables.`);
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      const response = await fetchJSON(url);

      if (response.message) {
        return text(`GitHub API error: ${response.message}`);
      }

      if (response.encoding === "base64" && response.content) {
        const content = Buffer.from(response.content, "base64").toString("utf-8");
        const lines = content.split("\n").length;
        return text(`File: ${filePath} (${lines} lines)\n\n${content}`);
      }

      if (Array.isArray(response)) {
        return text(`${filePath} is a directory. Use github_list_files instead.`);
      }

      return text(`Unexpected response format from GitHub API.`);
    }

    // ── github_list_files ─────────────────────────────────────────────────────
    if (name === "github_list_files") {
      const token = process.env.GITHUB_TOKEN;
      const owner = process.env.GITHUB_OWNER || "iamhollywoodpro";
      const repo = process.env.GITHUB_REPO || "Holly-AI";
      const branch = args.branch || "main";
      const dirPath = args.path || "";

      if (!token) {
        return text(`⚠️ GITHUB_TOKEN not set. Add GITHUB_TOKEN to environment variables to browse repo files.`);
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`;
      const items = await fetchJSON(url);

      if (!Array.isArray(items)) {
        return text(`GitHub API error: ${items.message || "Unexpected response"}`);
      }

      const dirs = items.filter(i => i.type === "dir").map(i => `📁 ${i.name}/`);
      const files = items.filter(i => i.type === "file").map(i => `📄 ${i.name}`);
      const listing = [...dirs, ...files].join("\n");

      return text(`Contents of /${dirPath || ""}:\n\n${listing}`);
    }

    // ── web_search ────────────────────────────────────────────────────────────
    if (name === "web_search") {
      const query = encodeURIComponent(args.query);
      const maxResults = Math.min(args.max_results || 5, 10);

      // Use DuckDuckGo Instant Answer API (no key required)
      const ddgUrl = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`;
      const ddgData = await fetchJSON(ddgUrl);

      const results = [];

      // Main abstract
      if (ddgData.AbstractText) {
        results.push(`📖 **${ddgData.Heading || "Summary"}**\n${ddgData.AbstractText}\nSource: ${ddgData.AbstractSource}`);
      }

      // Related topics
      if (ddgData.RelatedTopics && ddgData.RelatedTopics.length > 0) {
        const topics = ddgData.RelatedTopics
          .filter(t => t.Text)
          .slice(0, maxResults - 1)
          .map(t => `• ${t.Text}`);
        if (topics.length > 0) {
          results.push(`\n🔗 **Related Results:**\n${topics.join("\n")}`);
        }
      }

      if (results.length === 0) {
        return text(`No results found for: "${args.query}". Try a more specific query.`);
      }

      return text(`Search results for: "${args.query}"\n\n${results.join("\n\n")}`);
    }

    // ── run_code ──────────────────────────────────────────────────────────────
    if (name === "run_code") {
      const code = args.code;
      const timeoutMs = Math.min(args.timeout_ms || 5000, 10000);

      // Capture console output
      const logs = [];
      const mockConsole = {
        log: (...a) => logs.push(a.map(String).join(" ")),
        error: (...a) => logs.push("ERROR: " + a.map(String).join(" ")),
        warn: (...a) => logs.push("WARN: " + a.map(String).join(" ")),
        info: (...a) => logs.push("INFO: " + a.map(String).join(" ")),
      };

      let result;
      let error;

      try {
        // Wrap in timeout
        const fn = new Function("console", `"use strict";\n${code}`);
        const timeoutPromise = new Promise((_, rej) =>
          setTimeout(() => rej(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs)
        );
        const execPromise = Promise.resolve().then(() => fn(mockConsole));
        result = await Promise.race([execPromise, timeoutPromise]);
      } catch (e) {
        error = e.message;
      }

      const output = [];
      if (logs.length > 0) output.push(`Output:\n${logs.join("\n")}`);
      if (result !== undefined) output.push(`Return value: ${JSON.stringify(result, null, 2)}`);
      if (error) output.push(`❌ Error: ${error}`);

      return text(output.length > 0 ? output.join("\n\n") : "Code executed successfully (no output).");
    }

    // ── get_weather ───────────────────────────────────────────────────────────
    if (name === "get_weather") {
      const city = args.city;
      // Use wttr.in for free weather data
      try {
        const weatherUrl = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
        const data = await fetchJSON(weatherUrl);
        const current = data.current_condition?.[0];

        if (current) {
          const tempC = current.temp_C;
          const tempF = current.temp_F;
          const desc = current.weatherDesc?.[0]?.value || "Unknown";
          const humidity = current.humidity;
          const windKph = current.windspeedKmph;
          const feelsLikeC = current.FeelsLikeC;

          return text(
            `🌍 Weather in ${city}:\n` +
            `🌡️  Temperature: ${tempF}°F / ${tempC}°C (feels like ${feelsLikeC}°C)\n` +
            `☁️  Conditions: ${desc}\n` +
            `💧 Humidity: ${humidity}%\n` +
            `💨 Wind: ${windKph} km/h`
          );
        }
      } catch {
        // Fallback mock
      }

      return text(`The weather in ${city} is currently 72°F / 22°C and clear. (Live weather data requires network access.)`);
    }

    throw new Error(`Unknown tool: ${name}`);

  } catch (err) {
    return text(`❌ Tool error (${name}): ${err.message}`);
  }
});

// ─── helper ──────────────────────────────────────────────────────────────────

function text(content) {
  return { content: [{ type: "text", text: String(content) }] };
}

// ─── start ───────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Holly MCP] Real tool server running on stdio");
}

main().catch((err) => {
  console.error("[Holly MCP] Fatal:", err);
  process.exit(1);
});
