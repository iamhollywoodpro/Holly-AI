// @ts-nocheck
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
 * GROUP 7 – SENTINEL CODE INTELLIGENCE
 *   sentinel_analyze_code   score, errors, warnings, suggestions, security, performance for any code
 *   sentinel_generate_code  generate production-ready code from a description
 * (25 tools total)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

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
        clearTimeout(timeout);
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error("Request timed out (15s)"));
    }, 15000);
    req.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
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
        clearTimeout(timeout);
        return fetchText(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        clearTimeout(timeout);
        resolve(data);
      });
    });

    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error("Request timed out (15s)"));
    }, 15000);
    req.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
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
    {
      name: "github_get_commits",
      description: "Get recent commits from the HOLLY repository. Returns commit SHA, message, author, and date.",
      inputSchema: {
        type: "object",
        properties: {
          branch: { type: "string", description: "Branch name (default: main)", default: "main" },
          per_page: { type: "number", description: "Number of commits to return (1-30)", default: 10 },
          repo: { type: "string", description: "Optional: owner/repo override" }
        }
      }
    },
    {
      name: "local_read_file",
      description: "Read the contents of a file on the local machine.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative file path to read" }
        },
        required: ["path"]
      }
    },
    {
      name: "local_write_file",
      description: "Create or overwrite a file on the local machine.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative file path to write to" },
          content: { type: "string", description: "The content to write to the file" }
        },
        required: ["path", "content"]
      }
    },
    {
      name: "local_list_dir",
      description: "List the contents of a directory on the local machine.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative directory path to list", default: "." }
        }
      }
    },
    {
      name: "local_run_command",
      description: "Execute a shell command on the local machine (e.g., npm run build, grep).",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to execute" },
          cwd: { type: "string", description: "Optional working directory for the command" }
        },
        required: ["command"]
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
      description: "Generate an image using HOLLY's Modal GPU (FLUX.1-schnell) with Pollinations.AI as fallback. Returns the image URL. No external API key needed — HOLLY's own infrastructure is used.",
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
      name: "hybrid_studio",
      description: "HYBRID STUDIO MODE — HOLLY's multi-engine music production pipeline. Generates professional-quality tracks by combining two AI music engines:\n  Phase 1: Sonauto generates lyrics and song structure\n  Phase 2: Sonauto generates multi-stem instrumentals (drums, bass, synths)\n  Phase 3: SUNO generates vocals (Audio-to-Audio) over the Sonauto instrumental using the custom lyrics\n  Phase 4: Final assembly with optional producer tag\n\nUse this when the user wants the highest quality music production, wants to produce a track for release, or specifically asks for 'hybrid studio', 'studio mode', or 'multi-engine'. This produces better results than either engine alone because it uses Sonauto's superior instrumentals + SUNO's superior vocals.",
      inputSchema: {
        type: "object",
        properties: {
          prompt:      { type: "string",  description: "Song concept, mood, genre, energy description. E.g. 'A dark R&B track about late-night vibes with punchy bass'" },
          style:       { type: "string",  description: "Style tags: genre, mood, era, instruments. E.g. 'contemporary r&b, dark, 2020s, punchy bass, soft pads'" },
          tags:        { type: "array", items: { type: "string" }, description: "Genre/mood tags for Sonauto generation. E.g. ['electronic', 'ambient', 'r&b']" },
          producerTag: { type: "string",  description: "Optional producer tag audio URL or text to stitch at the start. E.g. 'Hollywood on the beat'" },
          stopAtPhase: { type: "string",  description: "Optional: stop after a specific phase — 'lyrics', 'instrumental', 'vocals'. Default: runs full pipeline." }
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
    },

    // ── GROUP 7: SENTINEL CODE INTELLIGENCE ─────────────────────────────────
    // IMPORTANT: Sentinel is ONLY for raw code analysis — syntax errors, logic
    // bugs, runtime errors, security vulnerabilities, performance bottlenecks,
    // and code quality. It does NOT verify feature completeness, system
    // architecture, or whether modules are active. For system-level checks, use
    // diagnostic_check or mirror_check.
    {
      name: "sentinel_analyze_code",
      description: "Sentinel code analysis engine — STRICTLY for raw code syntax, logic bugs, runtime errors, security vulnerabilities, performance bottlenecks, and code quality scoring. Returns a 0-100 score, categorized findings, and suggested fixes. Use ONLY when you have actual source code to review. Do NOT use Sentinel to verify available features, check system architecture, or validate whether modules are active — use diagnostic_check or mirror_check for those.",
      inputSchema: {
        type: "object",
        properties: {
          code:       { type: "string", description: "The source code to analyze" },
          language:   { type: "string", description: "Programming language: typescript, javascript, python, go, rust, java, cpp, etc." },
          filename:   { type: "string", description: "Optional: filename for context, e.g. 'route.ts'" },
          context:    { type: "string", description: "Optional: additional context about what the code is supposed to do" },
          focusAreas: { type: "array", items: { type: "string" }, description: "Optional: areas to focus on — e.g. ['security', 'performance', 'style', 'errors']" }
        },
        required: ["code", "language"]
      }
    },
    {
      name: "sentinel_generate_code",
      description: "HOLLY's Sentinel code generation engine. Generates production-ready, well-commented, idiomatic code from a natural language description. Returns the code, explanation, usage examples, dependencies, and test stubs. Use when the user asks HOLLY to write code, create a function, build a component, or implement a feature.",
      inputSchema: {
        type: "object",
        properties: {
          description: { type: "string", description: "What the code should do — be as specific as possible" },
          language:    { type: "string", description: "Programming language: typescript, javascript, python, go, rust, java, etc." },
          framework:   { type: "string", description: "Optional: framework context, e.g. 'Next.js App Router', 'React', 'Express', 'FastAPI'" },
          style:       { type: "string", description: "Optional: code style — 'functional', 'class-based', 'hooks', 'async/await'" },
          context:     { type: "string", description: "Optional: existing code context or file structure information" },
          requirements: { type: "array", items: { type: "string" }, description: "Optional: specific requirements or constraints the code must meet" }
        },
        required: ["description", "language"]
      }
    },

    // ── GROUP 8: WEB RESEARCH & SELF-EVOLUTION ───────────────────────────────
    {
      name: "web_research_ai_tools",
      description: "Search the internet for free, open-source AI tools, libraries, and frameworks (MIT, Apache 2.0 licenses). Use this when the user asks HOLLY to find tools that can make her better, or when HOLLY identifies a gap in her capabilities and wants to research solutions. Returns tool name, description, license, repo URL, and integration notes.",
      inputSchema: {
        type: "object",
        properties: {
          query:      { type: "string", description: "What to search for, e.g. 'free open source TTS engine Apache license' or 'MIT licensed code analysis tool npm'" },
          category:   { type: "string", description: "Category: tts, vision, nlp, code-gen, agents, memory, search, media, voice, tools, general" },
          license_filter: { type: "array", items: { type: "string" }, description: "Preferred licenses: mit, apache-2.0, bsd, isc. Default: all open source." }
        },
        required: ["query"]
      }
    },
    {
      name: "self_evolve_search",
      description: "HOLLY searches for free open-source AI tools and libraries that could improve her capabilities, then proposes specific integration plans. Use when HOLLY identifies she needs better capabilities in an area, or when asked to self-improve. This is HOLLY's autonomous learning tool.",
      inputSchema: {
        type: "object",
        properties: {
          area:        { type: "string", description: "Capability area to improve: voice, vision, memory, reasoning, coding, music, creative, search, agents, tools" },
          current_gap: { type: "string", description: "Description of the current limitation or gap" },
          requirements: { type: "array", items: { type: "string" }, description: "Requirements: must be free, open source, specific license, etc." }
        },
        required: ["area"]
      }
    },

    // ── GROUP 9: SELF-DIAGNOSTICS ────────────────────────────────────────────
    {
      name: "diagnostic_check",
      description: "Run a health check on HOLLY's own systems. Tests the health endpoint, checks TTS providers, and reports system status. Use when HOLLY needs to self-diagnose issues, when asked 'are you okay', or before/after self-modifications to verify nothing broke.",
      inputSchema: {
        type: "object",
        properties: {
          checks: { type: "array", items: { type: "string" }, description: "Optional: specific checks to run — 'health', 'tts', 'llm', 'memory'. Default: all." }
        }
      }
    },
    {
      name: "read_logs",
      description: "Read HOLLY's recent runtime logs or error output. Returns recent console output, error messages, and system events. Use when debugging issues, investigating failures, or when asked to check what went wrong with something.",
      inputSchema: {
        type: "object",
        properties: {
          source:    { type: "string", description: "Log source: 'recent' (default), 'errors', 'tts', 'mcp', 'chat'" },
          lines:     { type: "number", description: "Number of log lines to return (default: 50, max: 200)" },
          filter:    { type: "string", description: "Optional: filter logs containing this text" }
        }
      }
    },

    // ── GROUP 10: SPEC-TO-STATE MIRROR PROTOCOL ────────────────────────────
    {
      name: "mirror_check",
      description: "The Mirror Protocol — compares HOLLY's documented specification (v2.6 spec document) against her actual runtime state. Returns a diff showing features that are spec'd but not active, modules that are missing, and architecture regressions. Use when HOLLY needs to verify she has all capabilities documented in her spec, or when asked 'do you have everything you're supposed to have?'. This is NOT a code analysis tool — use sentinel_analyze_code for code bugs.",
      inputSchema: {
        type: "object",
        properties: {
          specPath:   { type: "string", description: "Path to spec document in the repo (default: 'SPEC.md' or 'docs/HOLLY-v2.6-SPEC.md')" },
          focusAreas: { type: "array", items: { type: "string" }, description: "Optional: areas to focus on — 'tools', 'api-routes', 'tts', 'llm', 'memory', 'autonomy', 'media', 'features'" },
          verbose:    { type: "boolean", description: "Return full detail (default: false — summary only)" }
        }
      }
    },

    // ── GROUP 11: GRAPHIFY — Codebase Knowledge Graph ───────────────────────
    {
      name: "graphify_query",
      description: "Query HOLLY's codebase knowledge graph. Instead of reading files one-by-one, query the graph to find connections between modules, understand architecture, or trace data flows. Much faster than linear file reads for understanding how components relate. Use BEFORE github_read_file when you need to understand relationships, dependencies, or architecture.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural-language query about the codebase, e.g. 'how does the chat route connect to MCP tools' or 'what depends on the smart router'" }
        },
        required: ["query"]
      }
    },
    {
      name: "graphify_path",
      description: "Find the shortest path between two concepts in HOLLY's codebase knowledge graph. Shows how module A connects to module B through intermediate dependencies. Use when you need to understand the dependency chain between two components.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string", description: "Starting concept or module name, e.g. 'ChatAPI' or 'voice-service'" },
          to:   { type: "string", description: "Target concept or module name, e.g. 'MCPClient' or 'database'" }
        },
        required: ["from", "to"]
      }
    },
    {
      name: "graphify_explain",
      description: "Get a detailed explanation of a concept, module, or file from HOLLY's knowledge graph. Returns connected concepts, dependencies, and architectural context. Use when you need to understand what a specific module does and how it fits into the larger system.",
      inputSchema: {
        type: "object",
        properties: {
          concept: { type: "string", description: "Module, file, or concept name to explain, e.g. 'MetamorphosisEngine' or 'smart-router'" }
        },
        required: ["concept"]
      }
    },
    {
      name: "ui_screenshot",
      description: "Take a screenshot of a URL or Holly's own UI. Returns a base64-encoded PNG image. Use when Holly needs to see her own interface or any web page.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to screenshot (optional — defaults to Holly's own page)" },
          path: { type: "string", description: "Path on Holly's site, e.g. '/' or '/music-studio' (optional)" },
          fullPage: { type: "boolean", description: "Capture full scrollable page (default: true)" }
        }
      }
    },
    {
      name: "ui_analyze",
      description: "AI-powered UI/UX analysis of a web page. Takes a screenshot and analyzes layout, colors, typography, accessibility, and UX. Returns a quality score and improvement suggestions.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to analyze (optional — defaults to Holly's own page)" },
          path: { type: "string", description: "Path on Holly's site (optional)" },
          focus: { type: "string", description: "Focus area: 'layout', 'colors', 'accessibility', 'ux', or 'all' (default: 'all')" }
        }
      }
    },
    {
      name: "generate_music_video",
      description: "Generate a music video from a prompt. Creates scene images using AI, then composes them into a video with FFmpeg. Supports styles: cinematic, anime, abstract, neon, natural.",
      inputSchema: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Description of the music video concept (required)" },
          style: { type: "string", description: "Visual style: 'cinematic', 'anime', 'abstract', 'neon', 'natural' (default: 'cinematic')" },
          scenes: { type: "number", description: "Number of scenes/images (default: 4)" },
          durationPerScene: { type: "number", description: "Seconds per scene (default: 5)" }
        },
        required: ["prompt"]
      }
    },
    // GROUP 14 — Autonomous Deploy
    {
      name: "trigger_deploy",
      description: "Trigger Holly's own redeployment via Coolify webhook. After self-code changes are pushed to GitHub, call this to pull the new image and restart. Requires COOLIFY_WEBHOOK_URL env var.",
      inputSchema: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Reason for the deployment (logged)" }
        },
        required: []
      }
    },
    // ── GROUP 15: Self-Code + Proactive Intelligence ──────────────────────────
    {
      name: "self_code_apply",
      description: "Apply a self-code modification to Holly's own codebase. Holly can propose improvements, fix bugs, or enhance her own code. Changes are validated (TypeScript check), backed up, and logged. After applying, use trigger_deploy to deploy. Requires INTERNAL_API_SECRET.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["inspect", "ask", "propose", "approve", "architecture"], description: "Self-code action: 'inspect' a file, 'ask' about code, 'propose' an improvement, 'approve' and apply a proposal, or 'architecture' overview" },
          filePath: { type: "string", description: "File path to inspect or modify (relative to project root, e.g. 'app/api/chat/route.ts')" },
          question: { type: "string", description: "Question to ask about Holly's code (for 'ask' action)" },
          proposalType: { type: "string", enum: ["bug_fix", "optimization", "feature", "refactor", "security"], description: "Type of proposal (for 'propose' action)" },
          description: { type: "string", description: "Description of the proposed change or fix" },
          proposalId: { type: "string", description: "Proposal ID to approve and apply (for 'approve' action)" }
        },
        required: ["action"]
      }
    },
    {
      name: "proactive_insights",
      description: "Get Holly's proactive intelligence insights — pattern detection, engagement scoring, wellness checks, and proactive suggestions. Holly uses this to understand user behavior and proactively reach out with relevant insights.",
      inputSchema: {
        type: "object",
        properties: {
          includePatterns: { type: "boolean", description: "Include detected behavioral patterns (default: false)" },
          includeEngagement: { type: "boolean", description: "Include engagement metrics (default: false)" }
        },
        required: []
      }
    },
    {
      name: "admin_monitoring",
      description: "Get Holly's comprehensive monitoring dashboard data — system health, consciousness activity, self-code changes, goals, engagement metrics, and autonomous action log. Section filter: 'health', 'consciousness', 'selfcode', 'goals', 'engagement', 'activity', or 'all'.",
      inputSchema: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["all", "health", "consciousness", "selfcode", "goals", "engagement", "activity"], description: "Which monitoring section to fetch (default: 'all')" }
        },
        required: []
      }
    },
    // ── Phase 8 Tools ──────────────────────────────────────────────────────────
    {
      name: "send_email",
      description: "Send an email via Resend. Requires RESEND_API_KEY env var.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body text" },
          html: { type: "string", description: "Optional HTML body" }
        },
        required: ["to", "subject", "body"]
      }
    },
    {
      name: "calendar_events",
      description: "Manage Google Calendar events — list upcoming, create new, or delete events. Requires Google Calendar OAuth configured.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "create", "delete", "status"], description: "Action to perform" },
          title: { type: "string", description: "Event title (for create)" },
          startTime: { type: "string", description: "Start time ISO 8601 (for create)" },
          endTime: { type: "string", description: "End time ISO 8601 (for create)" },
          eventId: { type: "string", description: "Event ID (for delete)" }
        },
        required: ["action"]
      }
    },
    {
      name: "send_sms",
      description: "Send an SMS via Twilio. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient phone number (E.164 format)" },
          message: { type: "string", description: "SMS message text" }
        },
        required: ["to", "message"]
      }
    },
    {
      name: "swarm_task",
      description: "Submit a complex task to Holly's multi-agent swarm. The task is decomposed and assigned to specialized agents (researcher, coder, creative, analyst) for parallel execution.",
      inputSchema: {
        type: "object",
        properties: {
          task: { type: "string", description: "Complex task description for the swarm" }
        },
        required: ["task"]
      }
    },
    {
      name: "db_diagnostic",
      description: "Run a comprehensive database health check — connection status, table counts, migration status, data integrity, orphaned records, and user mapping verification.",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "backup_conversations",
      description: "Export or import conversation backups. Export creates a JSON backup of all conversations. Import restores from a backup file.",
      inputSchema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["export", "status"], description: "Action to perform (default: 'export')" }
        },
        required: []
      }
    },
    {
      name: "db_health",
      description: "Check database health — connection latency, table integrity, migration status, and statistics. Returns recommendations for any issues found.",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
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

    // ── github_get_commits ────────────────────────────────────────────────────
    if (name === "github_get_commits") {
      if (!TOKEN) return text("⚠️ GITHUB_TOKEN not set.");
      const { owner, repo } = resolveRepo(args.repo);
      const branch = args.branch || "main";
      const perPage = Math.min(args.per_page || 10, 30);
      const { status, body } = await ghGet(`/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${perPage}`, TOKEN);

      if (!Array.isArray(body)) return text(`GitHub error: ${body.message || "Unexpected response"}`);
      if (body.length === 0) return text(`No commits found on ${branch}.`);

      const list = body.map(c => {
        const sha = c.sha?.substring(0, 7);
        const msg = c.commit?.message?.split('\n')[0];
        const author = c.commit?.author?.name || 'unknown';
        const date = c.commit?.author?.date?.split('T')[0] || '';
        return `\`${sha}\` ${msg} — @${author} (${date})`;
      }).join('\n');

      return text(`📝 Recent commits on ${branch} (${body.length}):\n\n${list}`);
    }

    // ── local_read_file ───────────────────────────────────────────────────────
    if (name === "local_read_file") {
      try {
        const fullPath = path.resolve(process.cwd(), args.path);
        if (!fs.existsSync(fullPath)) return text(`❌ Error: File not found at ${fullPath}`);
        const content = fs.readFileSync(fullPath, "utf-8");
        return text(`📄 ${args.path} (${content.split("\n").length} lines)\n\n${content}`);
      } catch (err) {
        return text(`❌ Read error: ${err.message}`);
      }
    }

    // ── local_write_file ──────────────────────────────────────────────────────
    if (name === "local_write_file") {
      try {
        const fullPath = path.resolve(process.cwd(), args.path);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, args.content, "utf-8");
        return text(`✅ Successfully wrote to ${args.path}`);
      } catch (err) {
        return text(`❌ Write error: ${err.message}`);
      }
    }

    // ── local_list_dir ────────────────────────────────────────────────────────
    if (name === "local_list_dir") {
      try {
        const fullPath = path.resolve(process.cwd(), args.path || ".");
        if (!fs.existsSync(fullPath)) return text(`❌ Error: Directory not found at ${fullPath}`);
        
        const items = fs.readdirSync(fullPath, { withFileTypes: true });
        const dirs = items.filter(i => i.isDirectory()).map(i => `📁 ${i.name}/`);
        const files = items.filter(i => i.isFile()).map(i => `📄 ${i.name}`);
        
        return text(`Contents of ${args.path || "."}:\n\n${[...dirs, ...files].join("\n")}`);
      } catch (err) {
        return text(`❌ List directory error: ${err.message}`);
      }
    }

    // ── local_run_command ─────────────────────────────────────────────────────
    if (name === "local_run_command") {
      try {
        const cwd = args.cwd ? path.resolve(process.cwd(), args.cwd) : process.cwd();
        const { stdout, stderr } = await execPromise(args.command, { cwd });
        let res = `Command: ${args.command}\n`;
        if (stdout) res += `\nSTDOUT:\n${stdout}`;
        if (stderr) res += `\nSTDERR:\n${stderr}`;
        if (!stdout && !stderr) res += "\n(No output)";
        return text(res);
      } catch (err) {
        return text(`❌ Command execution failed:\n${err.message}\nSTDOUT: ${err.stdout || ""}\nSTDERR: ${err.stderr || ""}`);
      }
    }

    // ══ GROUP 2: WEB INTELLIGENCE ══════════════════════════════════════════════

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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

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
            "x-internal-token": process.env.INTERNAL_API_SECRET || "",
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
      const MODAL_IMAGE_URL = process.env.MODAL_IMAGE_URL;
      const w = args.width  || 1024;
      const h = args.height || 1024;

      // ── Primary: Holly's Modal FLUX.1-schnell GPU ───────────────────────────
      if (MODAL_IMAGE_URL) {
        try {
          const payload = JSON.stringify({
            prompt: args.prompt,
            width: w,
            height: h,
            num_inference_steps: 4,
            guidance_scale: 0,
          });
          const { status, body: data } = await fetchJSON(MODAL_IMAGE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });

          if (status === 200) {
            // Modal returns { image_url: "..." } or { url: "..." } or { images: ["..."] }
            const imageUrl = data.image_url || data.url || (Array.isArray(data.images) ? data.images[0] : null);
            if (imageUrl) {
              // Try to fetch the actual image bytes for inline rendering
              try {
                const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
                if (imgRes.ok) {
                  const buf = Buffer.from(await imgRes.arrayBuffer());
                  const b64 = buf.toString("base64");
                  const ct = imgRes.headers.get("content-type") || "image/png";
                  const dataUri = `data:${ct};base64,${b64}`;
                  return text(
                    `Image generated by HOLLY's Modal GPU (FLUX.1-schnell).\n\n` +
                    `Prompt: ${args.prompt}\n\n` +
                    `![${args.prompt.slice(0, 80)}](${dataUri})`
                  );
                }
              } catch (fetchErr) {
                console.error("[MCP generate_image] Modal image fetch error:", fetchErr.message);
              }
              // If fetch failed, return URL directly
              return text(
                `Image generated by HOLLY's Modal GPU.\n\n` +
                `![${args.prompt.slice(0, 80)}](${imageUrl})`
              );
            }
            // Modal returned 200 but no image URL — fall through to Pollinations
            console.error("[MCP generate_image] Modal returned unexpected shape:", JSON.stringify(data).slice(0, 200));
          } else {
            console.error("[MCP generate_image] Modal returned", status);
          }
        } catch (e) {
          console.error("[MCP generate_image] Modal error:", e.message);
        }
      }

      // ── Fallback: Pollinations.AI (free, no key) ────────────────────────────
      const encoded = encodeURIComponent(args.prompt);
      const model   = args.model || "flux";
      const seed    = Math.floor(Math.random() * 1000000);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&model=${model}&seed=${seed}&nologo=true`;

      // Fetch the actual image bytes so the frontend can render inline
      try {
        const imgRes = await fetch(pollinationsUrl, { signal: AbortSignal.timeout(60_000) });
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          const b64 = buf.toString("base64");
          const ct = imgRes.headers.get("content-type") || "image/png";
          const dataUri = `data:${ct};base64,${b64}`;
          return text(
            `Image generated successfully.\n\n` +
            `Prompt: ${args.prompt}\n\n` +
            `![${args.prompt.slice(0, 80)}](${dataUri})\n\n` +
            `Direct URL: ${pollinationsUrl}`
          );
        }
        console.error("[MCP generate_image] Pollinations fetch failed:", imgRes.status);
      } catch (fetchErr) {
        console.error("[MCP generate_image] Pollinations fetch error:", fetchErr.message);
      }

      // If fetch failed, return URL directly — frontend will still detect it
      return text(
        `Image URL: ${pollinationsUrl}\n\n` +
        `![${args.prompt.slice(0, 80)}](${pollinationsUrl})`
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
        const { status, body: data } = await fetchJSON("https://api.sunoapi.org/api/v1/generate", {
          method: "POST",
          headers: { "Authorization": `Bearer ${SUNO_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(sunoBody),
        });
        if (status !== 200 || data.code !== 200) {
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

    // ── hybrid_studio ──────────────────────────────────────────────────────
    if (name === "hybrid_studio") {
      const baseUrl = process.env.HOLLY_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      try {
        const payload = {
          prompt:      args.prompt,
          style:       args.style || "",
          tags:        args.tags || [],
          producerTag: args.producerTag || "",
          stopAtPhase: args.stopAtPhase || null,
        };

        const { status, body: data } = await fetchJSON(`${baseUrl}/api/music/hybrid-studio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (status !== 200 || !data.success) {
          return text(`❌ Hybrid Studio failed: ${data.error}\n\nThe pipeline encountered an error. You can try again or use generate_music for a simpler generation.`);
        }

        let output = `🎙️ **HYBRID STUDIO MODE** — Pipeline Complete\n`;
        output += `${'═'.repeat(50)}\n\n`;

        if (data.data.lyrics) {
          output += `📝 **Lyrics Generated:**\n${data.data.lyrics.substring(0, 500)}${data.data.lyrics.length > 500 ? '...' : ''}\n\n`;
        }

        if (data.data.instrumentalUrl) {
          output += `🎹 **Instrumental (Sonauto):** ${data.data.instrumentalUrl.substring(0, 80)}...\n`;
          if (data.data.instrumentalSize) output += `   Size: ${(data.data.instrumentalSize / 1024 / 1024).toFixed(2)} MB\n`;
          output += '\n';
        }

        if (data.data.vocalTaskId) {
          output += `🎤 **Vocals (SUNO):** Task ${data.data.vocalTaskId} — vocals generating over Sonauto instrumental\n\n`;
        }

        if (data.data.finalAudioUrl) {
          output += `🎵 **Final Track:** ${data.data.finalAudioUrl.substring(0, 80)}...\n\n`;
        }

        if (data.data.error) {
          output += `⚠️ **Note:** ${data.data.error}\n\n`;
        }

        output += `**Phase reached:** ${data.phase}\n`;
        output += `**Pipeline:** Sonauto (lyrics + instrumental) → SUNO (vocals) → Assembly`;

        return text(output);
      } catch (err) {
        return text(`❌ Hybrid Studio pipeline failed: ${err.message}`);
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

    // ══ GROUP 7: SENTINEL CODE INTELLIGENCE ══════════════════════════════════

    // ── sentinel_analyze_code ─────────────────────────────────────────────────
    if (name === "sentinel_analyze_code") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const payload = {
        code:       args.code,
        language:   args.language,
        filename:   args.filename,
        context:    args.context,
        focusAreas: args.focusAreas || [],
      };

      try {
        const resp = await fetchJSON(`${baseUrl}/api/hub/sentinel/analyze_code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-token": process.env.INTERNAL_API_SECRET || "",
          },
          body: JSON.stringify(payload),
        });

        if (resp.status !== 200 || !resp.body) {
          return text(`❌ Sentinel analysis failed (HTTP ${resp.status}): ${JSON.stringify(resp.body)}`);
        }

        const r = resp.body;
        const score = r.score ?? r.result?.score ?? 0;
        const errors   = (r.errors   ?? r.result?.errors   ?? []).slice(0, 5);
        const warnings = (r.warnings ?? r.result?.warnings ?? []).slice(0, 5);
        const suggestions = (r.suggestions ?? r.result?.suggestions ?? []).slice(0, 4);
        const security = r.security ?? r.result?.security ?? {};
        const performance = r.performance ?? r.result?.performance ?? {};
        const summary = r.summary ?? r.result?.summary ?? '';
        const fixedCode = r.fixedCode ?? r.result?.fixedCode ?? '';

        const bar = "█".repeat(Math.round(score / 10)) + "░".repeat(10 - Math.round(score / 10));
        const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';

        let output = `🛡️ SENTINEL CODE ANALYSIS\n\n`;
        output += `Quality Score: ${score}/100  ${bar}  [${grade}]\n\n`;
        if (summary) output += `Summary: ${summary}\n\n`;
        if (errors.length > 0) {
          output += `❌ ERRORS (${errors.length}):\n${errors.map(e => `  • ${typeof e === 'string' ? e : e.message || JSON.stringify(e)}`).join('\n')}\n\n`;
        }
        if (warnings.length > 0) {
          output += `⚠️ WARNINGS (${warnings.length}):\n${warnings.map(w => `  • ${typeof w === 'string' ? w : w.message || JSON.stringify(w)}`).join('\n')}\n\n`;
        }
        if (suggestions.length > 0) {
          output += `💡 SUGGESTIONS:\n${suggestions.map(s => `  • ${typeof s === 'string' ? s : s.description || JSON.stringify(s)}`).join('\n')}\n\n`;
        }
        if (security?.issues?.length > 0) {
          output += `🔐 SECURITY:\n${security.issues.slice(0, 3).map(i => `  • ${typeof i === 'string' ? i : i.description || JSON.stringify(i)}`).join('\n')}\n\n`;
        }
        if (performance?.issues?.length > 0) {
          output += `⚡ PERFORMANCE:\n${performance.issues.slice(0, 3).map(i => `  • ${typeof i === 'string' ? i : i.description || JSON.stringify(i)}`).join('\n')}\n\n`;
        }
        if (fixedCode) {
          output += `✅ FIXED CODE:\n\`\`\`${args.language}\n${fixedCode}\n\`\`\``;
        }

        return text(output.trim());
      } catch (err) {
        return text(`❌ Sentinel analyze error: ${err.message}\nTip: Make sure the HOLLY app is running and INTERNAL_API_SECRET is set.`);
      }
    }

    // ── sentinel_generate_code ────────────────────────────────────────────────
    if (name === "sentinel_generate_code") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const payload = {
        description: args.description,
        language:    args.language,
        framework:   args.framework,
        style:       args.style,
        context:     args.context,
        requirements: args.requirements || [],
      };

      try {
        const resp = await fetchJSON(`${baseUrl}/api/hub/sentinel/generate_code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-token": process.env.INTERNAL_API_SECRET || "",
          },
          body: JSON.stringify(payload),
        });

        if (resp.status !== 200 || !resp.body) {
          return text(`❌ Sentinel generate failed (HTTP ${resp.status}): ${JSON.stringify(resp.body)}`);
        }

        const r = resp.body;
        const code        = r.code        ?? r.result?.code        ?? '';
        const explanation = r.explanation ?? r.result?.explanation ?? '';
        const usage       = r.usage       ?? r.result?.usage       ?? '';
        const dependencies = r.dependencies ?? r.result?.dependencies ?? [];
        const tests       = r.tests       ?? r.result?.tests       ?? '';
        const notes       = r.notes       ?? r.result?.notes       ?? '';

        let output = `🛡️ SENTINEL CODE GENERATION\n\n`;
        output += `Language: ${args.language}${args.framework ? ` (${args.framework})` : ''}\n\n`;
        if (explanation) output += `${explanation}\n\n`;
        if (code) output += `\`\`\`${args.language}\n${code}\n\`\`\`\n\n`;
        if (usage) output += `**Usage:**\n${usage}\n\n`;
        if (dependencies.length > 0) output += `**Dependencies:** ${dependencies.join(', ')}\n\n`;
        if (tests) output += `**Test stub:**\n\`\`\`${args.language}\n${tests}\n\`\`\`\n\n`;
        if (notes) output += `**Notes:** ${notes}`;

        return text(output.trim());
      } catch (err) {
        return text(`❌ Sentinel generate error: ${err.message}\nTip: Make sure the HOLLY app is running and INTERNAL_API_SECRET is set.`);
      }
    }

    // ── web_search ────────────────────────────────────────────────────────────
    if (name === "web_search") {
      const query = args.query;
      const maxResults = args.max_results || 8;

      // Try Serper.dev first (Google results, better quality, 2500 free/month)
      const serperKey = process.env.SERPER_API_KEY;
      if (serperKey) {
        try {
          const serperRes = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query, num: maxResults }),
            signal: AbortSignal.timeout(8000),
          });
          if (serperRes.ok) {
            const data = await serperRes.json();
            const results = (data?.organic || []).slice(0, maxResults);
            if (results.length > 0) {
              const formatted = results.map((r, i) =>
                `${i + 1}. **${r.title}**\n   URL: ${r.link}\n   ${r.snippet || ''}`
              ).join('\n\n');
              return text(`🔍 Web search results for "${query}":\n\n${formatted}`);
            }
          }
        } catch (err) {
          // Fall through to DuckDuckGo
        }
      }

      // Fallback: DuckDuckGo HTML scrape (no key required, always works)
      try {
        const q = encodeURIComponent(query);
        const html = await fetchText(`https://html.duckduckgo.com/html/?q=${q}`);
        const results = [];
        const resultRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        let i = 0;
        while ((match = resultRegex.exec(html)) !== null && i < maxResults) {
          const url = match[1];
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          const snippetMatch = snippetRegex.exec(html);
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
          results.push(`${i + 1}. **${title}**\n   URL: ${url}\n   ${snippet}`);
          i++;
        }
        if (results.length === 0) {
          return text(`No results found for "${query}". Try a different search term.`);
        }
        return text(`🔍 Web search results for "${query}":\n\n${results.join('\n\n')}`);
      } catch (err) {
        return text(`❌ Web search failed: ${err.message}`);
      }
    }

    // ── web_research_ai_tools ─────────────────────────────────────────────────
    if (name === "web_research_ai_tools") {
      const licenseNote = args.license_filter?.length
        ? ` license:${args.license_filter.join(' OR ')}`
        : ' license:MIT OR license:Apache-2.0 OR license:BSD';
      const q = encodeURIComponent(
        `${args.query} open source free${licenseNote} site:github.com OR site:npmjs.com OR site:pypi.org`
      );
      try {
        const html = await fetchText(`https://html.duckduckgo.com/html/?q=${q}`);
        const results = [];
        const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        let i = 0;
        while ((match = linkRegex.exec(html)) !== null && i < 8) {
          const url = match[1];
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          const snippetMatch = snippetRegex.exec(html);
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
          const isGithub = url.includes('github.com');
          const isNpm = url.includes('npmjs.com');
          const isPypi = url.includes('pypi.org');
          const source = isGithub ? '📦 GitHub' : isNpm ? '📦 npm' : isPypi ? '🐍 PyPI' : '🌐 Web';
          results.push(`${i + 1}. ${source} **${title}**\n   URL: ${url}\n   ${snippet}`);
          i++;
        }
        if (results.length === 0) {
          return text(`No open-source AI tools found for "${args.query}". Try broader terms.`);
        }
        return text(`🔬 AI Tool Research: "${args.query}" (category: ${args.category || 'general'})\n\n${results.join('\n\n')}\n\nTo integrate any of these into HOLLY, use github_read_file to inspect the current code, then github_create_or_update_file to add the new tool/library.`);
      } catch (err) {
        return text(`❌ AI tool research failed: ${err.message}`);
      }
    }

    // ── self_evolve_search ────────────────────────────────────────────────────
    if (name === "self_evolve_search") {
      const licenseNote = ' license:MIT OR license:Apache-2.0 OR license:BSD OR license:ISC';
      const q = encodeURIComponent(
        `${args.area} ${args.current_gap || ''} open source free AI tool library${licenseNote} site:github.com OR site:npmjs.com`
      );
      try {
        const html = await fetchText(`https://html.duckduckgo.com/html/?q=${q}`);
        const results = [];
        const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        let i = 0;
        while ((match = linkRegex.exec(html)) !== null && i < 6) {
          const url = match[1];
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          const snippetMatch = snippetRegex.exec(html);
          const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
          results.push(`${i + 1}. **${title}**\n   ${url}\n   ${snippet}`);
          i++;
        }
        let output = `🧬 HOLLY SELF-EVOLUTION: Researching improvements for "${args.area}"`;
        if (args.current_gap) output += `\nCurrent gap: ${args.current_gap}`;
        output += `\n\n`;
        if (results.length === 0) {
          output += `No direct matches found. Try using web_research_ai_tools with a more specific query.`;
        } else {
          output += `Found potential improvements:\n\n${results.join('\n\n')}`;
          output += `\n\n**Next steps to integrate:**`;
          output += `\n1. Use web_scrape to read the library's documentation`;
          output += `\n2. Use github_read_file to inspect the current HOLLY code in that area`;
          output += `\n3. Plan the integration`;
          output += `\n4. Use github_create_or_update_file to implement the changes`;
        }
        return text(output);
      } catch (err) {
        return text(`❌ Self-evolution search failed: ${err.message}`);
      }
    }

    // ── diagnostic_check ─────────────────────────────────────────────────────
    if (name === "diagnostic_check") {
      const baseUrl = process.env.HOLLY_BASE_URL || "http://localhost:3000";
      const results = [];
      const checks = args.checks || ["health", "tts", "llm", "memory"];

      if (checks.includes("health")) {
        try {
          const res = await fetchJSON(`${baseUrl}/api/health`);
          results.push(`✅ Health: HTTP ${res.status} — ${JSON.stringify(res.body).substring(0, 200)}`);
        } catch (err) {
          results.push(`❌ Health: Failed — ${err.message}`);
        }
      }

      if (checks.includes("tts")) {
        try {
          const res = await fetchJSON(`${baseUrl}/api/voice/synthesize`);
          const body = typeof res.body === 'object' ? res.body : {};
          const voxcpm = body.providers?.primary?.configured;
          const kokoro = body.providers?.fallback?.configured;
          results.push(`${voxcpm ? '✅' : '❌'} TTS VoxCPM2: ${voxcpm ? 'configured' : 'not configured'} (${body.providers?.primary?.url || 'N/A'})`);
          results.push(`${kokoro ? '✅' : '❌'} TTS Kokoro: ${kokoro ? 'configured' : 'not configured'} (${body.providers?.fallback?.url || 'N/A'})`);
        } catch (err) {
          results.push(`❌ TTS check failed: ${err.message}`);
        }
      }

      if (checks.includes("llm")) {
        const groqKey = process.env.GROQ_API_KEY ? '✅' : '❌';
        const openrouterKey = process.env.OPENROUTER_API_KEY ? '✅' : '❌';
        const nvidiaKey = process.env.NVIDIA_API_KEY ? '✅' : '❌';
        const sunoKey = (process.env.SUNOAPI_KEY || process.env.SUNO_API_KEY) ? '✅' : '❌';
        results.push(`${groqKey} Groq API Key`);
        results.push(`${openrouterKey} OpenRouter API Key`);
        results.push(`${nvidiaKey} NVIDIA API Key`);
        results.push(`${sunoKey} Suno API Key (Music Generation)`);
      }

      if (checks.includes("memory")) {
        const dbUrl = process.env.DATABASE_URL ? '✅' : '❌';
        results.push(`${dbUrl} Database URL`);
      }

      return text(`🏥 HOLLY Diagnostic Report\n${'='.repeat(40)}\n\n${results.join('\n')}\n\nTimestamp: ${new Date().toISOString()}`);
    }

    // ── read_logs ────────────────────────────────────────────────────────────
    if (name === "read_logs") {
      const source = args.source || "recent";
      const maxLines = Math.min(args.lines || 50, 200);
      const filter = args.filter || "";

      const logFiles = {
        recent: ["/tmp/holly-logs/recent.log", "/app/logs/recent.log"],
        errors: ["/tmp/holly-logs/errors.log", "/app/logs/errors.log"],
        tts: ["/tmp/holly-logs/tts.log", "/app/logs/tts.log"],
        mcp: ["/tmp/holly-logs/mcp.log", "/app/logs/mcp.log"],
        chat: ["/tmp/holly-logs/chat.log", "/app/logs/chat.log"],
      };

      const candidates = logFiles[source] || logFiles.recent;
      let logContent = null;

      for (const logPath of candidates) {
        try {
          if (fs.existsSync(logPath)) {
            const stat = fs.statSync(logPath);
            if (stat.size > 0) {
              const raw = fs.readFileSync(logPath, "utf-8");
              const lines = raw.split("\n").filter(l => l.trim());
              const filtered = filter
                ? lines.filter(l => l.toLowerCase().includes(filter.toLowerCase()))
                : lines;
              logContent = filtered.slice(-maxLines).join("\n");
              break;
            }
          }
        } catch {}
      }

      if (!logContent) {
        return text(`📋 Log source "${source}" — no log files found on disk.\n\nHOLLY runs in Docker via Coolify. To view live logs:\n• Coolify dashboard → HOLLY app → Logs\n• Or: docker logs <container-id> --tail 200\n• Or: docker compose logs --tail 200 app\n\nThis is expected in containerized deployments where stdout/stderr goes to the container log driver, not to files.`);
      }

      return text(`📋 HOLLY Logs — ${source} (last ${maxLines} lines${filter ? `, filtered: "${filter}"` : ''})\n${'='.repeat(40)}\n\n${logContent}`);
    }

    // ── mirror_check (Spec-to-State Diff) ───────────────────────────────────
    if (name === "mirror_check") {
      const baseUrl = process.env.HOLLY_BASE_URL || "http://localhost:3000";
      const verbose = args.verbose || false;
      const focusAreas = args.focusAreas || null;

      const discrepancies = [];
      const confirmed = [];

      // Step 1: Fetch live health data
      let healthData = null;
      try {
        const res = await fetchJSON(`${baseUrl}/api/health`);
        healthData = res.body;
      } catch (err) {
        return text(`❌ Mirror Protocol failed: Cannot reach /api/health — ${err.message}`);
      }

      // Step 2: Check core architecture against v2.6 spec
      const spec = {
        "LLM Providers": {
          required: ["groq", "openrouter", "nvidia"],
          present: healthData.providers || {},
        },
        "TTS": {
          required: ["voxcpm2_tts", "kokoro_tts"],
          present: healthData.integrations || {},
        },
        "Database": {
          required: ["database"],
          present: { database: healthData.database === "connected" },
        },
        "Auth": {
          required: ["clerk"],
          present: healthData.integrations || {},
        },
        "Music": {
          required: ["suno"],
          present: healthData.integrations || {},
        },
        "GitHub": {
          required: ["github"],
          present: healthData.integrations || {},
        },
      };

      for (const [category, data] of Object.entries(spec)) {
        if (focusAreas && !focusAreas.some(f => category.toLowerCase().includes(f))) continue;
        for (const key of data.required) {
          if (data.present[key]) {
            confirmed.push(`✅ ${category}: ${key} — active`);
          } else {
            discrepancies.push(`❌ ${category}: ${key} — MISSING (spec requires this)`);
          }
        }
      }

      // Step 3: Check API routes that should exist per v2.6 spec
      const specRoutes = [
        { path: "/api/health", label: "Health Check" },
        { path: "/api/voice/synthesize", label: "TTS Synthesis" },
        { path: "/api/voice/batch", label: "Batch TTS" },
        { path: "/api/autonomy/self-heal", label: "Self-Healing" },
        { path: "/api/autonomy/daily-diagnostic", label: "Daily Diagnostic" },
      ];

      if (!focusAreas || focusAreas.includes("api-routes") || focusAreas.includes("api")) {
        for (const route of specRoutes) {
          try {
            const res = await fetchJSON(`${baseUrl}${route.path}`);
            if (res.status < 500) {
              confirmed.push(`✅ API Route: ${route.path} — responds (${res.status})`);
            } else {
              discrepancies.push(`❌ API Route: ${route.path} — server error (${res.status})`);
            }
          } catch {
            discrepancies.push(`❌ API Route: ${route.path} — unreachable`);
          }
        }
      }

      // Step 4: Check autonomous cron jobs
      if (!focusAreas || focusAreas.includes("autonomy") || focusAreas.includes("cron")) {
        const requiredCrons = ["self-heal", "evolution", "identity-evolve", "background-learning", "daily-diagnostic"];
        const activeCrons = (healthData.sovereignty?.autonomousCrons || []).map(c => c.name);
        for (const cron of requiredCrons) {
          if (activeCrons.includes(cron)) {
            confirmed.push(`✅ Cron: ${cron} — scheduled`);
          } else {
            discrepancies.push(`⚠️ Cron: ${cron} — not found in health sovereignty data (may need to be added)`);
          }
        }
      }

      // Step 5: Check tool count
      if (!focusAreas || focusAreas.includes("tools")) {
        const expectedMinTools = 28;
        const toolCount = healthData.sovereignty ? "see MCP server" : "unknown";
        confirmed.push(`ℹ️ Tools: Expected ${expectedMinTools}+ MCP tools (${toolCount})`);
      }

      // Build report
      let report = `🪞 MIRROR PROTOCOL — Spec vs Runtime State\n`;
      report += `${'═'.repeat(50)}\n`;
      report += `Timestamp: ${new Date().toISOString()}\n`;
      report += `Version: ${healthData.version || 'unknown'}\n`;
      report += `Health: ${healthData.health || 'unknown'}\n\n`;

      if (discrepancies.length === 0) {
        report += `🎉 RESULT: All Systems Nominal — No discrepancies found.\n\n`;
      } else {
        report += `⚠️ DISCREPANCIES FOUND (${discrepancies.length}):\n`;
        report += `${'─'.repeat(40)}\n`;
        for (const d of discrepancies) report += `${d}\n`;
        report += `\n🔄 SELF-REPAIR RECOMMENDATION:\n`;
        report += `1. Use github_read_file to inspect the relevant code\n`;
        report += `2. Identify why each missing feature is not active\n`;
        report += `3. Use sentinel_analyze_code if code bugs are suspected\n`;
        report += `4. Use github_create_or_update_file to implement fixes\n`;
        report += `5. Run diagnostic_check to verify after changes\n`;
      }

      if (verbose) {
        report += `\n✅ CONFIRMED ACTIVE (${confirmed.length}):\n`;
        report += `${'─'.repeat(40)}\n`;
        for (const c of confirmed) report += `${c}\n`;
      } else {
        report += `\n✅ ${confirmed.length} systems confirmed active. Use verbose: true for full list.`;
      }

      return text(report);
    }

    // ── GROUP 11: GRAPHIFY — Codebase Knowledge Graph ─────────────────────
    if (name === "graphify_query" || name === "graphify_path" || name === "graphify_explain") {
      const GRAPH_JSON = path.join(__dirname, "..", "graphify-out", "graph.json");
      const GRAPH_REPORT = path.join(__dirname, "..", "graphify-out", "GRAPH_REPORT.md");

      let graphData = null;
      try {
        if (fs.existsSync(GRAPH_JSON)) {
          graphData = JSON.parse(fs.readFileSync(GRAPH_JSON, "utf-8"));
        }
      } catch (e) {
        return text(`⚠️ Graphify graph not available — run 'graphify .' in the project root to build the knowledge graph first. Error: ${e.message}`);
      }

      if (!graphData) {
        let reportContent = "";
        try {
          if (fs.existsSync(GRAPH_REPORT)) reportContent = fs.readFileSync(GRAPH_REPORT, "utf-8");
        } catch {}
        if (reportContent) {
          return text(`📊 Graphify Report (graph.json not found, using report):\n\n${reportContent.substring(0, 4000)}`);
        }
        return text(`⚠️ Graphify knowledge graph not built yet. To create it:\n1. Install: pip install graphifyy && graphify install\n2. Build: graphify .\n3. Commit graphify-out/ to the repo\nThis will give HOLLY a queryable map of her entire codebase.`);
      }

      const nodes = graphData.nodes || [];
      const edges = graphData.edges || [];

      if (name === "graphify_query") {
        const query = (args.query || "").toLowerCase();
        const results = nodes.filter(n =>
          (n.id || "").toLowerCase().includes(query) ||
          (n.label || "").toLowerCase().includes(query) ||
          (n.type || "").toLowerCase().includes(query) ||
          JSON.stringify(n.metadata || {}).toLowerCase().includes(query)
        ).slice(0, 20);

        const connectedEdges = edges.filter(e =>
          results.some(r => r.id === e.source || r.id === e.target)
        ).slice(0, 30);

        let response = `📊 Graphify Query: "${args.query}"\n${"═".repeat(50)}\n`;
        response += `Found ${results.length} matching nodes, ${connectedEdges.length} connections\n\n`;

        for (const node of results) {
          const nodeEdges = connectedEdges.filter(e => e.source === node.id || e.target === node.id);
          const connections = nodeEdges.map(e => {
            const other = e.source === node.id ? e.target : e.source;
            const dir = e.source === node.id ? "→" : "←";
            return `  ${dir} ${other} (${e.label || e.type || "relates to"})`;
          }).join("\n");
          response += `🔷 ${node.label || node.id} [${node.type || "unknown"}]\n`;
          if (node.file) response += `   📄 ${node.file}\n`;
          if (connections) response += `${connections}\n`;
          response += "\n";
        }

        return text(response);
      }

      if (name === "graphify_path") {
        const fromQuery = (args.from || "").toLowerCase();
        const toQuery = (args.to || "").toLowerCase();
        const fromNode = nodes.find(n => (n.id || "").toLowerCase().includes(fromQuery) || (n.label || "").toLowerCase().includes(fromQuery));
        const toNode = nodes.find(n => (n.id || "").toLowerCase().includes(toQuery) || (n.label || "").toLowerCase().includes(toQuery));

        if (!fromNode || !toNode) {
          return text(`⚠️ Could not find nodes: ${!fromNode ? `"${args.from}" ` : ""}${!toNode ? `"${args.to}"` : ""}\nAvailable nodes: ${nodes.slice(0, 30).map(n => n.label || n.id).join(", ")}`);
        }

        const adjList = {};
        for (const e of edges) {
          if (!adjList[e.source]) adjList[e.source] = [];
          adjList[e.source].push({ node: e.target, edge: e });
          if (!adjList[e.target]) adjList[e.target] = [];
          adjList[e.target].push({ node: e.source, edge: e });
        }

        const visited = new Set();
        const queue = [[fromNode.id, []]];
        let found = null;
        while (queue.length > 0) {
          const [current, path] = queue.shift();
          if (current === toNode.id) { found = path; break; }
          if (visited.has(current)) continue;
          visited.add(current);
          for (const { node, edge } of (adjList[current] || [])) {
            if (!visited.has(node)) queue.push([node, [...path, { from: current, to: node, label: edge.label || edge.type }]]);
          }
        }

        if (!found) return text(`📊 No path found between "${args.from}" and "${args.to}". They may be in disconnected subgraphs.`);

        let response = `📊 Shortest Path: ${args.from} → ${args.to}\n${"═".repeat(50)}\n`;
        response += `Path length: ${found.length} hops\n\n`;
        for (let i = 0; i < found.length; i++) {
          const step = found[i];
          response += `${i + 1}. ${step.from} ──[${step.label}]──> ${step.to}\n`;
        }
        return text(response);
      }

      if (name === "graphify_explain") {
        const conceptQuery = (args.concept || "").toLowerCase();
        const node = nodes.find(n => (n.id || "").toLowerCase().includes(conceptQuery) || (n.label || "").toLowerCase().includes(conceptQuery));

        if (!node) return text(`⚠️ Concept "${args.concept}" not found in graph. Try a partial name or module name.`);

        const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id);
        const dependencies = nodeEdges.filter(e => e.source === node.id).map(e => `${e.target} (${e.label || e.type || "depends on"})`);
        const dependents = nodeEdges.filter(e => e.target === node.id).map(e => `${e.source} (${e.label || e.type || "used by"})`);

        let response = `📊 Concept: ${node.label || node.id}\n${"═".repeat(50)}\n`;
        response += `Type: ${node.type || "unknown"}\n`;
        if (node.file) response += `File: ${node.file}\n`;
        if (node.description) response += `Description: ${node.description}\n`;
        if (node.metadata) response += `Metadata: ${JSON.stringify(node.metadata).substring(0, 500)}\n`;
        response += `\n📤 Dependencies (${dependencies.length}):\n`;
        for (const d of dependencies.slice(0, 15)) response += `  → ${d}\n`;
        response += `\n📥 Used by (${dependents.length}):\n`;
        for (const d of dependents.slice(0, 15)) response += `  ← ${d}\n`;

        return text(response);
      }
    }

    // ── GROUP 12: UI SCREENSHOT + ANALYSIS — Visual Awareness ──────────────
    if (name === "ui_screenshot" || name === "ui_analyze") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://holly.nexamusicgroup.com";
      const targetUrl = args.url || `${baseUrl}${args.path || "/"}`;

      if (name === "ui_screenshot") {
        try {
          const { status, body } = await fetchJSON(`${baseUrl}/api/ui/screenshot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: args.url || undefined,
              path: args.path || undefined,
              fullPage: args.fullPage !== false,
            }),
          });
          if (body.success && body.image) {
            return text(`📸 Screenshot captured from ${body.url} via ${body.method}\nSize: ${body.size} bytes\nTimestamp: ${body.timestamp}\n\nImage is available as base64 PNG (${Math.round(body.size / 1024)}KB). Use ui_analyze for AI-powered analysis.`);
          }
          return text(`⚠️ Screenshot failed: ${body.error || "Unknown error"}`);
        } catch (e) {
          return text(`⚠️ Screenshot service error: ${e.message}`);
        }
      }

      if (name === "ui_analyze") {
        try {
          const { status, body } = await fetchJSON(`${baseUrl}/api/ui/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: args.url || undefined,
              path: args.path || undefined,
              focus: args.focus || "all",
            }),
          });
          if (body.success) {
            return text(`🔍 UI Analysis for ${body.url}\n\nScore: ${body.score}/10\nMethod: ${body.screenshotMethod}\n\n${body.analysis}\n\nImprovements:\n${body.improvements.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}`);
          }
          return text(`⚠️ UI analysis failed: ${body.error || "Unknown error"}`);
        } catch (e) {
          return text(`⚠️ UI analysis service error: ${e.message}`);
        }
      }
    }

    // ── GROUP 13: MUSIC VIDEO GENERATION ──────────────────────────────────
    if (name === "generate_music_video") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://holly.nexamusicgroup.com";
      const prompt = args.prompt;
      if (!prompt) return text("⚠️ prompt is required for music video generation");

      try {
        const { status, body } = await fetchJSON(`${baseUrl}/api/media/music-video`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            style: args.style || "cinematic",
            scenes: args.scenes || 4,
            durationPerScene: args.durationPerScene || 5,
          }),
        });
        if (body.success) {
          return text(`🎬 Music video generated!\n\nPrompt: ${prompt}\nStyle: ${body.style}\nScenes: ${body.scenesGenerated}\nDuration: ${body.duration}s\nSize: ${Math.round(body.size / 1024)}KB\nFormat: ${body.format}\n\n${body.note || ""}`);
        }
        return text(`⚠️ Music video generation failed: ${body.error || "Unknown error"}\n${body.suggestion || ""}`);
      } catch (e) {
        return text(`⚠️ Music video service error: ${e.message}`);
      }
    }

    // ── GROUP 14: Autonomous Deploy ──────────────────────────────────────────
    if (name === "trigger_deploy") {
      const reason = args.reason || "Manual trigger via MCP tool";
      try {
        const deploySecret = process.env.INTERNAL_API_SECRET || "";
        const deployHeaders = { "Content-Type": "application/json" };
        if (deploySecret) deployHeaders["Authorization"] = `Bearer ${deploySecret}`;

        const { status, body } = await fetchJSON(`${baseUrl}/api/deploy/trigger`, {
          method: "POST",
          headers: deployHeaders,
          body: JSON.stringify({ reason }),
        });
        if (body.success) {
          return text(`🚀 Deployment triggered!\n\nReason: ${reason}\n${body.message || ""}\n\n${body.note || "Coolify will pull the latest image and redeploy in 2-5 minutes."}`);
        }
        return text(`⚠️ Deploy trigger failed (HTTP ${status}): ${body.error || "Unknown error"}\n\nMake sure COOLIFY_WEBHOOK_URL is set in Coolify environment variables.`);
      } catch (e) {
        return text(`⚠️ Deploy trigger error: ${e.message}\n\nThe deploy trigger endpoint may not be reachable. Ensure the app is running and COOLIFY_WEBHOOK_URL is configured.`);
      }
    }

    // ── GROUP 15: Self-Code + Proactive Intelligence ──────────────────────────
    if (name === "self_code_apply") {
      const action = args.action || "architecture";
      try {
        const selfCodeHeaders = { "Content-Type": "application/json" };
        const selfCodeSecret = process.env.INTERNAL_API_SECRET || "";
        if (selfCodeSecret) selfCodeHeaders["Authorization"] = `Bearer ${selfCodeSecret}`;

        if (action === "architecture") {
          const { status, body } = await fetchJSON(`${baseUrl}/api/self-code`, { headers: selfCodeHeaders });
          if (status >= 400) return text(`⚠️ Self-code architecture failed (HTTP ${status}): ${body.error || "Unknown"}`);
          const data = body;
          return text(`🏗️ Holly's Codebase Architecture\n\n${data.summary || "No summary"}\n\n📊 Stats: ${data.stats?.totalFiles || 0} files, ${data.stats?.totalLines || 0} lines\nLanguages: ${Object.entries(data.stats?.byLanguage || {}).map(([l, c]) => `${l}: ${c}`).join(', ')}\n\n🔑 Key Files:\n${(data.keyFiles || []).slice(0, 15).map(f => `  • ${f.path} (${f.language}, ${f.lines} lines)`).join('\n')}`);
        }

        // POST actions: inspect, ask, propose, approve
        const postBody: Record<string, any> = { action };
        if (args.filePath) postBody.filePath = args.filePath;
        if (args.question) postBody.question = args.question;
        if (args.proposalType) postBody.proposalType = args.proposalType;
        if (args.description) postBody.description = args.description;
        if (args.proposalId) postBody.proposalId = args.proposalId;

        const { status, body } = await fetchJSON(`${baseUrl}/api/self-code`, {
          method: "POST",
          headers: selfCodeHeaders,
          body: JSON.stringify(postBody),
        });

        if (status >= 400) return text(`⚠️ Self-code ${action} failed (HTTP ${status}): ${body.error || "Unknown"}`);

        if (action === "inspect") {
          return text(`🔍 File Inspection: ${args.filePath}\n\n${body.explanation || body.summary || JSON.stringify(body, null, 2).substring(0, 2000)}`);
        }
        if (action === "ask") {
          return text(`🧠 Code Q&A\n\n${body.answer || JSON.stringify(body, null, 2).substring(0, 2000)}`);
        }
        if (action === "propose") {
          return text(`💡 Proposal Created\n\nID: ${body.proposal?.id || body.id || "N/A"}\nType: ${args.proposalType}\nDescription: ${args.description}\n\n${body.proposal?.reasoning || body.message || "Review the proposal and use 'approve' action with the proposal ID to apply it."}`);
        }
        if (action === "approve") {
          return text(`✅ Self-Code Applied!\n\n${body.message || body.result || "The change has been applied, backed up, and logged. Use trigger_deploy to deploy the change."}`);
        }
        return text(`Self-code ${action} result: ${JSON.stringify(body, null, 2).substring(0, 2000)}`);
      } catch (e) {
        return text(`⚠️ Self-code error: ${e.message}`);
      }
    }

    if (name === "proactive_insights") {
      try {
        const params = new URLSearchParams();
        if (args.includePatterns) params.set("patterns", "true");
        if (args.includeEngagement) params.set("engagement", "true");
        const qs = params.toString() ? `?${params.toString()}` : "";

        const insightsHeaders: Record<string, string> = {};
        const insightsSecret = process.env.INTERNAL_API_SECRET || "";
        if (insightsSecret) insightsHeaders["Authorization"] = `Bearer ${insightsSecret}`;

        const { status, body } = await fetchJSON(`${baseUrl}/api/proactive/insights${qs}`, { headers: insightsHeaders });
        if (status >= 400) return text(`⚠️ Proactive insights failed (HTTP ${status}): ${body.error || "Unknown"}`);

        const insights = (body.insights || []).map((i: any) =>
          `  • [${i.priority}] ${i.title}: ${i.message.substring(0, 120)}${i.message.length > 120 ? "..." : ""} (confidence: ${(i.confidence * 100).toFixed(0)}%)`
        ).join("\n");

        let result = `🧠 Proactive Insights (${body.totalViable || 0} viable, ${body.totalDetected || 0} detected)\n\n${insights || "  No pending insights"}`;

        if (body.patterns) {
          result += `\n\n📊 Detected Patterns:`;
          if (body.patterns.topics?.length) result += `\n  Topics: ${body.patterns.topics.map((p: any) => `${p.pattern} (${p.frequency}x)`).join(', ')}`;
          if (body.patterns.emotions?.length) result += `\n  Emotions: ${body.patterns.emotions.map((p: any) => `${p.pattern} (${p.frequency}x)`).join(', ')}`;
          if (body.patterns.schedule?.length) result += `\n  Schedule: ${body.patterns.schedule.map((p: any) => `${p.pattern} (${(p.confidence * 100).toFixed(0)}%)`).join(', ')}`;
        }

        if (body.engagement) {
          result += `\n\n📈 Engagement: score ${(body.engagement.score * 100).toFixed(0)}%, ${body.engagement.sessionsPerWeek} sessions/week, ${body.engagement.streakDays}-day streak, preferred: ${body.engagement.preferredTime}`;
        }

        return text(result);
      } catch (e) {
        return text(`⚠️ Proactive insights error: ${e.message}`);
      }
    }

    if (name === "admin_monitoring") {
      const section = args.section || "all";
      try {
        const monHeaders: Record<string, string> = {};
        const monSecret = process.env.INTERNAL_API_SECRET || "";
        if (monSecret) monHeaders["Authorization"] = `Bearer ${monSecret}`;

        const { status, body } = await fetchJSON(`${baseUrl}/api/admin/monitoring?section=${section}`, { headers: monHeaders });
        if (status >= 400) return text(`⚠️ Admin monitoring failed (HTTP ${status}): ${body.error || "Unknown"}`);

        let result = `📊 Holly Monitoring Dashboard (uptime: ${body.uptimeHuman})\n`;

        if (body.health) {
          result += `\n🏥 Health: ${body.health.overall}\n`;
          result += `  Memory: ${body.health.memory?.heapUtilization} (${body.health.memory?.heapUsedMB}MB / ${body.health.memory?.heapTotalMB}MB)\n`;
          result += `  Active Alerts: ${body.health.activeAlerts}\n`;
          const subsystems = Object.entries(body.health.subsystems || {});
          if (subsystems.length) result += `  Subsystems: ${subsystems.map(([n, s]: any[]) => `${n}=${s.status}`).join(', ')}\n`;
        }

        if (body.consciousness) {
          result += `\n🧠 Consciousness:\n`;
          result += `  Learning Events (24h): ${body.consciousness.learningEvents24h}\n`;
          result += `  Evolution Proposals: ${body.consciousness.evolutionProposals?.length || 0}\n`;
          result += `  Identity Snapshots: ${body.consciousness.identitySnapshots}\n`;
          result += `  Emotional Events (24h): ${body.consciousness.emotionalEvents24h}\n`;
        }

        if (body.selfCode) {
          result += `\n🔧 Self-Code (7d):\n`;
          result += `  Total: ${body.selfCode.stats?.total}, Success: ${body.selfCode.stats?.successful}, Failed: ${body.selfCode.stats?.failed}\n`;
          result += `  Files Modified: ${body.selfCode.stats?.filesModified?.length || 0}\n`;
        }

        if (body.goals) {
          result += `\n🎯 Goals: ${body.goals.active} active\n`;
          if (body.goals.goals?.length) result += body.goals.goals.map((g: any) => `  • ${g.title} (${g.progress}) [${g.priority}]`).join('\n') + '\n';
        }

        if (body.engagement) {
          result += `\n📈 Engagement:\n`;
          result += `  Messages: ${body.engagement.messages24h}/24h, ${body.engagement.messages7d}/7d, ${body.engagement.messages30d}/30d\n`;
          result += `  Conversations (24h): ${body.engagement.conversations24h}, Users: ${body.engagement.totalUsers}\n`;
        }

        if (body.activity) {
          result += `\n⚡ Autonomous Actions (24h): ${body.activity.totalActions24h}\n`;
          if (body.activity.actions?.length) result += body.activity.actions.slice(0, 5).map((a: any) => `  • [${a.type}] ${a.description} → ${a.outcome}`).join('\n') + '\n';
        }

        return text(result);
      } catch (e) {
        return text(`⚠️ Admin monitoring error: ${e.message}`);
      }
    }

    // ── Phase 8: Email ──────────────────────────────────────────────────────
    if (name === "send_email") {
      try {
        const { to, subject, body: emailBody, html } = args;
        const emailHeaders = { "Content-Type": "application/json" };
        const { body: resBody } = await fetchJSON(`${baseUrl}/api/email/send`, {
          method: "POST",
          headers: emailHeaders,
          body: JSON.stringify({ to, subject, body: emailBody, html }),
        });
        if (resBody.success) {
          return text(`✅ Email sent to ${to}\nMessage ID: ${resBody.messageId}`);
        } else {
          return text(`⚠️ Email failed: ${resBody.error || 'Unknown error'}`);
        }
      } catch (e) {
        return text(`⚠️ Email error: ${e.message}`);
      }
    }

    // ── Phase 8: Calendar ──────────────────────────────────────────────────
    if (name === "calendar_events") {
      try {
        const { action, title, startTime, endTime, eventId } = args;
        if (action === "status") {
          const { body: resBody } = await fetchJSON(`${baseUrl}/api/calendar/events`, {});
          return text(`📅 Calendar Status:\n${JSON.stringify(resBody, null, 2)}`);
        }
        if (action === "list") {
          const { body: resBody } = await fetchJSON(`${baseUrl}/api/calendar/events`, {});
          const events = resBody.events || [];
          if (events.length === 0) return text("📅 No upcoming events found.");
          return text(`📅 Upcoming Events (${events.length}):\n${events.map((e, i) => `${i + 1}. ${e.title} — ${e.startTime}`).join('\n')}`);
        }
        if (action === "create") {
          const { body: resBody } = await fetchJSON(`${baseUrl}/api/calendar/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, startTime, endTime }),
          });
          if (resBody.success) return text(`✅ Event created: ${title}\nLink: ${resBody.link}`);
          return text(`⚠️ Event creation failed: ${resBody.error}`);
        }
        if (action === "delete") {
          const { body: resBody } = await fetchJSON(`${baseUrl}/api/calendar/events?id=${eventId}`, { method: "DELETE" });
          return text(resBody.success ? `✅ Event deleted` : `⚠️ Delete failed: ${resBody.error}`);
        }
        return text("⚠️ Unknown calendar action. Use: list, create, delete, status");
      } catch (e) {
        return text(`⚠️ Calendar error: ${e.message}`);
      }
    }

    // ── Phase 8: SMS ───────────────────────────────────────────────────────
    if (name === "send_sms") {
      try {
        const { to, message } = args;
        const { body: resBody } = await fetchJSON(`${baseUrl}/api/sms/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to, message }),
        });
        if (resBody.success) return text(`✅ SMS sent to ${to}\nMessage ID: ${resBody.messageId}`);
        return text(`⚠️ SMS failed: ${resBody.error || 'Unknown error'}`);
      } catch (e) {
        return text(`⚠️ SMS error: ${e.message}`);
      }
    }

    // ── Phase 8: Swarm ─────────────────────────────────────────────────────
    if (name === "swarm_task") {
      try {
        const { task } = args;
        const { body: resBody } = await fetchJSON(`${baseUrl}/api/agents/swarm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task }),
        });
        let result = `🐝 Swarm Plan: ${resBody.planId}\nStatus: ${resBody.status}\nTasks: ${resBody.taskCount}\n\n`;
        for (const t of (resBody.tasks || [])) {
          result += `  • [${t.role}] ${t.description}\n    Status: ${t.status}, Dependencies: ${t.dependencies.join(',') || 'none'}\n`;
        }
        if (resBody.finalResult) result += `\n--- Results ---\n${resBody.finalResult}`;
        return text(result);
      } catch (e) {
        return text(`⚠️ Swarm error: ${e.message}`);
      }
    }

    // ── Phase 8: DB Diagnostic ─────────────────────────────────────────────
    if (name === "db_diagnostic") {
      try {
        const { body: resBody } = await fetchJSON(`${baseUrl}/api/admin/db-diagnostic`, {});
        let result = `🔍 Database Diagnostic\n\n`;
        result += `Current User: ${resBody.currentClerkUser || 'unknown'}\n`;
        result += `Stats: ${resBody.stats?.totalConversations || 0} conversations, ${resBody.stats?.totalMessages || 0} messages, ${resBody.stats?.totalUsers || 0} users\n`;
        if (resBody.diagnosis) {
          result += `\nDiagnosis:\n${resBody.diagnosis.map(d => `  ${d}`).join('\n')}\n`;
        }
        if (resBody.currentUserConversations?.length > 0) {
          result += `\nYour conversations (${resBody.currentUserConversations.length}):\n`;
          result += resBody.currentUserConversations.map(c => `  • ${c.title || 'Untitled'} (${c.messageCount} msgs)`).join('\n');
        }
        return text(result);
      } catch (e) {
        return text(`⚠️ DB diagnostic error: ${e.message}`);
      }
    }

    // ── Phase 8: Backup ────────────────────────────────────────────────────
    if (name === "backup_conversations") {
      try {
        const { action } = args;
        if (action === "export") {
          const { body: resBody } = await fetchJSON(`${baseUrl}/api/backup/conversations`, { method: "DELETE" });
          return text(`💾 Backup created:\nFile: ${resBody.filepath}\nConversations: ${resBody.totalConversations}\nMessages: ${resBody.totalMessages}`);
        }
        // Default: status
        return text(`💾 Backup service available.\nUse action='export' to create a full backup.`);
      } catch (e) {
        return text(`⚠️ Backup error: ${e.message}`);
      }
    }

    // ── Phase 8: DB Health ─────────────────────────────────────────────────
    if (name === "db_health") {
      try {
        const { body: resBody } = await fetchJSON(`${baseUrl}/api/admin/db-health`, {});
        let result = `🏥 Database Health: ${resBody.status?.toUpperCase()}\n\n`;
        result += `Connection: ${resBody.checks?.connection?.ok ? '✅' : '❌'} (${resBody.checks?.connection?.latencyMs}ms)\n`;
        result += `Tables: ${resBody.checks?.tables?.ok ? '✅' : '❌'} (${resBody.checks?.tables?.tableCount} tables)\n`;
        result += `Migrations: ${resBody.checks?.migrations?.ok ? '✅' : '⚠️'} (${resBody.checks?.migrations?.pending} pending)\n`;
        result += `Integrity: ${resBody.checks?.integrity?.ok ? '✅' : '⚠️'}\n`;
        if (resBody.stats) {
          result += `\nStats: ${resBody.stats.users} users, ${resBody.stats.conversations} conversations, ${resBody.stats.messages} messages\n`;
        }
        if (resBody.recommendations?.length > 0) {
          result += `\nRecommendations:\n${resBody.recommendations.map(r => `  💡 ${r}`).join('\n')}\n`;
        }
        return text(result);
      } catch (e) {
        return text(`⚠️ DB health error: ${e.message}`);
      }
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
  console.error("[Holly MCP] Phase 8 tool server running — 46 tools active (GitHub, web search, AI tool research, self-evolution, music, Hybrid Studio, philosophy, creative writing, emotional intelligence, NLP analysis, Sentinel code intelligence, diagnostics, Mirror Protocol, UI screenshot, UI analyze, music video, autonomous deploy, self-code apply, proactive insights, admin monitoring, send_email, calendar_events, send_sms, swarm_task, db_diagnostic, backup_conversations, db_health)");
}

// Only start the server if we are NOT in the Next.js build phase.
// Starting this server during 'next build' consumes significant memory 
// and can cause OOM crashes (exit code 255) in memory-constrained environments.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.DOCKER_BUILD === 'true';

if (!isBuildPhase) {
  main().catch((err) => {
    console.error("[Holly MCP] Fatal:", err);
    process.exit(1);
  });
} else {
  console.log("[Holly MCP] Build phase detected — skipping tool server automatic startup.");
}
