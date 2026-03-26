/**
 * HOLLY MCP Tool Server  –  Phase 4A: Expanded Tool Suite
 *
 * 15 tools across 5 groups:
 *
 * GROUP 1 – GITHUB (read + write)
 *   github_read_file       read any file from the repo
 *   github_list_files      list directory contents
 *   github_create_or_update_file  create / update a file and commit it
 *   github_create_pr       open a pull request
 *   github_create_issue    create a GitHub issue
 *   github_list_prs        list open pull requests
 *
 * GROUP 2 – WEB INTELLIGENCE
 *   web_search             DuckDuckGo instant-answer (no key)
 *   web_scrape             fetch and return page text / markdown
 *
 * GROUP 3 – CODE EXECUTION
 *   run_code               sandboxed JavaScript eval
 *   run_code_python        HTTP call to Judge0 public sandbox for Python/JS/TS
 *
 * GROUP 4 – MEMORY / KNOWLEDGE
 *   memory_read            read HOLLY's persistent key-value memory store
 *   memory_write           write a key-value pair to HOLLY's memory
 *   memory_list_keys       list all keys in HOLLY's memory
 *
 * GROUP 5 – CREATIVE / UTILITY
 *   generate_image         queue an image-generation job (returns prompt echo)
 *   get_weather            current weather for a city (wttr.in, free)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── helpers ─────────────────────────────────────────────────────────────────

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const reqOpts = {
      headers: { "User-Agent": "HOLLY-AI/4.0", ...options.headers },
      method: options.method || "GET",
    };
    const req = client.request(url, reqOpts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function fetchText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { headers: { "User-Agent": "HOLLY-AI/4.0", ...headers } }, (res) => {
      // Follow redirects (up to 5)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchText(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
  });
}

function text(content) {
  return { content: [{ type: "text", text: String(content) }] };
}

// Strip HTML tags and collapse whitespace for scraping
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── MEMORY STORE (simple JSON file, persisted in /tmp) ──────────────────────

const MEMORY_FILE = path.join("/tmp", "holly-mcp-memory.json");

function readMemoryStore() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
    }
  } catch { /* ignore */ }
  return {};
}

function writeMemoryStore(store) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("[MCP Memory] Write failed:", e.message);
  }
}

// ─── GITHUB HELPERS ───────────────────────────────────────────────────────────

function ghHeaders(token) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "HOLLY-AI/4.0",
    "Content-Type": "application/json",
  };
}

async function ghGet(path, token) {
  const url = `https://api.github.com${path}`;
  const { status, body } = await fetchJSON(url, { headers: ghHeaders(token) });
  return { status, body };
}

async function ghPost(apiPath, token, payload) {
  const url = `https://api.github.com${apiPath}`;
  const { status, body } = await fetchJSON(url, {
    method: "POST",
    headers: ghHeaders(token),
    body: JSON.stringify(payload),
  });
  return { status, body };
}

async function ghPut(apiPath, token, payload) {
  const url = `https://api.github.com${apiPath}`;
  const { status, body } = await fetchJSON(url, {
    method: "PUT",
    headers: ghHeaders(token),
    body: JSON.stringify(payload),
  });
  return { status, body };
}

// ─── SERVER SETUP ─────────────────────────────────────────────────────────────

const server = new Server(
  { name: "holly-tools", version: "4.0.0" },
  { capabilities: { tools: {} } }
);

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // ── GROUP 1: GITHUB ──────────────────────────────────────────────────────
    {
      name: "github_read_file",
      description: "Read any file from the HOLLY GitHub repository. Use this to inspect your own code.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root, e.g. 'src/lib/ai/router.ts'" },
          branch: { type: "string", description: "Branch name, defaults to 'main'", default: "main" },
          repo: { type: "string", description: "Optional: owner/repo override, e.g. 'iamhollywoodpro/Holly-AI'" }
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
          branch: { type: "string", description: "Branch name, defaults to 'main'", default: "main" },
          repo: { type: "string", description: "Optional: owner/repo override" }
        }
      }
    },
    {
      name: "github_create_or_update_file",
      description: "Create a new file or update an existing file in the HOLLY GitHub repository with a commit. Use this to write code, docs, or configs directly to the repo.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to repo root, e.g. 'src/lib/new-feature.ts'" },
          content: { type: "string", description: "Full file content (UTF-8 string)" },
          message: { type: "string", description: "Commit message, e.g. 'feat: add new feature'" },
          branch: { type: "string", description: "Target branch, defaults to 'main'", default: "main" },
          repo: { type: "string", description: "Optional: owner/repo override" }
        },
        required: ["path", "content", "message"]
      }
    },
    {
      name: "github_create_pr",
      description: "Open a pull request in the HOLLY GitHub repository.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "PR title" },
          body: { type: "string", description: "PR description / body text (markdown supported)" },
          head: { type: "string", description: "Source branch (the branch with your changes)" },
          base: { type: "string", description: "Target branch, usually 'main'", default: "main" },
          repo: { type: "string", description: "Optional: owner/repo override" }
        },
        required: ["title", "head"]
      }
    },
    {
      name: "github_create_issue",
      description: "Create a GitHub issue in the HOLLY repository – useful for logging bugs, feature ideas, or tasks discovered during a conversation.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Issue title" },
          body: { type: "string", description: "Issue body (markdown supported)" },
          labels: { type: "array", items: { type: "string" }, description: "Optional labels, e.g. ['bug','enhancement']" },
          repo: { type: "string", description: "Optional: owner/repo override" }
        },
        required: ["title"]
      }
    },
    {
      name: "github_list_prs",
      description: "List open pull requests in the HOLLY repository.",
      inputSchema: {
        type: "object",
        properties: {
          state: { type: "string", description: "PR state: open, closed, or all", default: "open" },
          repo: { type: "string", description: "Optional: owner/repo override" }
        }
      }
    },

    // ── GROUP 2: WEB INTELLIGENCE ────────────────────────────────────────────
    {
      name: "web_search",
      description: "Search the web for current information using DuckDuckGo. Returns top results with titles and snippets. No API key required.",
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
      name: "web_scrape",
      description: "Fetch and extract the readable text content from any public web page. Useful for reading documentation, articles, or live data.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "Full URL to scrape, e.g. 'https://docs.prisma.io/orm/overview'" },
          max_chars: { type: "number", description: "Max characters to return (default 4000, max 8000)", default: 4000 }
        },
        required: ["url"]
      }
    },

    // ── GROUP 3: CODE EXECUTION ──────────────────────────────────────────────
    {
      name: "run_code",
      description: "Execute a sandboxed JavaScript snippet and return the output. Useful for calculations, data transformations, and testing logic.",
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
      name: "run_code_judge0",
      description: "Execute code in Python, TypeScript, JavaScript, Bash, or other languages via Judge0 public sandbox. Returns stdout, stderr, and status.",
      inputSchema: {
        type: "object",
        properties: {
          source_code: { type: "string", description: "The source code to execute" },
          language: {
            type: "string",
            description: "Language: python3, javascript, typescript, bash, java, cpp, ruby, go",
            default: "python3"
          },
          stdin: { type: "string", description: "Optional standard input", default: "" }
        },
        required: ["source_code"]
      }
    },

    // ── GROUP 4: MEMORY / KNOWLEDGE ──────────────────────────────────────────
    {
      name: "memory_write",
      description: "Write a key-value pair to HOLLY's persistent memory store. Use this to remember important facts, decisions, user preferences, or notes across conversations.",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "Memory key, e.g. 'user_preferred_framework' or 'project_goal'" },
          value: { type: "string", description: "Value to store (can be a stringified JSON object for complex data)" },
          note: { type: "string", description: "Optional: why this is being stored / context" }
        },
        required: ["key", "value"]
      }
    },
    {
      name: "memory_read",
      description: "Read a value from HOLLY's persistent memory store by key.",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string", description: "Memory key to look up" }
        },
        required: ["key"]
      }
    },
    {
      name: "memory_list_keys",
      description: "List all keys currently stored in HOLLY's persistent memory. Use this to see what HOLLY remembers.",
      inputSchema: {
        type: "object",
        properties: {
          filter: { type: "string", description: "Optional substring filter for key names" }
        }
      }
    },

    // ── GROUP 5: CREATIVE / UTILITY ──────────────────────────────────────────
    {
      name: "generate_image",
      description: "Queue an image generation job. Sends the prompt to the Pollinations.AI free image API and returns the image URL. No API key needed.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Detailed image description" },
          width: { type: "number", description: "Image width in pixels (default 1024)", default: 1024 },
          height: { type: "number", description: "Image height in pixels (default 1024)", default: 1024 },
          model: { type: "string", description: "Model: flux (default), turbo, flux-realism", default: "flux" }
        },
        required: ["prompt"]
      }
    },
    {
      name: "get_weather",
      description: "Get the current weather for any city using wttr.in (free, no API key).",
      inputSchema: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name, e.g. 'Los Angeles' or 'Tokyo'" }
        },
        required: ["city"]
      }
    }
  ]
}));

// ─── TOOL IMPLEMENTATIONS ────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const TOKEN  = process.env.GITHUB_TOKEN;
  const OWNER  = process.env.GITHUB_OWNER || "iamhollywoodpro";
  const REPO   = process.env.GITHUB_REPO  || "Holly-AI";

  // Resolve owner/repo from optional override arg
  function resolveRepo(argRepo) {
    if (argRepo && argRepo.includes("/")) {
      const [o, r] = argRepo.split("/");
      return { owner: o, repo: r };
    }
    return { owner: OWNER, repo: REPO };
  }

  try {

    // ══ GROUP 1: GITHUB ════════════════════════════════════════════════════════

    // ── github_read_file ──────────────────────────────────────────────────────
    if (name === "github_read_file") {
      if (!TOKEN) return text("⚠️ GITHUB_TOKEN not set in environment variables.");
      const { owner, repo } = resolveRepo(args.repo);
      const branch = args.branch || "main";
      const { status, body } = await ghGet(`/repos/${owner}/${repo}/contents/${args.path}?ref=${branch}`, TOKEN);

      if (body.message) return text(`GitHub error: ${body.message}`);
      if (body.encoding === "base64" && body.content) {
        const content = Buffer.from(body.content, "base64").toString("utf-8");
        return text(`📄 ${args.path} (${content.split("\n").length} lines)\n\n${content}`);
      }
      if (Array.isArray(body)) return text(`${args.path} is a directory. Use github_list_files instead.`);
      return text(`Unexpected response from GitHub API (status ${status}).`);
    }

    // ── github_list_files ─────────────────────────────────────────────────────
    if (name === "github_list_files") {
      if (!TOKEN) return text("⚠️ GITHUB_TOKEN not set.");
      const { owner, repo } = resolveRepo(args.repo);
      const branch = args.branch || "main";
      const dirPath = args.path || "";
      const { body } = await ghGet(`/repos/${owner}/${repo}/contents/${dirPath}?ref=${branch}`, TOKEN);

      if (!Array.isArray(body)) return text(`GitHub error: ${body.message || "Unexpected response"}`);
      const dirs  = body.filter(i => i.type === "dir").map(i => `📁 ${i.name}/`);
      const files = body.filter(i => i.type === "file").map(i => `📄 ${i.name}`);
      return text(`Contents of /${dirPath || ""}:\n\n${[...dirs, ...files].join("\n")}`);
    }

    // ── github_create_or_update_file ──────────────────────────────────────────
    if (name === "github_create_or_update_file") {
      if (!TOKEN) return text("⚠️ GITHUB_TOKEN not set. Cannot write to repository.");
      const { owner, repo } = resolveRepo(args.repo);
      const branch = args.branch || "main";
      const filePath = args.path;
      const encodedContent = Buffer.from(args.content, "utf-8").toString("base64");

      // Check if file already exists (need SHA to update)
      let sha;
      try {
        const { body: existing } = await ghGet(`/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`, TOKEN);
        if (existing && existing.sha) sha = existing.sha;
      } catch { /* file doesn't exist yet, that's fine */ }

      const payload = {
        message: args.message,
        content: encodedContent,
        branch,
        ...(sha ? { sha } : {}),
      };

      const { status, body } = await ghPut(`/repos/${owner}/${repo}/contents/${filePath}`, TOKEN, payload);

      if (status === 200 || status === 201) {
        const action = status === 201 ? "Created" : "Updated";
        const commitUrl = body.commit?.html_url || "";
        return text(`✅ ${action} ${filePath}\nCommit: ${body.commit?.sha?.slice(0, 7) || "?"}\n${commitUrl}`);
      }
      return text(`❌ GitHub write error (${status}): ${JSON.stringify(body)}`);
    }

    // ── github_create_pr ──────────────────────────────────────────────────────
    if (name === "github_create_pr") {
      if (!TOKEN) return text("⚠️ GITHUB_TOKEN not set. Cannot create pull requests.");
      const { owner, repo } = resolveRepo(args.repo);
      const { status, body } = await ghPost(`/repos/${owner}/${repo}/pulls`, TOKEN, {
        title: args.title,
        body: args.body || "",
        head: args.head,
        base: args.base || "main",
      });

      if (status === 201) {
        return text(`✅ Pull request created!\nTitle: ${body.title}\nURL:   ${body.html_url}\nNumber: #${body.number}`);
      }
      return text(`❌ PR creation failed (${status}): ${JSON.stringify(body)}`);
    }

    // ── github_create_issue ───────────────────────────────────────────────────
    if (name === "github_create_issue") {
      if (!TOKEN) return text("⚠️ GITHUB_TOKEN not set. Cannot create issues.");
      const { owner, repo } = resolveRepo(args.repo);
      const { status, body } = await ghPost(`/repos/${owner}/${repo}/issues`, TOKEN, {
        title: args.title,
        body: args.body || "",
        labels: args.labels || [],
      });

      if (status === 201) {
        return text(`✅ Issue created!\nTitle: ${body.title}\nURL:   ${body.html_url}\nNumber: #${body.number}`);
      }
      return text(`❌ Issue creation failed (${status}): ${JSON.stringify(body)}`);
    }

    // ── github_list_prs ───────────────────────────────────────────────────────
    if (name === "github_list_prs") {
      if (!TOKEN) return text("⚠️ GITHUB_TOKEN not set.");
      const { owner, repo } = resolveRepo(args.repo);
      const state = args.state || "open";
      const { status, body } = await ghGet(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`, TOKEN);

      if (!Array.isArray(body)) return text(`GitHub error: ${body.message || "Unexpected response"}`);
      if (body.length === 0) return text(`No ${state} pull requests found.`);

      const list = body.map(pr =>
        `#${pr.number} [${pr.state}] ${pr.title}\n  ${pr.html_url}\n  by @${pr.user?.login} • ${pr.head?.ref} → ${pr.base?.ref}`
      ).join("\n\n");

      return text(`📋 ${state.toUpperCase()} Pull Requests (${body.length}):\n\n${list}`);
    }

    // ══ GROUP 2: WEB INTELLIGENCE ══════════════════════════════════════════════

    // ── web_search ────────────────────────────────────────────────────────────
    if (name === "web_search") {
      const query = encodeURIComponent(args.query);
      const maxResults = Math.min(args.max_results || 5, 10);
      const ddgUrl = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`;
      const { body: ddg } = await fetchJSON(ddgUrl);

      const results = [];
      if (ddg.AbstractText) {
        results.push(`📖 **${ddg.Heading || "Summary"}**\n${ddg.AbstractText}\nSource: ${ddg.AbstractSource}`);
      }
      if (ddg.RelatedTopics?.length > 0) {
        const topics = ddg.RelatedTopics.filter(t => t.Text).slice(0, maxResults - 1).map(t => `• ${t.Text}`);
        if (topics.length > 0) results.push(`\n🔗 **Related:**\n${topics.join("\n")}`);
      }
      if (results.length === 0) return text(`No results found for: "${args.query}". Try a more specific query.`);
      return text(`Search: "${args.query}"\n\n${results.join("\n\n")}`);
    }

    // ── web_scrape ────────────────────────────────────────────────────────────
    if (name === "web_scrape") {
      const maxChars = Math.min(args.max_chars || 4000, 8000);
      let html;
      try {
        html = await fetchText(args.url);
      } catch (e) {
        return text(`❌ Failed to fetch ${args.url}: ${e.message}`);
      }
      const clean = htmlToText(html);
      const truncated = clean.length > maxChars ? clean.slice(0, maxChars) + `\n\n[...truncated at ${maxChars} chars]` : clean;
      return text(`🌐 Content from: ${args.url}\n\n${truncated}`);
    }

    // ══ GROUP 3: CODE EXECUTION ════════════════════════════════════════════════

    // ── run_code (sandboxed JS) ───────────────────────────────────────────────
    if (name === "run_code") {
      const code = args.code;
      const timeoutMs = Math.min(args.timeout_ms || 5000, 10000);
      const logs = [];
      const mockConsole = {
        log:   (...a) => logs.push(a.map(String).join(" ")),
        error: (...a) => logs.push("ERROR: " + a.map(String).join(" ")),
        warn:  (...a) => logs.push("WARN: "  + a.map(String).join(" ")),
        info:  (...a) => logs.push("INFO: "  + a.map(String).join(" ")),
      };
      let result, error;
      try {
        const fn = new Function("console", `"use strict";\n${code}`);
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs));
        result = await Promise.race([Promise.resolve().then(() => fn(mockConsole)), timeout]);
      } catch (e) { error = e.message; }

      const out = [];
      if (logs.length)           out.push(`Output:\n${logs.join("\n")}`);
      if (result !== undefined)  out.push(`Return: ${JSON.stringify(result, null, 2)}`);
      if (error)                 out.push(`❌ Error: ${error}`);
      return text(out.length ? out.join("\n\n") : "Code executed (no output).");
    }

    // ── run_code_judge0 ───────────────────────────────────────────────────────
    if (name === "run_code_judge0") {
      // Judge0 language IDs (CE public instance)
      const langMap = {
        python3: 71, python: 71,
        javascript: 63, js: 63,
        typescript: 74, ts: 74,
        bash: 46, shell: 46,
        java: 62,
        cpp: 54, "c++": 54,
        c: 50,
        ruby: 72,
        go: 60,
        rust: 73,
        php: 68,
      };
      const lang = (args.language || "python3").toLowerCase();
      const langId = langMap[lang] || 71;

      try {
        const payload = JSON.stringify({
          source_code: Buffer.from(args.source_code).toString("base64"),
          language_id: langId,
          stdin: args.stdin ? Buffer.from(args.stdin).toString("base64") : "",
        });

        // Submit
        const { status: submitStatus, body: submission } = await fetchJSON(
          "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
              "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "",
            },
            body: payload,
          }
        );

        // Fallback: if no RapidAPI key, use public judge0.com
        if (!process.env.RAPIDAPI_KEY || submitStatus === 401) {
          const { status: pubStatus, body: pubResult } = await fetchJSON(
            "https://ce.judge0.com/submissions?base64_encoded=true&wait=true",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
            }
          );

          const stdout = pubResult.stdout ? Buffer.from(pubResult.stdout, "base64").toString() : "";
          const stderr = pubResult.stderr ? Buffer.from(pubResult.stderr, "base64").toString() : "";
          const compileOut = pubResult.compile_output ? Buffer.from(pubResult.compile_output, "base64").toString() : "";
          const statusName = pubResult.status?.description || "Unknown";

          return text(
            `🖥️ Judge0 (${lang})\nStatus: ${statusName}\n` +
            (stdout ? `\nOutput:\n${stdout}` : "") +
            (stderr ? `\nStderr:\n${stderr}` : "") +
            (compileOut ? `\nCompile:\n${compileOut}` : "") +
            (!stdout && !stderr && !compileOut ? "\n(No output)" : "")
          );
        }

        const stdout = submission.stdout ? Buffer.from(submission.stdout, "base64").toString() : "";
        const stderr = submission.stderr ? Buffer.from(submission.stderr, "base64").toString() : "";
        const statusName = submission.status?.description || "Unknown";

        return text(
          `🖥️ Judge0 (${lang})\nStatus: ${statusName}\n` +
          (stdout ? `\nOutput:\n${stdout}` : "") +
          (stderr ? `\nStderr:\n${stderr}` : "") +
          (!stdout && !stderr ? "\n(No output)" : "")
        );
      } catch (e) {
        return text(`❌ Judge0 error: ${e.message}`);
      }
    }

    // ══ GROUP 4: MEMORY / KNOWLEDGE ════════════════════════════════════════════

    // ── memory_write ──────────────────────────────────────────────────────────
    if (name === "memory_write") {
      const store = readMemoryStore();
      store[args.key] = {
        value: args.value,
        note: args.note || "",
        updatedAt: new Date().toISOString(),
      };
      writeMemoryStore(store);
      return text(`✅ Remembered: ${args.key} = "${args.value.slice(0, 100)}${args.value.length > 100 ? "..." : ""}"`);
    }

    // ── memory_read ───────────────────────────────────────────────────────────
    if (name === "memory_read") {
      const store = readMemoryStore();
      const entry = store[args.key];
      if (!entry) return text(`🔍 No memory found for key: "${args.key}". Use memory_list_keys to see what's stored.`);
      return text(`🧠 Memory [${args.key}]\nValue: ${entry.value}\n${entry.note ? `Note: ${entry.note}\n` : ""}Stored: ${entry.updatedAt}`);
    }

    // ── memory_list_keys ──────────────────────────────────────────────────────
    if (name === "memory_list_keys") {
      const store = readMemoryStore();
      let keys = Object.keys(store);
      if (args.filter) keys = keys.filter(k => k.includes(args.filter));
      if (keys.length === 0) return text("🧠 Memory is empty (no keys stored yet).");
      const list = keys.map(k => `• ${k}  (${store[k].updatedAt?.slice(0, 10) || "?"})`).join("\n");
      return text(`🧠 HOLLY Memory Keys (${keys.length}):\n\n${list}`);
    }

    // ══ GROUP 5: CREATIVE / UTILITY ════════════════════════════════════════════

    // ── generate_image ────────────────────────────────────────────────────────
    if (name === "generate_image") {
      // Pollinations.AI — completely free, no API key required
      const encoded = encodeURIComponent(args.prompt);
      const w = args.width  || 1024;
      const h = args.height || 1024;
      const model = args.model || "flux";
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&model=${model}&seed=${seed}&nologo=true`;

      return text(
        `🎨 Image generated!\n\nPrompt: ${args.prompt}\n\nURL: ${imageUrl}\n\nTo display: paste the URL in your browser, or embed it in markdown as:\n![${args.prompt.slice(0, 50)}](${imageUrl})`
      );
    }

    // ── get_weather ───────────────────────────────────────────────────────────
    if (name === "get_weather") {
      try {
        const weatherUrl = `https://wttr.in/${encodeURIComponent(args.city)}?format=j1`;
        const { body: data } = await fetchJSON(weatherUrl);
        const current = data.current_condition?.[0];
        if (current) {
          return text(
            `🌍 Weather in ${args.city}:\n` +
            `🌡️  Temp: ${current.temp_F}°F / ${current.temp_C}°C (feels like ${current.FeelsLikeC}°C)\n` +
            `☁️  ${current.weatherDesc?.[0]?.value || "N/A"}\n` +
            `💧 Humidity: ${current.humidity}%\n` +
            `💨 Wind: ${current.windspeedKmph} km/h`
          );
        }
      } catch { /* fall through to mock */ }
      return text(`Weather in ${args.city}: Live data unavailable (check network). Try wttr.in/${args.city} in browser.`);
    }

    throw new Error(`Unknown tool: ${name}`);

  } catch (err) {
    return text(`❌ Tool error (${name}): ${err.message}`);
  }
});

// ─── START ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Holly MCP] Phase 4A tool server running — 15 tools active");
}

main().catch((err) => {
  console.error("[Holly MCP] Fatal:", err);
  process.exit(1);
});
