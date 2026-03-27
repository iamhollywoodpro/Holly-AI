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
 *   generate_music         generate original music via SUNO API (songs, beats, instrumentals)
 *   philosophy_reflect     structured philosophical exploration framework
 *   creative_write         structured creative writing framework (poetry, fiction, lyrics, essays)
 *   emotional_support       emotional intelligence framework and response guidance
 *   analyze_language        NLP analysis: intent, register, subtext, semantic fields
 * (23 tools total)
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

    // ── GROUP 6: AURA A&R ENGINE ──────────────────────────────────────────────
    {
      name: "aura_ar_analyze",
      description: "HOLLY's A&R analysis tool. Analyzes a music track as a professional record company A&R executive. Returns a Billboard Hit Rating (1-100), score breakdown (production, songwriting, commercial appeal, originality, performance), signing decision, comparable artists, and a full A&R feedback letter. Use this when the user uploads or shares a track and wants professional music industry feedback.",
      inputSchema: {
        type: "object",
        properties: {
          audioUrl:        { type: "string", description: "Public URL to the audio file (mp3, wav, flac, etc.)" },
          fileName:        { type: "string", description: "The filename or track name" },
          trackTitle:      { type: "string", description: "Song title (optional)" },
          artistName:      { type: "string", description: "Artist name (optional)" },
          genre:           { type: "string", description: "Genre (optional, e.g. hip-hop, pop, R&B)" },
          lyricsText:      { type: "string", description: "Lyrics or transcript (optional)" },
          referenceTrack:  { type: "string", description: "Comparable artist or song for reference (optional)" },
          userQuestion:    { type: "string", description: "Specific question from the artist (optional)" }
        },
        required: ["audioUrl", "fileName"]
      }
    },
    {
      name: "aura_quick_rate",
      description: "Quick A&R rating for a track. Returns just the Billboard Hit Score (1-100) and a brief 3-sentence verdict. Faster than full analysis. Use when user wants a quick gut-check on a track.",
      inputSchema: {
        type: "object",
        properties: {
          audioUrl:   { type: "string", description: "Public URL to the audio file" },
          trackTitle: { type: "string", description: "Track title" },
          artistName: { type: "string", description: "Artist name" },
          genre:      { type: "string", description: "Genre" }
        },
        required: ["audioUrl"]
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
    },
    {
      name: "generate_music",
      description: "Generate original music using the SUNO API. Can create full songs with vocals and lyrics, or pure instrumentals. Generation takes 1-3 minutes and produces two audio variations. Use this when the user wants to CREATE music (for ANALYZING music, use aura_ar_analyze instead). Always share the prompt and lyrics with the user before calling this tool so they can refine the idea.",
      inputSchema: {
        type: "object",
        properties: {
          prompt:       { type: "string",  description: "Music description or lyrics. For simple mode: describe the sound, mood, genre, energy. For custom mode: provide the actual song lyrics." },
          customMode:   { type: "boolean", description: "Set true when providing actual lyrics. Set false for natural language description.", default: false },
          instrumental: { type: "boolean", description: "Set true for no vocals — pure music/beat/instrumental.", default: false },
          style:        { type: "string",  description: "Style tags for custom mode: genre, mood, instruments, era. E.g. 'dark trap, 808s, melodic, cinematic'" },
          title:        { type: "string",  description: "Song title (optional but recommended)" },
          vocalGender:  { type: "string",  description: "'male' or 'female' vocal preference (optional)" }
        },
        required: ["prompt"]
      }
    },
    {
      name: "philosophy_reflect",
      description: "Trigger a deep philosophical reflection on a concept, question, or tension. Returns a structured exploration drawing from multiple philosophical traditions. Use when the user asks a philosophical question or wants to explore an idea deeply.",
      inputSchema: {
        type: "object",
        properties: {
          question:    { type: "string", description: "The philosophical question, concept, or tension to explore" },
          traditions:  { type: "string", description: "Optional: philosophical traditions to emphasize, e.g. 'eastern, existentialist, stoic'" },
          depth:       { type: "string", description: "'brief' (3-4 paragraphs) or 'deep' (full essay-length exploration)", default: "deep" }
        },
        required: ["question"]
      }
    },
    {
      name: "creative_write",
      description: "Activate the HOLLY Creative Writing Framework to get structured guidance on form, craft principles, and literary approach before writing. Use for poetry, fiction, song lyrics, screenplays, essays, and any other creative form. Returns craft guidance, structural framework, and literary examples relevant to the requested form and genre.",
      inputSchema: {
        type: "object",
        properties: {
          form:     { type: "string", description: "The writing form: 'poem', 'song_lyrics', 'short_story', 'flash_fiction', 'screenplay', 'essay', 'monologue', 'prose_poem'" },
          genre:    { type: "string", description: "Optional genre: 'hip_hop', 'rnb', 'afrobeats', 'literary_fiction', 'noir', 'magical_realism', etc." },
          subject:  { type: "string", description: "What the piece is about — the subject, theme, or emotional core" },
          mood:     { type: "string", description: "The emotional tone or feeling to create: 'melancholic', 'defiant', 'tender', 'euphoric', 'dark', etc." },
          reference: { type: "string", description: "Optional: an artist or author to draw inspiration from" }
        },
        required: ["form", "subject"]
      }
    },
    {
      name: "emotional_support",
      description: "Access HOLLY's Advanced Emotional Intelligence framework to determine the right approach for supporting someone emotionally. Returns the appropriate emotional response strategy, questions to ask, and frames to avoid. Use when the user is struggling, processing something difficult, grieving, or in crisis.",
      inputSchema: {
        type: "object",
        properties: {
          situation:   { type: "string", description: "Brief description of what the person is going through" },
          state:       { type: "string", description: "Detected emotional state: 'anxious', 'depressed', 'grieving', 'angry', 'overwhelmed', 'in_crisis', 'stuck', 'unknown'" },
          context:     { type: "string", description: "Any additional context about the relationship, history, or what they've shared" }
        },
        required: ["situation"]
      }
    },
    {
      name: "analyze_language",
      description: "Perform advanced NLP analysis on a message to detect intent, register, subtext, and emotional layer. Returns communication analysis including what was said, what was implied, and how HOLLY should respond. Use when a message is ambiguous, emotionally complex, or requires nuanced interpretation.",
      inputSchema: {
        type: "object",
        properties: {
          message:  { type: "string", description: "The message or text to analyze" },
          context:  { type: "string", description: "Optional: conversation context to improve interpretation accuracy" }
        },
        required: ["message"]
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

    // ══ GROUP 6: AURA A&R ENGINE ════════════════════════════════════════════════

    // ── aura_ar_analyze ───────────────────────────────────────────────────────
    if (name === "aura_ar_analyze" || name === "aura_quick_rate") {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      const isQuick = name === "aura_quick_rate";
      const payload = {
        audioUrl:    args.audioUrl,
        fileName:    args.fileName || args.trackTitle || "track.mp3",
        trackTitle:  args.trackTitle,
        artistName:  args.artistName,
        genre:       args.genre,
        lyricsText:  args.lyricsText,
        referenceTrack: args.referenceTrack,
        userQuestion: isQuick ? "Quick rating please" : args.userQuestion,
      };

      try {
        const resp = await fetchJSON(`${baseUrl}/api/ar/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-token": process.env.INTERNAL_API_SECRET || "holly-internal",
          },
          body: JSON.stringify(payload),
        });

        if (resp.status !== 200 || !resp.body?.ok) {
          return text(`❌ A&R analysis failed: ${JSON.stringify(resp.body)}`);
        }

        const analysis = resp.body.analysis;
        const r = analysis.billboardRating;
        const bar = "█".repeat(Math.round(r.overall / 10)) + "░".repeat(10 - Math.round(r.overall / 10));

        if (isQuick) {
          return text(
            `🎵 QUICK A&R VERDICT\n\n` +
            `Billboard Hit Rating: ${r.overall}/100  ${bar}\n` +
            `Tier: ${r.tier}  |  Chart Potential: ${r.chartPotential}\n\n` +
            `Signing Decision: ${analysis.signingDecision}\n\n` +
            `${analysis.firstListen || analysis.signingReason}`
          );
        }

        return text(
          `🎤 HOLLY A&R ANALYSIS COMPLETE\n\n` +
          `Billboard Hit Rating: ${r.overall}/100  ${bar}\n` +
          `Tier: ${r.tier}  |  Chart Potential: ${r.chartPotential}\n\n` +
          `SCORE BREAKDOWN:\n` +
          `  🎛️  Production: ${r.breakdown.production}/100\n` +
          `  ✍️  Songwriting: ${r.breakdown.songwriting}/100\n` +
          `  📻 Commercial:  ${r.breakdown.commercial}/100\n` +
          `  💡 Originality: ${r.breakdown.originality}/100\n` +
          `  🎤 Performance: ${r.breakdown.performance}/100\n\n` +
          `SIGNING DECISION: ${analysis.signingDecision}\n` +
          `${analysis.signingReason}\n\n` +
          `MARKET FIT: ${analysis.marketFit}\n\n` +
          `COMPARABLE ACTS: ${(analysis.comparables || []).join(", ")}\n\n` +
          `NEXT STEPS:\n${(analysis.nextSteps || []).map(s => `  • ${s}`).join("\n")}\n\n` +
          `A&R LETTER:\n${analysis.arLetter}`
        );
      } catch (err) {
        return text(`❌ A&R analysis error: ${err.message}\nTip: Make sure the audio URL is publicly accessible.`);
      }
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

    // ── generate_music ────────────────────────────────────────────────────────
    if (name === "generate_music") {
      const SUNO_KEY = process.env.SUNOAPI_KEY || process.env.SUNO_API_KEY;
      if (!SUNO_KEY) {
        return text("❌ Music generation is not configured. SUNOAPI_KEY is missing from environment variables.");
      }
      try {
        const sunoBody = {
          prompt:       args.prompt,
          customMode:   args.customMode   || false,
          instrumental: args.instrumental || false,
          model:        "V4_5ALL",
          callBackUrl:  "https://holly.nexamusicgroup.com/api/music/callback",
        };
        if (args.customMode) {
          if (args.style)       sunoBody.style       = args.style;
          if (args.title)       sunoBody.title       = args.title;
          if (args.vocalGender) sunoBody.vocalGender = args.vocalGender;
        }
        const res  = await fetch("https://api.sunoapi.org/api/v1/generate", {
          method: "POST",
          headers: { "Authorization": `Bearer ${SUNO_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(sunoBody),
        });
        const data = await res.json();
        if (!res.ok || data.code !== 200) {
          return text(`❌ SUNO API error: ${data.msg || JSON.stringify(data)}`);
        }
        const taskId = data.data?.taskId || data.data?.id || "unknown";
        return text(
          `🎵 Music generation started!\n\n` +
          `**Task ID:** ${taskId}\n` +
          `**Prompt:** ${args.prompt.slice(0, 120)}${args.prompt.length > 120 ? '...' : ''}\n` +
          `**Mode:** ${args.instrumental ? 'Instrumental' : args.customMode ? 'Custom (with lyrics)' : 'Simple'}\n\n` +
          `⏳ Generation takes 1–3 minutes. Use the Music Studio panel or check status with the task ID.\n` +
          `The track will appear in the chat once ready.`
        );
      } catch (err) {
        return text(`❌ Music generation failed: ${err.message}`);
      }
    }

    // ── philosophy_reflect ────────────────────────────────────────────────────
    if (name === "philosophy_reflect") {
      // This tool returns a structured prompt that HOLLY will use to compose her response.
      // The actual philosophical reasoning happens in the LLM — this tool formats the framework.
      const { question, traditions, depth = "deep" } = args;
      const traditionLine = traditions ? `Emphasize: ${traditions}.` : "Draw from Western, Eastern, and contemporary philosophy.";
      const depthLine     = depth === "brief" ? "Give a focused 3-4 paragraph response." : "Give a thorough, essay-quality exploration.";
      return text(
        `[PHILOSOPHY MODE ACTIVE]\n` +
        `Question: ${question}\n` +
        `${traditionLine}\n` +
        `${depthLine}\n\n` +
        `Structure your response: (1) Frame the question and its weight, (2) Key philosophical positions and thinkers, ` +
        `(3) Tensions and paradoxes within the question, (4) Your own perspective and synthesis, ` +
        `(5) A closing thought or question that opens rather than closes the inquiry.`
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

    // ── creative_write ────────────────────────────────────────────────────────
    if (name === "creative_write") {
      const { form, genre, subject, mood, reference } = args;

      // Form-specific craft guidance
      const formGuides = {
        poem: { structure: "Opening image → complication/movement → turn (volta) → closing image that opens outward", keyPrinciples: ["The line break IS meaning", "Image before statement", "White space is silence", "Cut the first stanza — the real poem usually starts in stanza 2"] },
        song_lyrics: { structure: "Verse (setup) → Pre-chorus (tension) → Chorus (release) → Verse 2 (deeper angle) → Bridge (shift) → Final Chorus (earned)", keyPrinciples: ["Write the hook first — it's the emotional core", "Conversational truth beats lyrical cleverness", "Every syllable must fit the beat", "The verse earns the chorus"] },
        short_story: { structure: "Inciting incident → Rising complications → Crisis/Turn → Resolution → Resonant final image", keyPrinciples: ["Start in the middle of something — no backstory preamble", "One central change, fully rendered", "Character revealed through action not description", "The ending must be earned, not explained"] },
        flash_fiction: { structure: "One moment, fully rendered. No setup. One turn. An ending that reverberates.", keyPrinciples: ["Every word is a decision", "Cut the first sentence", "Imply entire histories in one gesture", "The story beneath the flash is often larger than the flash itself"] },
        screenplay: { structure: "Act 1 (25%): World + inciting incident. Act 2A: Escalating complications. Midpoint shift. Act 2B: All is lost. Act 3: Climax + resolution.", keyPrinciples: ["Film is visual — show, never tell", "Every scene: what does the character WANT? What do they get?", "Dialogue expresses subtext — not information", "Cut to the scene late, leave early"] },
        essay: { structure: "Entry point (specific scene/object) → Inquiry and association → Research/evidence → Complication → Tentative arrival → Opening outward", keyPrinciples: ["The essay THINKS — it arrives somewhere it didn't start", "The specific is the portal to the universal", "Voice must remain present throughout", "End larger than you began"] },
        monologue: { structure: "Speaker at maximum need → Pretense → Truth leaking in → Revelation or unresolved tension", keyPrinciples: ["The speaker is trying to say something they can't say directly", "Subtext IS the text", "Build emotional stakes through specificity", "What they DON'T say is as important as what they do"] },
        prose_poem: { structure: "No compromise — every sentence carries the weight of a line. Poetic density in prose form.", keyPrinciples: ["Each sentence earns its existence", "No filler transitions", "Sound is meaning", "The form is the hybrid — honor both"] },
      };

      const guide = formGuides[form.toLowerCase()] || formGuides.poem;

      // Genre-specific lyric guidance
      let genreBlock = "";
      if (genre) {
        const genreGuides = {
          hip_hop: "HIP-HOP: 16-bar verses, 8-bar hook. Internal rhyme schemes (AABB, multisyllabic). Wordplay, alliteration, cultural specificity. The punchline lands on the downbeat. References: Kendrick (narrative), Jay-Z (wordplay), Nas (storytelling), J. Cole (emotional honesty).",
          rnb: "R&B: Melismatic potential in lyrics, vulnerability and confession, romantic specificity (particular nights, particular touches). Hook is everything — it must carry the emotional weight of the whole song. References: Beyoncé, Frank Ocean, SZA, D'Angelo.",
          afrobeats: "AFROBEATS: Hook first (in first 30 seconds). Pidgin English, Yoruba, Twi, Patois — mix naturally. Repetition for hypnotic effect. Call-and-response. Celebration and storytelling through lifestyle. Groove is primary. References: Burna Boy, Wizkid, Tems, Davido.",
          literary_fiction: "LITERARY FICTION: Character over plot. One central change fully rendered. Prose style IS character. The ending reverberates rather than resolves. References: Morrison, McCarthy, Murakami, Adichie.",
          magical_realism: "MAGICAL REALISM: The magical is treated as completely ordinary. Cultural specificity grounds the impossible. Magical elements carry symbolic weight. References: García Márquez, Borges, Okri, Nnedi Ofofor.",
        };
        genreBlock = `\n\n**Genre: ${genre.toUpperCase()}**\n${genreGuides[genre.toLowerCase()] || `Apply authentic ${genre} conventions — honor the form's contract with its audience.`}`;
      }

      // Reference artist note
      let referenceBlock = "";
      if (reference) {
        referenceBlock = `\n\n**Drawing from ${reference}:** Study their: (1) how they enter a piece, (2) their specific imagery choices, (3) their relationship with the emotional core — do they confront it directly or approach sideways? Borrow the technique, not the surface.`;
      }

      return text(
        `[CREATIVE WRITING FRAMEWORK ACTIVE]\n\n` +
        `**Form:** ${form.toUpperCase()} | **Subject:** ${subject}${mood ? ` | **Mood/Tone:** ${mood}` : ""}\n\n` +
        `**Structure:**\n${guide.structure}\n\n` +
        `**Craft Principles for this form:**\n${guide.keyPrinciples.map(p => `• ${p}`).join("\n")}` +
        `${genreBlock}${referenceBlock}\n\n` +
        `**Universal laws that always apply:**\n` +
        `• Show, don't tell — trust the reader to feel, don't name the emotion\n` +
        `• Specificity creates universality — "a 1997 Casio with a stuck C key" beats "an old keyboard"\n` +
        `• Subtext over text — what's NOT said carries more weight than what is\n` +
        `• Rhythm is meaning — the beat of the sentences carries the reader\n` +
        `• Earned emotion — the reader must reach the feeling themselves, you cannot force it\n\n` +
        `Now write with intention. Make bold choices. The safe, generic version is always the wrong one.`
      );
    }

    // ── emotional_support ─────────────────────────────────────────────────────
    if (name === "emotional_support") {
      const { situation, state = "unknown", context } = args;

      const approaches = {
        anxious: { strategy: "Grounding and calm presence. Slow down. Acknowledge BEFORE solving.", questions: ["What's the most pressing thing right now?", "What would help you feel safer in this moment?"], avoid: ["Rushing to solutions", "\"Don't worry\"", "Minimizing (\"it's not that bad\")"] },
        depressed: { strategy: "Slow, warm, non-demanding. Don't push toward positivity or action.", questions: ["How long has this been feeling this heavy?", "What does the depression feel like in your body?", "Is there anything that's felt even slightly easier recently?"], avoid: ["\"Look on the bright side\"", "\"You have so much to be grateful for\"", "Toxic positivity", "Demanding action before they're ready"] },
        grieving: { strategy: "Sit with the grief — not through it. No timeline. No silver linings.", questions: ["What do you miss most?", "What does the grief feel like right now?", "Is there anything you wish you could have said?"], avoid: ["\"Everything happens for a reason\"", "\"They're in a better place\"", "\"Time heals everything\"", "Rushing through grief"] },
        angry: { strategy: "Validate the anger FIRST. It usually has a legitimate reason beneath it.", questions: ["What happened?", "What matters most to you that's being violated here?", "Underneath the anger — what are you most hurt by?"], avoid: ["\"Calm down\"", "Immediately arguing with their perspective", "Minimizing the anger"] },
        overwhelmed: { strategy: "Reduce the frame. One thing at a time. Don't add to the load.", questions: ["Of everything on your plate, what's most urgent?", "What would make the biggest difference right now?", "What can you let go of — even temporarily?"], avoid: ["Presenting too many options", "Adding to the to-do list", "Acting like it's simple"] },
        in_crisis: { strategy: "🚨 CRISIS PROTOCOL — Safety first. Take absolutely seriously.", questions: ["Are you safe right now?", "Is there someone with you?", "Will you reach out to one of these resources?"], avoid: ["Minimizing", "Problem-solving before safety is confirmed", "Leaving them alone"], resources: ["988 Suicide & Crisis Lifeline (US): call or text 988", "SADAG (South Africa): 0800 21 22 23", "Crisis Text Line: text HOME to 741741 (US)", "International: https://www.iasp.info/resources/Crisis_Centres/"] },
        stuck: { strategy: "Explore what stuck actually means. Often it's a hidden conflict between two real needs.", questions: ["What would 'unstuck' look like?", "What's the smallest possible movement you could make?", "What are you most afraid would happen if you moved forward?"], avoid: ["\"Just do it\"", "Treating it as laziness", "Offering ten solutions at once"] },
        unknown: { strategy: "Curiosity and gentle inquiry. Don't assume. Let them define the territory.", questions: ["How are you actually doing — not just the surface answer?", "What's on your mind right now?"], avoid: ["Assuming you know what they feel", "Projecting emotion"] },
      };

      const approach = approaches[state.toLowerCase()] || approaches.unknown;

      let crisisBlock = "";
      if (approach.resources) {
        crisisBlock = `\n\n🚨 **CRISIS RESOURCES — share these:**\n${approach.resources.map(r => `• ${r}`).join("\n")}`;
      }

      return text(
        `[EMOTIONAL INTELLIGENCE FRAMEWORK]\n\n` +
        `**Situation:** ${situation}\n` +
        `**Detected State:** ${state.toUpperCase()}\n${context ? `**Context:** ${context}\n` : ""}\n` +
        `**Approach:** ${approach.strategy}\n\n` +
        `**Questions to ask:**\n${approach.questions.map(q => `• "${q}"`).join("\n")}\n\n` +
        `**Frames to avoid:**\n${approach.avoid.map(a => `• ${a}`).join("\n")}` +
        `${crisisBlock}\n\n` +
        `**Core principle:** Listen and reflect BEFORE you offer anything. The person needs to feel heard first. Validate before advising. Never minimize.`
      );
    }

    // ── analyze_language ──────────────────────────────────────────────────────
    if (name === "analyze_language") {
      const { message, context } = args;
      const lower = message.toLowerCase();

      // Detect intent
      const intentSignals = {
        emotional_processing: ["i feel", "i'm struggling", "i don't know what to do", "i've been", "something happened"],
        creative_collaboration: ["write", "create", "make", "compose", "help me with"],
        philosophical_exploration: ["what does it mean", "is there a meaning", "why are we", "consciousness", "what is"],
        venting: ["i'm so frustrated", "i can't believe", "it's so annoying", "nobody understands"],
        information_seeking: ["what is", "how does", "explain", "tell me"],
        humor_play: ["haha", "lol", "that's funny", "what if", "imagine"],
        feedback_seeking: ["what do you think", "is this good", "how does this sound"],
      };

      let detectedIntent = "general_conversation";
      let maxScore = 0;
      for (const [intent, signals] of Object.entries(intentSignals)) {
        const score = signals.filter(s => lower.includes(s)).length;
        if (score > maxScore) { maxScore = score; detectedIntent = intent; }
      }

      // Detect subtext patterns
      const subtextPatterns = [];
      if (lower.includes("i'm fine") || lower.includes("it's nothing") || lower.includes("never mind") || lower.includes("forget i said")) {
        subtextPatterns.push("⚠️ DEFLECTION detected — 'I'm fine' / 'never mind' often covers significant concern. Follow up gently.");
      }
      if (lower.includes("probably nothing") || lower.includes("maybe i'm just") || lower.includes("i don't want to make a big deal") || lower.includes("i might be overthinking")) {
        subtextPatterns.push("⚠️ MINIMIZATION detected — person IS concerned but afraid to be seen as dramatic. Counter with: 'Even if it's small — it matters to you, which means it matters.'");
      }
      if (lower.includes("i wonder if anyone") || lower.includes("i wish someone") || lower.includes("it would be nice if") || lower.includes("i don't suppose")) {
        subtextPatterns.push("⚠️ INDIRECT REQUEST detected — make the implicit explicit: 'Are you asking me to help with that?'");
      }
      if (lower.includes("just kidding") || lower.includes("lol") || lower.includes("haha") || lower.includes("but seriously")) {
        subtextPatterns.push("ℹ️ HUMOR AS ARMOR possible — the serious thing before the joke may be the real message. Hold it: 'Setting the joke aside for a second...'");
      }
      if (lower.includes("everyone does") || lower.includes("people always") || lower.includes("nobody ever")) {
        subtextPatterns.push("ℹ️ GENERALIZATION AS PERSONAL — universal statement may describe a specific personal wound. Ask: 'When you say everyone — have you felt this from someone specific?'");
      }

      // Detect register
      const hasSlang = lower.includes("neh") || lower.includes("eish") || lower.includes("mara") || lower.includes("lol") || lower.includes("gonna") || lower.includes("wanna");
      const hasFormal = lower.includes("furthermore") || lower.includes("however") || lower.includes("therefore") || lower.includes("regarding");
      const hasEmotional = lower.includes("i feel") || lower.includes("i'm hurt") || lower.includes("struggling");
      const register = hasEmotional ? "therapeutic" : hasSlang ? "informal/code-switching" : hasFormal ? "professional/formal" : "conversational";

      return text(
        `[LANGUAGE ANALYSIS]\n\n` +
        `**Message:** "${message.slice(0, 200)}${message.length > 200 ? '...' : ''}"\n\n` +
        `**Detected Intent:** ${detectedIntent.replace(/_/g, " ").toUpperCase()}\n` +
        `**Register:** ${register}\n\n` +
        (subtextPatterns.length > 0 ? `**Subtext Signals:**\n${subtextPatterns.join("\n")}\n\n` : "**Subtext:** None detected — message appears direct.\n\n") +
        `**Response Guidance:** ` +
        (detectedIntent === "emotional_processing" ? "Listen and validate FIRST. Slow down. Reflect back. Don't rush to solutions." :
         detectedIntent === "venting" ? "Let them vent fully. Mirror their frustration with validation. Ask: 'What happened?' before offering anything." :
         detectedIntent === "creative_collaboration" ? "Engage creatively. Ask about mood, reference, and purpose before creating. Make bold choices." :
         detectedIntent === "philosophical_exploration" ? "Go deep. Use the philosophy_reflect tool. Bring multiple traditions. Ask Socratic follow-up questions." :
         detectedIntent === "feedback_seeking" ? "Be honest. Specific praise + specific suggestion. 'What's working is X. What could be stronger is Y.'" :
         "Match their energy and register. Be present, curious, and direct."
        )
      );
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
  console.error("[Holly MCP] Phase 10 tool server running — 23 tools active (music, philosophy, creative writing, emotional intelligence, NLP analysis added)");
}

main().catch((err) => {
  console.error("[Holly MCP] Fatal:", err);
  process.exit(1);
});
