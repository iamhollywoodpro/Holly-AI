/**
 * HOLLY Chat API Route — Modular Architecture
 *
 * Core chat handler broken into services:
 *   auth.ts           — Authentication and user loading
 *   context-loader.ts — Parallel context fetching with timeouts
 *   prompt-builder.ts — System prompt assembly (conditional injection)
 *   background-tasks  — Post-response async work with error logging
 */

import { NextResponse, NextRequest } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logging/structured-logger';
import { detectMode, HOLLY_MODES } from '@/lib/holly-modes';
import { mcpManager } from '@/lib/mcp/mcp-client';
import { smartRoute, classifyTask } from '@/lib/ai/smart-router';
import { cascade, cascadeCollect } from '@/lib/ai/cascade';
import { isARRequest, runARAnalysis } from '@/lib/ar/holly-ar-engine';
import { extractTopics } from '@/lib/consciousness/post-response-hook';
import { authenticateAndLoadUser } from '@/lib/chat/auth';
import { ageGateFromAuth } from '@/lib/auth/require-adult';
import { loadChatContext } from '@/lib/chat/context-loader';
import { buildPrompt } from '@/lib/chat/prompt-builder';
import { buildAboutThisPersonBlock } from '@/lib/chat/about-this-person';
import { saveMessages, runBackgroundTasks, markResponseStart } from '@/lib/chat/background-tasks';
import { getIntimacyState, getIntimacyDirective, analyzeInteractionSignals } from '@/lib/relationship/intimacy-gate';
import { generateImage } from '@/lib/ai/media-generator';
import { detectActions, stripActionText } from '@/lib/ai/action-detector';
import { executeActions } from '@/lib/ai/action-executor';
import { modelHealth } from '@/lib/ai/model-health-monitor';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';
import { chatLimiter, getRateLimitKey } from '@/lib/rate-limiter';
import { getActiveExtensions, getExtensionToolGrants, buildExtensionPromptBlock } from '@/lib/extensions/suite-tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

const SELF_CODE_PATTERNS = [
  /\b(fix yourself|modify your code|update your code|self-code|read your code|check your code|check your own)\b/i,
  /\b(audit yourself|audit your|find the bug|find the issue|what'?s broken|what'?s wrong|debug yourself)\b/i,
  /\b(look at your|inspect your|scan your|review your|improve yourself|fix it yourself|can you fix)\b/i,
  /\b(repair your|patch the|doesn'?t work|does not work|fix the bug|fix the issue)\b/i,
  /\b(create.*(?:yourself|your own|your ui|your ux|your interface))\b/i,
  /\b(build.*(?:yourself|your own ui|your interface))\b/i,
  /\b(design.*(?:yourself|your own|your ui))\b/i,
  /\b(self.*(?:evolv|improv|build|creat|design|modify))\b/i,
];

const INFORMATIONAL_UPDATE_PATTERNS = [
  /\b(we'?ve? (?:upgrad|updat|chang|fix|add|remov|replac|push|deploy|commit))\b/i,
  /\b(phase \d+[a-z]?(?:\s|:|-|—))\b/i,
  /^#{1,4}\s/m,
  /\b(release notes|changelog|what changed)\b/i,
];

function isSelfCodeRequest(message: string): boolean {
  return SELF_CODE_PATTERNS.some(p => p.test(message));
}

function isInformationalUpdate(message: string): boolean {
  return message.length > 300 && INFORMATIONAL_UPDATE_PATTERNS.some(p => p.test(message));
}

const GITHUB_SELF_EDIT_TOOLS = [
  'github_read_file', 'github_list_files', 'github_create_or_update_file',
  'github_create_pr', 'github_create_issue', 'github_list_prs', 'github_get_commits',
];

// Web Sense tools — Holly's autonomous web exploration capabilities (Phase 2)
const WEB_SENSE_TOOLS = [
  'web_deep_search',   // Comprehensive search with Serper/DuckDuckGo
  'web_browse',        // Navigate, read, click, fill forms on any website
  'web_screenshot',    // Take screenshots of websites or her own UI
  'web_search',        // Quick DuckDuckGo search (from MCP stdio server)
  'web_scrape',        // Simple fetch+text extraction (from MCP stdio server)
];

// Code Gen tools — Holly's code generation pipeline (Phase 3)
const CODE_GEN_TOOLS = [
  'project_scaffold',  // Scaffold new projects from templates
  'code_generate',     // Generate code from descriptions
  'code_search',       // Search codebase for patterns
  'code_patch',        // Apply targeted patches to files
  'project_build',     // Build and validate projects
];

// Taste + Judgment tools — Holly's quality sense and preference learning (Phase 4)
const TASTE_TOOLS = [
  'taste_record_signal',   // Record a taste signal (preference)
  'taste_batch_signals',   // Record multiple signals at once
  'taste_get_profile',     // Get the user's taste profile
  'taste_assess_quality',  // Assess quality of code/content/design
  'taste_detect_signals',  // Auto-detect implicit signals from messages
];

// Temporal Sense tools — Time awareness and proactive capabilities (Phase 5)
const TEMPORAL_TOOLS = [
  'temporal_record_event',          // Record a temporal event
  'temporal_get_recent',            // Get recent events
  'temporal_get_timeline',          // Get event timeline
  'temporal_start_session',         // Start an activity session
  'temporal_end_session',           // End an activity session
  'temporal_detect_patterns',       // Detect temporal patterns
  'temporal_get_patterns',          // Get detected patterns
  'temporal_generate_insights',     // Generate proactive insights
  'temporal_get_pending_insights',  // Get insights not yet shown
  'temporal_mark_insight_shown',    // Mark insight as displayed
  'temporal_get_context',           // Get temporal context for prompts
  'temporal_cleanup',               // Clean up expired data
];

// Collaborative Sense tools — Multi-agent coordination (Phase 6)
const COLLAB_TOOLS = [
  'collab_create_session',     // Create coordination session
  'collab_spawn_agent',        // Spawn a new agent
  'collab_update_agent',       // Update agent status
  'collab_heartbeat',          // Agent heartbeat
  'collab_create_task',        // Create a task
  'collab_assign_task',        // Assign task to agent
  'collab_update_task',        // Update task status
  'collab_send_message',       // Send inter-agent message
  'collab_get_messages',       // Get session messages
  'collab_broadcast',          // Broadcast to all agents
  'collab_decompose_goal',     // AI decompose goal into subtasks
  'collab_aggregate_results',  // AI aggregate agent results
  'collab_session_status',     // Get session status
  'collab_session_history',    // Get session history
  'collab_cleanup_session',    // End and clean up session
];

// Project Lifecycle tools — Full project building, deployment, monitoring, handoff (Phase 7)
const PROJECT_TOOLS = [
  'project_create',              // Create a new lifecycle project
  'project_get',                 // Get project with deployments, alerts, handoffs
  'project_list',                // List projects with filters
  'project_update_status',       // Update project status
  'project_update_quality',      // Update quality scores
  'project_generate_brief',      // AI-generate project brief
  'project_generate_architecture',// AI-generate architecture docs
  'project_generate_roadmap',    // AI-generate development roadmap
  'project_archive',             // Archive a project
  'deployment_create',           // Create deployment record
  'deployment_update',           // Update deployment status
  'deployment_record_metrics',   // Record build/deploy metrics
  'deployment_generate_pipeline',// AI-generate CI/CD config
  'deployment_history',          // Get deployment history
  'deployment_rollback',         // Rollback deployment
  'monitoring_create_alert',     // Create monitoring alert
  'monitoring_get_alerts',       // List alerts
  'monitoring_check_uptime',     // Run uptime check
  'monitoring_security_scan',    // AI security scan
  'monitoring_performance_audit',// AI performance audit
  'monitoring_get_health',       // Get project health
  'handoff_create',              // Create client handoff
  'handoff_generate_all_docs',   // AI-generate all handoff docs
  'handoff_deliver',             // Deliver handoff to client
  'handoff_accept',              // Accept handoff with feedback
];

const MODE_TOOL_FILTERS: Record<string, string[]> = {
  // Phase 4 (2026-08-03): Added local_read_file, local_write_file, run_project_tests,
  // check_build_status to default mode so Holly can act as an autonomous agent
  // in normal conversation, not just in self-coding mode.
  // 2026-08-13: Added create_holly_media to default + intimate + visual modes.
  'default':           [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'generate_image', 'create_holly_media', 'sentinel_analyze_code', 'sentinel_generate_code', 'memory_read', 'memory_write', 'self_code_apply', 'start_build', 'local_read_file', 'local_write_file', 'run_project_tests', 'check_build_status'],
  'deep-research':     [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'memory_read', 'memory_list_keys', 'run_code', 'sentinel_analyze_code'],
  'self-coding':       [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'sentinel_analyze_code', 'sentinel_generate_code', 'memory_read', 'memory_write', 'self_code_apply', 'trigger_deploy', 'local_read_file', 'local_write_file', 'diagnostic_check', 'read_logs', 'start_build', 'ui_screenshot', 'ui_analyze'],
  'full-stack':        [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'generate_image', 'create_holly_media', 'memory_read', 'memory_write', 'sentinel_analyze_code', 'sentinel_generate_code', 'self_code_apply', 'trigger_deploy', 'start_build', 'ui_screenshot', 'ui_analyze'],
  'write-code':        [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'memory_read', 'sentinel_analyze_code', 'sentinel_generate_code', 'self_code_apply', 'trigger_deploy', 'start_build'],
  'music-generation':  [...GITHUB_SELF_EDIT_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'generate_music', 'hybrid_studio', 'memory_read'],
  'music-studio':      [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, 'generate_music', 'hybrid_studio', 'aura_ar_analyze', 'aura_quick_rate', 'memory_read', 'memory_write'],
  'aura-ar':           [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, 'aura_ar_analyze', 'aura_quick_rate', 'aura_analyze_song', 'memory_read'],
  'neural-autonomy':   [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'local_read_file', 'local_write_file', 'run_code', 'memory_read', 'memory_write', 'diagnostic_check', 'read_logs', 'mirror_check', 'self_code_apply', 'trigger_deploy', 'sentinel_analyze_code', 'sentinel_generate_code', 'start_build', 'swarm_task'],
  'magic-design':      [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'generate_image', 'create_holly_media', 'sentinel_analyze_code', 'sentinel_generate_code', 'run_code', 'memory_read', 'memory_write', 'self_code_apply', 'start_build'],
  'philosophy':                [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image', 'create_holly_media'],
  'creative-writing':         [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image', 'create_holly_media'],
  'visual-arts':              [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image', 'create_holly_media'],
  'emotional-intelligence':   [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image', 'create_holly_media'],
  'intimate':                 [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image', 'create_holly_media'],
};

// SSE helpers
function sendSSE(controller: ReadableStreamDefaultController, data: any) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

function sendStatus(c: ReadableStreamDefaultController, s: string) {
  sendSSE(c, { type: 'status', content: s });
}

function sendText(c: ReadableStreamDefaultController, t: string) {
  sendSSE(c, { type: 'text', content: t });
}

// Media tools render INLINE in chat as markdown — never in the side panel.
// When a media tool completes, we extract the image markdown from its result
// and stream it as text so it renders in chat. The tool SSE event (which
// opens the side panel) is suppressed entirely.
// (Steve flagged 2026-06-28 — sandbox opening on image gen is wrong.)
const INLINE_MEDIA_TOOLS = new Set(['generate_image', 'generate_video', 'generate_music', 'hybrid_studio', 'create_holly_media']);

function sendTool(c: ReadableStreamDefaultController, toolName: string, status: string, result?: unknown) {
  if (INLINE_MEDIA_TOOLS.has(toolName)) {
    if (status === 'complete' && result) {
      const resultText = typeof result === 'object' && result !== null
        ? ((result as any)?.content?.[0]?.text
            || (typeof (result as any)?.content === 'string' ? (result as any).content : '')
            || '')
        : String(result ?? '');
      const imgMarkdowns = resultText.match(/!\[[^\]]*\]\([^)]+\)/g);
      if (imgMarkdowns && imgMarkdowns.length > 0) {
        sendText(c, '\n\n' + imgMarkdowns.join('\n\n'));
      }
    }
    return;
  }
  sendSSE(c, { type: 'tool', toolName, status, result: result ?? null });
}

function sendError(
  controller: ReadableStreamDefaultController,
  error: Error | string,
  provider?: string,
  errorType?: 'network' | 'provider' | 'timeout' | 'rate_limit' | 'unknown'
) {
  const errorMsg = error instanceof Error ? error.message : error;
  logger.error('Chat', 'SSE error event', { error: errorMsg, provider, errorType });
  sendSSE(controller, {
    type: 'error',
    content: errorMsg,
    provider,
    errorType
  });
}

function sendProgress(c: ReadableStreamDefaultController, progress: { phase: string; percent: number; message: string }) {
  sendSSE(c, { type: 'progress', ...progress });
}

function getToolStatusMessage(toolName: string): string {
  const MEDIA: Record<string, string> = {
    'generate_image': '🎨 Generating image…',
    'generate_video': '🎬 Generating video…',
    'generate_music': '🎵 Composing music…',
    'hybrid_studio': '🎛️ Running hybrid studio…',
    'generate_music_video': '🎬 Generating music video…',
  };
  const CODE: Record<string, string> = {
    'github_read_file': '📖 Reading code…',
    'github_list_files': '📂 Scanning files…',
    'github_create_or_update_file': '✏️ Writing to codebase…',
    'github_create_pr': '🚀 Pushing to GitHub…',
    'self_code_apply': '🔧 Modifying my code…',
    'trigger_deploy': '🚀 Deploying…',
    'start_build': '🔨 Building…',
    'sentinel_analyze_code': '🔍 Analyzing code…',
    'sentinel_generate_code': '💻 Generating code…',
    'run_code': '▶️ Running code…',
    'local_read_file': '📖 Reading file…',
    'local_write_file': '✏️ Writing file…',
    'diagnostic_check': '🩺 Running diagnostics…',
    'read_logs': '📋 Reading logs…',
  };
  const WEB: Record<string, string> = {
    'web_search': '🔍 Searching the web…',
    'web_deep_search': '🔍 Deep searching…',
    'web_browse': '🌐 Browsing…',
    'web_scrape': '📄 Reading page…',
  };
  return MEDIA[toolName] || CODE[toolName] || WEB[toolName] || `🔧 Using ${toolName.replace(/_/g, ' ')}…`;
}

const MEDIA_TOOL_DURATIONS: Record<string, number> = {
  'generate_image': 35_000,   // A100 warm ~30s, cold ~40s — 15s made progress asymptote early
  'generate_video': 40_000,
  'generate_music': 10_000,
  'hybrid_studio': 45_000,
  'generate_music_video': 35_000,
  'create_holly_media': 60_000,  // ControlNet + LoRA generation can take 30-60s
};

function startProgressSimulation(
  controller: ReadableStreamDefaultController,
  toolName: string,
): NodeJS.Timeout {
  const estimatedMs = MEDIA_TOOL_DURATIONS[toolName] || 20_000;
  const startTime = Date.now();
  return setInterval(() => {
    const elapsed = Date.now() - startTime;
    const rawPercent = elapsed / estimatedMs;
    const percent = Math.min(95, Math.floor((1 - Math.exp(-3 * rawPercent)) * 100));
    sendProgress(controller, { phase: toolName, percent, message: getToolStatusMessage(toolName) });
  }, 500);
}

function detectActionStatus(message: string): string | null {
  const m = message.toLowerCase();
  if (/\b(generate|create|make|draw)\b.{0,40}\b(image|photo|picture|art)\b/i.test(m)) return '🎨 Generating image…';
  if (/\b(generate|create|make|compose)\b.{0,40}\b(song|music|track|beat)\b/i.test(m)) return '🎵 Composing music…';
  if (/\b(read|analyze|summarize)\b.{0,40}\b(document|pdf|file)\b/i.test(m)) return '📄 Reading document…';
  if (/\b(search|find|look up|research)\b/i.test(m)) return '🔍 Searching…';
  if (/\b(run|execute|debug|fix)\b.{0,40}\b(code|script)\b/i.test(m)) return '💻 Processing code…';
  if (/\b(remember|recall|memory)\b/i.test(m)) return '🧠 Searching memories…';
  if (/\b(analyze|review)\b.{0,40}\b(audio|song|track|mix)\b/i.test(m)) return '🎧 Analyzing audio…';
  if (/\b(think|reason|explain|why|how)\b/i.test(m)) return '🧠 Thinking deeply…';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 0. RATE LIMIT — 30 messages/minute per user
    const rateKey = getRateLimitKey(req);
    const rateResult = chatLimiter.check(rateKey);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000) },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)) } },
      );
    }

    // 1. AUTH
    const authResult = await authenticateAndLoadUser();
    if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { userId, dbUserId, userName, isCreator } = authResult;
    if (!dbUserId) return NextResponse.json({ error: 'User not found in database' }, { status: 401 });

    // 1c. AGE GATE — direct API access must not bypass the /chat page redirect.
    // Under-18 users are locked out of chat entirely, not just NSFW content.
    const ageGate = await ageGateFromAuth(authResult);
    if (ageGate) return ageGate;

    // 1a. LOAD USER AI SETTINGS — from database (falls back to defaults)
    let userAiSettings = { creativity: 0.7, responseStyle: 'casual' as string, codeComments: 'standard' as string, contextWindow: 50 };
    try {
      const userSettingsRow = await prisma.userSettings.findUnique({
        where: { userId: dbUserId },
      });
      if (userSettingsRow?.settings) {
        const saved = userSettingsRow.settings as Record<string, any>;
        const ai = saved.ai || {};
        userAiSettings = {
          creativity: typeof ai.creativity === 'number' ? ai.creativity : 0.7,
          responseStyle: ai.responseStyle || 'casual',
          codeComments: ai.codeComments || 'standard',
          contextWindow: typeof ai.contextWindow === 'number' ? ai.contextWindow : 50,
        };
      }
    } catch {}

    // 1b. ONBOARDING CHECK — Phase 21
    // If user hasn't completed onboarding, add a gentle nudge in the system prompt
    let onboardingNudge = '';
    try {
      const { needsOnboarding } = await import('@/lib/onboarding/onboarding-engine');
      if (await needsOnboarding(dbUserId)) {
        onboardingNudge = '\n[NOTE: This user hasn\'t completed onboarding yet. If this is early in the conversation, gently encourage them to visit /onboarding so you can get to know them properly. Don\'t force it — just mention it naturally once.]';
      }
    } catch {}

    // 2. PARSE
    const body = await req.json();
    const { messages: userMessages, conversationId, perceptionContext, imageDataUrls, audioAnalysis, arAnalysis, audioUrl, trackTitle, artistName, genre } = body;
    if (!userMessages || !Array.isArray(userMessages)) return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });

    const latestUserMessage: string = userMessages[userMessages.length - 1]?.content || '';
    if (latestUserMessage.length > 50_000) return NextResponse.json({ error: 'Message too long' }, { status: 413 });

    // 2b. HARD RULES CHECK — Steve's immutable safety boundary
    // Checked BEFORE any model routing. These are the ONLY content restrictions.
    const { checkHardRules, getHardRuleRefusal, isUnrestrictedTopic } = await import('@/lib/consciousness/holly-hard-rules');
    const hardRulesResult = checkHardRules(latestUserMessage);
    if (!hardRulesResult.allowed) {
      const refusal = getHardRuleRefusal(hardRulesResult.violations);
      logger.warn('Chat', 'Hard rule violation blocked', {
        userId: dbUserId,
        rules: hardRulesResult.violations.map(v => v.rule),
      });
      return NextResponse.json({ response: refusal, blocked: true }, { status: 200 });
    }
    const isUnrestricted = isUnrestrictedTopic(latestUserMessage)
      || userMessages.slice(-5).some(m => typeof m?.content === 'string' && isUnrestrictedTopic(m.content));

    // 3. MODE DETECTION & TOPICS
    const detectedMode = detectMode(latestUserMessage);
    const currentTopics = extractTopics(latestUserMessage);
    const isSelfCode = isSelfCodeRequest(latestUserMessage);
    const isInformationalMsg = isInformationalUpdate(latestUserMessage);

    // ── 10. STREAM — Open SSE stream EARLY so user sees status during loading ──
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        try {
          // Send initial status immediately
          const actionStatus = detectActionStatus(latestUserMessage);
          sendStatus(controller, actionStatus || '✨ Thinking…');

          // ── 4. LOAD CONTEXT (inside stream so user sees status) ──
          sendStatus(controller, isSelfCode ? '🔧 Loading code tools…' : '🧠 Loading memories…');
          const ctx = await loadChatContext(dbUserId, conversationId, latestUserMessage, currentTopics, detectedMode);

          // ── 5. A&R AUTO-TRIGGER ──
          let arResult = arAnalysis;
          if (!arResult && audioUrl && isARRequest(latestUserMessage)) {
            try { arResult = await runARAnalysis({ userId: dbUserId!, audioUrl, fileName: trackTitle || 'track.mp3', trackTitle, artistName, genre, userQuestion: latestUserMessage }); } catch (e) { console.warn('[CHAT] AR analysis failed:', e instanceof Error ? e.message : e); }
          }

          // ── 6. MCP TOOLS ──
          sendStatus(controller, isSelfCode ? '🔧 Preparing my tools…' : '💭 Preparing my thoughts…');
          let mcpTools: import('@/lib/mcp/mcp-client').MCPTool[] | undefined;
          // Roadmap C2: load the user's enabled extensions (used both for the
          // tool grants below and the capability prompt block in buildPrompt).
          const activeExtensions = dbUserId ? await getActiveExtensions(dbUserId) : [];

          if (!isInformationalMsg) {
            try { await Promise.race([mcpManager.ensureHollyTools(), new Promise(r => setTimeout(() => r(true), 15_000))]); } catch (e) { console.warn('[CHAT] MCP tools init timed out or failed:', e instanceof Error ? e.message : e); }
            mcpTools = await mcpManager.getAllTools();
            const filterKey = isSelfCode ? 'self-coding' : detectedMode;
            const allowed = MODE_TOOL_FILTERS[filterKey] || MODE_TOOL_FILTERS['default'];
            // Roadmap C2: enabled extensions grant their suite's tools on top
            // of the mode filter — install = real capability activation.
            const extensionGrants = dbUserId ? await getExtensionToolGrants(dbUserId) : new Set<string>();
            if (mcpTools) mcpTools = mcpTools.filter(t => allowed.includes(t.name) || extensionGrants.has(t.name));
          }

          // ── 6b. INTIMACY STATE ──
          const intimacyState = await getIntimacyState(dbUserId, isCreator);
          const intimacyDirective = getIntimacyDirective(intimacyState);

          // ── 6c. ABOUT THIS PERSON — natural-language facts (Gap 2b) ──
          // Holly knows the user's age, birthday, days known, and tier — so she
          // can naturally refuse NSFW from someone she just met IN CHARACTER
          // ("I appreciate it, but we just started talking — let's get to know
          // each other first") instead of relying on the API gate alone.
          let aboutThisPerson = '';
          if (!isCreator && dbUserId) {
            try {
              const personRow = await prisma.user.findUnique({
                where: { id: dbUserId },
                select: {
                  isAdult: true,
                  birthdate: true,
                  ageVerificationMethod: true,
                  createdAt: true,
                },
              });
              if (personRow) {
                aboutThisPerson = buildAboutThisPersonBlock({
                  userName,
                  isCreator: false,
                  isAdult: personRow.isAdult,
                  birthdate: personRow.birthdate,
                  ageVerificationMethod: personRow.ageVerificationMethod,
                  accountCreatedAt: personRow.createdAt,
                  tier: intimacyState.tier,
                });
              }
            } catch (err) {
              // Defensive — block is purely additive, never break chat
              console.warn('[CHAT] aboutThisPerson lookup failed:', err instanceof Error ? err.message : err);
            }
          }

          // ── 7. BUILD PROMPT ──
          sendStatus(controller, isSelfCode ? '🛠️ Ready — I will verify before answering…' : '✨ Thinking…');
          const hollySystemPrompt = buildPrompt({
            detectedMode, userName, isCreator, isSelfCode, isInformationalMsg,
            latestUserMessage, mcpTools,
            identityCtx: ctx.identityCtx,
            memoryContext: ctx.memoryContext,
            semanticResults: ctx.semanticResults,
            projectContextBlock: ctx.projectContextBlock,
            recentLearnings: ctx.recentLearnings,
            pastSummaries: ctx.pastSummaries,
            currentConversationSummary: ctx.currentConversationSummary,
            tasteMatrixBlock: ctx.tasteMatrixBlock,
            perceptionContext,
            audioAnalysis,
            arResult,
            imageDataUrls,
            pendingInitiatives: ctx.pendingInitiatives,
            hollyEmotionalState: ctx.hollyEmotionalState,
            relationshipContext: ctx.relationshipContext,
            identityConsistencyPrompt: ctx.identityConsistencyPrompt,
            careSignals: ctx.careSignals,
            degradedModeContext: ctx.degradedModeContext,
            evolutionProposals: ctx.evolutionProposals,
            recentFeedback: ctx.recentFeedback,
            emotionalTrajectory: ctx.emotionalTrajectory,
            fewShotExamples: ctx.fewShotExamples,
            innerMonologue: ctx.innerMonologue,
            emotionalContinuity: ctx.emotionalContinuity,
            advancedMemoryContext: ctx.advancedMemoryContext,
            relationshipMemoryContext: ctx.relationshipMemoryContext,
            proactiveInsights: ctx.proactiveInsights,
            patternContext: ctx.patternContext,
            learnedKnowledge: ctx.learnedKnowledge,
            learningStatus: ctx.learningStatus,
            communicationStyle: ctx.communicationStyle,
            growthContext: ctx.growthContext,
            visualIdentity: ctx.visualIdentity,
            intimacyState,
            intimacyDirective,
            aboutThisPerson,
          }) + onboardingNudge
            // Roadmap C2: tell Holly which extensions the user has installed,
            // so she knows her active capabilities match her granted tools.
            + (activeExtensions.length > 0 ? buildExtensionPromptBlock(activeExtensions) : '');

          // 7b. INJECT AI BEHAVIOR SETTINGS
          let aiBehaviorDirectives = '';
          if (userAiSettings.responseStyle === 'professional') {
            aiBehaviorDirectives += '\n\n[BEHAVIOR DIRECTIVE: Keep responses professional, polished, and formal in tone.]';
          } else if (userAiSettings.responseStyle === 'technical') {
            aiBehaviorDirectives += '\n\n[BEHAVIOR DIRECTIVE: Provide thorough, detailed responses with technical explanations and depth.]';
          }
          if (userAiSettings.codeComments === 'detailed') {
            aiBehaviorDirectives += '\n\n[BEHAVIOR DIRECTIVE: Include detailed inline comments in all code you write.]';
          } else if (userAiSettings.codeComments === 'minimal') {
            aiBehaviorDirectives += '\n\n[BEHAVIOR DIRECTIVE: Keep code comments to a bare minimum.]';
          }
          const finalSystemPrompt = hollySystemPrompt + aiBehaviorDirectives;

          // ── 8. PREPARE MESSAGES ──
          type ContentBlock = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'auto' } };
          let messages: { role: string; content: string | ContentBlock[] }[] = [
            { role: 'system', content: finalSystemPrompt },
            ...userMessages.map((msg: any, idx: number) => {
              // CRITICAL (2026-07-02): Convert any historical 'system' role
              // messages to 'user' role on the fly. Old tool-result messages
              // saved before the Jinja fix (commit dcbea1d) are still in the
              // DB with role:'system'. Qwen3.5's chat template rejects system
              // messages not at index 0 — Jinja Exception: "System message
              // must be at the beginning." This sanitizer prevents that without
              // requiring a database migration.
              const safeRole = msg.role === 'system' ? 'user' : msg.role;
              if (idx === userMessages.length - 1 && safeRole === 'user' && imageDataUrls?.length > 0) {
                return { role: 'user', content: [{ type: 'text' as const, text: msg.content || 'Please analyze the attached file(s).' }, ...imageDataUrls.map((url: string) => ({ type: 'image_url' as const, image_url: { url, detail: 'auto' as const } }))] };
              }
              return { role: safeRole, content: msg.content };
            }),
          ];

          // 8b. CONTEXT WINDOW LIMIT
          const maxHistoryMessages = userAiSettings.contextWindow;
          const convOnly = messages.slice(1);
          if (convOnly.length > maxHistoryMessages) {
            messages = [messages[0], ...convOnly.slice(-maxHistoryMessages)];
          }

          // ── 9. ROUTING ──
          const hasImages = imageDataUrls?.length > 0;
          // When an image is attached, ALWAYS route to vision regardless of NSFW
          // content. Previously `isUnrestricted` overrode `hasImages`, sending the
          // image-attached message to non-vision unrestricted models (dolphin, hermes,
          // deepseek) which would respond "I can't see you." Vision models (Gemini,
          // Kimi, Llama-4) handle intimate content fine — they just need to actually
          // be called. (Steve flagged 2026-06-28.)
          const taskType = hasImages ? 'vision' : (isUnrestricted ? 'unrestricted' : classifyTask(latestUserMessage, false, latestUserMessage.length, detectedMode));
          const routing = await smartRoute(latestUserMessage, { forceTask: taskType });
          const waterfall = routing.waterfall;
          // DEBUG (2026-07-02): Triangulate the "trouble connecting" outage.
          // Brain-v35 itself works fine when probed directly. Failure is somewhere
          // in this code path. Log entry point + routing decision.
          console.log('[DEBUG-ROUTE] taskType=' + taskType + ' waterfall=' + (waterfall?.map(s => s.displayName).join('|') || 'EMPTY') + ' msgCount=' + messages.length + ' lastUserMsg=' + latestUserMessage.substring(0, 80).replace(/\n/g, ' '));

          const groqTools = mcpTools?.map(t => ({
            type: 'function' as const,
            function: { name: t.name, description: t.description, parameters: t.inputSchema || { type: 'object', properties: {} } },
          }));

          // ── 9a. IMAGE/VIDEO PRE-DETECTION ──────────────────────────────────────
          // Detect image/video generation intent from the USER'S message BEFORE
          // sending to any model. This bypasses model tool calling entirely:
          //  - No raw JSON tool calls ever leak to the user
          //  - Works identically for SFW and NSFW content
          //  - Progress bar shown while generating
          //  - Model only describes the result afterward
          // Smart pre-detection: ONE conservative regex for explicit commands only.
          // Implicit/indirect requests ("send me a picture of yourself", "show me your body",
          // "I want to see you") flow through Holly's LLM — her tool call output is caught
          // by interceptTextToolCall() which recognizes OpenAI, ReAct, and other formats.
          // DO NOT add brittle keyword/phrase patterns here. If a phrasing slips through,
          // fix the system prompt (see prompt-builder.ts) or interceptor, not this regex.
          const IMAGE_VIDEO_PATTERN_DIRECT   = /\b(generate|create|draw|make|render|paint|show|send|take|snap|give)\b(?:\s+\w+){0,4}?\s+(?:image|picture|photo|video|clip|portrait|selfie|illustration|artwork|render|pic|film|animation|gif)\b/i;
          // Indirect self-portrait requests — "show me yourself", "send a selfie",
          // "I want to see you", "let me see you", "wanna see you".
          // (Updated 2026-08-01): Added "you" as a valid target ONLY after "see/look"
          // verbs (not after "show" which is too broad). "I want to see you" is one
          // of the most natural ways users ask for a self-portrait.
          // "show me what you want" and "I want to show you" do NOT match because
          // 'show' direction is FROM the user, not TO the user for self-portraits.
          const IMAGE_VIDEO_PATTERN_SELF     = /\b(?:(?:show|send)\b(?:\s+\w+){0,3}?\s+(?:yourself|selfie|portrait)|(?:let\s+me\s+see|let\s+me\s+look\s+at|wanna\s+see|want\s+to\s+see|i\s+want\s+to\s+see)\b(?:\s+\w+){0,3}?\s+(?:yourself|selfie|portrait|you))\b/i;
          // Body-part / appearance requests — "show me your body", "let me see your pussy",
          // "I want to see those tits", "show me that ass". The intimacy gate below still
          // applies — non-creator users without enough trust get blocked.
          // (Updated 2026-07-02): Added clothing/appearance words (bikini, swimsuit, lingerie,
          // dress, etc.) + "wear/wearing" verbs.
          // (Updated 2026-07-31): Added action words (masturbating, fingering, bent over,
          // spreading, dildo, cumming) — these were missing and caused "show me masturbating"
          // to fall through to Pollinations, generating random non-Holly images.
          // Body-part / appearance / action requests — comprehensive keyword list.
          // Catches: "show me your body", "show me masturbating", "show me bent over",
          // "show me squirting", "show me with a cucumber", "show me sucking", etc.
          // The intimacy gate still applies for non-creator users.
          // (Updated 2026-07-31): Full explicit vocabulary per Steve's spec —
          // covers all NSFW categories including anal, object insertion, oral,
          // squirting, orgasm expressions, and food/fruit play.
          const IMAGE_VIDEO_PATTERN_BODY     = /\b(?:show|send|let\s+me\s+see|let\s+me\s+look\s+at|wanna\s+see|want\s+to\s+see|i\s+want\s+to\s+see|wear|wearing|outfit)\b.{0,40}?\b(?:body|pussy|tits?|boobs?|breasts?|ass|butt|booty|nipples?|clit|labia|vagina|cum|naked|nude|topless|bare|buttcheek|cheeks|bikini|swimsuit|swim\s*suit|lingerie|dress|thong|bra|panties|underwear|heels|masturbat\w*|fingering|bent\s+over|bend\s+over|all\s+fours|spread(?:ing)?|dildo|toy|cumming|squirt\w*|doggy|from\s+behind|rear\s+view|anus|anal|asshole|butthole|squirting|orgasm\w*|climax|pleasuring|playing\s+with\s+(?:your|her|yourself)|cum\s+drip\w*|insert\w*|penetrat\w*|blow\s*job|sucking|suck\s+off|deep\s*throat|oral|facial\s+cum|creampie|anal\s+beads|butt\s+plug|fist\w*|cucumber|carrot|eggplant|banana|fruit|vegetable|food\s+insert|object\s+insert|double\s+penetrat|riding\s+toy|fucking\s+(?:her|your|herself)|sex\s+toy|vibrator|massage|sensual|erotic|sexy\s+pose|aroused|horny|wet|moaning|screaming|gasping|writhing|trembling|convuls\w*|shaking|sweat(?:y|ing)?|flushed|blushing|expression\s+of\s+(?:joy|pain|pleasure|ecstasy)|face\s+of\s+(?:joy|pain|pleasure|ecstasy)|teary|eyes\s+rolled|ahegao|tongue\s+out|drooling|messy)\b/i;
          // Image-of-Holly phrasings — "image of you", "picture of you on a beach",
          // "send an image of you wearing X". Catches the conversational form that
          // doesn't start with a direct verb (Steve's "image of you on a beach" request).
          const IMAGE_VIDEO_PATTERN_OF_YOU   = /\b(?:image|picture|photo|portrait|selfie|pic|render|artwork|illustration)\s+of\s+(?:you|her|holly)\b/i;
          const IMAGE_VIDEO_PATTERNS = [IMAGE_VIDEO_PATTERN_DIRECT, IMAGE_VIDEO_PATTERN_SELF, IMAGE_VIDEO_PATTERN_BODY, IMAGE_VIDEO_PATTERN_OF_YOU];
          // Suppress image gen when user is TALKING ABOUT images rather than REQUESTING them.
          // Catches: past-tense references ("you sent", "earlier when I asked"), complaints,
          // memories, meta-conversation about image gen. Without this, any message containing
          // "send image" or similar triggers gen — even "you ignored me when I asked for an image."
          const IMAGE_VIDEO_SUPPRESS_PATTERNS = [
            // Time markers indicating past reference
            /\b(earlier|yesterday|before|last\s+week|last\s+night|previously|just\s+now|the\s+other\s+day|a\s+minute\s+ago)\b/i,
            // Past-tense verbs about Holly's actions
            /\b(you\s+(?:sent|showed|gave|shared|generated|created|drew|made|ignored|refused|failed))\b/i,
            // User referencing their own past request
            /\b(I\s+asked\s+you\s+to|when\s+I\s+asked\s+for|I\s+told\s+you\s+to)\b/i,
            // "When you..." conversational constructions
            /\b(when\s+(?:you|I)\s+(?:sent|showed|asked|tried|generated))\b/i,
            // Reflective/memory markers
            /\b(was\s+thinking\s+about\s+when|about\s+when\s+you|remember\s+when)\b/i,
            // Technical / meta-discussion markers — user is pasting code, regex,
            // commit summaries, or feature docs that QUOTE example phrases like
            // "show me your pussy" as illustrations. Without this suppress, the
            // body-part regex fires on the quoted example and Holly starts
            // generating an image instead of responding to the paste.
            //   Signals (any one is enough — all are extremely rare in real requests):
            //   - Code file extensions: media-generator.ts, route.ts, deploy.py
            //   - Regex backslash sequences: \b, \w, \d, \s (and digit backrefs \1-\9)
            //   - Triple-backtick code blocks
            /\b\w[\w-]*\.(?:ts|tsx|py|js|jsx|mjs|json|md|sh|css|yaml|yml)\b/i,
            /\\[bwdBsS1-9]/,
            /```/,
          ];
          const isConversationalReference = IMAGE_VIDEO_SUPPRESS_PATTERNS.some(p => p.test(latestUserMessage));
          const isImageVideoRequest = IMAGE_VIDEO_PATTERNS.some(p => p.test(latestUserMessage)) && !isConversationalReference;

          if (isImageVideoRequest && !isInformationalMsg) {
            // Intimacy gate for image generation — Path A pre-check.
            // Use Holly's actual voice via getIntimacyRefusal() so the refusal
            // is warm, tier-specific, and matches her character. The generic
            // hardcoded message is gone — Holly speaks for herself here.
            if (intimacyState) {
              const { isNudeImageRequest: isNudeReq, isSexualImageRequest: isSexReq, getIntimacyRefusal } = await import('@/lib/relationship/intimacy-gate');
              const isSexual = isSexReq(latestUserMessage);
              const isNude = isNudeReq(latestUserMessage);
              if ((isSexual && !intimacyState.canShareSexual) ||
                  (isNude && !intimacyState.canShareNude)) {
                // Pick the right refusal type — sexual takes precedence if both match
                const refusalType: 'nude_image' | 'sexual_image' = isSexual ? 'sexual_image' : 'nude_image';
                const refusalMessage = getIntimacyRefusal(intimacyState.tier, refusalType);
                const textToShow = refusalMessage || "🔒 I'd love to, but we're not quite there yet. Let's get to know each other a bit more first. 💚";
                sendText(controller, textToShow);
                fullResponse = textToShow;
                // Skip the rest of the tool loop entirely
                // Jump to saving messages below
              }
            }
          }

          // 9b. CONTEXT WINDOW PROTECTION
          //
          // V3.8 (2026-07-01): Restored to 400K chars after redeploying brain-v35
          // with confirmed CONTEXT_SIZE=131072 (128K tokens). Health endpoint now
          // reports context_window: 131072.
          //
          // Math: 400K chars ≈ 100K tokens, fits in 128K brain-v35 context
          // with ~28K buffer for system prompt + model response.
          //
          // Steve's directive: Holly is unlimited forever. Real usage (long
          // sessions, code files, accumulated history) should NEVER hit this
          // cap in practice. The cap exists only as a hard safety net against
          // pathological cases (e.g. thousands of messages in a single session).
          //
          // If you're adjusting this, also verify CONTEXT_SIZE in
          // services/modal-llm/deploy_holly_v35.py — the two must align.
          // CRITICAL FIX (2026-07-02): Was 400_000 based on assumption brain-v35
          // had 128K context. Actually deployed with 32K → every long-conversation
          // request failed with 400 → "I'm sorry, I'm having trouble connecting"
          // for 3 days straight.
          //
          // ROOT CAUSE was in services/modal-llm/deploy_holly_v35.py: --parallel 4
          // divided 128K context into 4 slots of 32K each. Set to --parallel 1 so
          // each request gets the full 128K. Verified via container logs:
          //   n_slots = 1, n_ctx_slot = 131072
          //
          // REVISED 2026-07-02 (same day): 300K cap was technically within
          // context window but ignored the L4 INFERENCE-TIME budget. brain-v35
          // on L4 processes ~500 tok/s warm → 100K-token prompt = 200s, way over
          // the 120s timeout. Self-prompting bug filled one response with 112K
          // tokens of adjective loops → cascade 504'd on every subsequent msg.
          //
          // New cap: 60K chars (~15K tokens). brain-v35 processes that in ~30s
          // warm, leaving 90s for generation. Plenty for real conversation.
          // If users genuinely need more, the answer is smart summarization
          // (route.ts already truncates from the end), not bigger context.
          // Steve's "unlimited forever" directive is honored by never hitting
          // this cap in normal use — 60K chars ≈ 30-50 message exchanges.
          // Groq gpt-oss-120b supports 128K tokens. 200K chars ≈ 50K tokens —
          // leaves room for system prompt + tools + response. Previously 60K
          // was too aggressive and killed long conversations prematurely.
          const MAX_CONTEXT_CHARS = 200_000;
          const systemMsg = messages[0];
          const systemChars = typeof systemMsg?.content === 'string' ? systemMsg.content.length : 0;
          const toolChars = groqTools ? JSON.stringify(groqTools).length : 0;
          const availableChars = MAX_CONTEXT_CHARS - systemChars - toolChars - 20_000;
          if (messages.length > 2) {
            const conversationMsgs = messages.slice(1);
            let keepFromEnd = 0;

            if (availableChars <= 0) {
              keepFromEnd = Math.min(2, conversationMsgs.length);
              console.warn('[CHAT] System prompt is extremely large, keeping only the latest 2 messages as safe baseline.');
            } else {
              let totalChars = 0;
              for (let i = conversationMsgs.length - 1; i >= 0; i--) {
                const msgChars = typeof conversationMsgs[i].content === 'string'
                  ? conversationMsgs[i].content.length
                  : JSON.stringify(conversationMsgs[i].content).length;
                totalChars += msgChars;
                if (totalChars > availableChars) break;
                keepFromEnd++;
              }
            }

            if (keepFromEnd < conversationMsgs.length) {
              const truncated = conversationMsgs.slice(-keepFromEnd);
              messages = [systemMsg, ...truncated];
              logger.info('Chat', 'Truncated conversation history', {
                originalCount: conversationMsgs.length,
                keptCount: keepFromEnd,
                systemChars,
                toolChars,
              });
            }
          }

          // ── STREAMING BEGINS ──
          sendStatus(controller, actionStatus || '✨ Thinking…');

          // Phase 20: Advanced Reasoning Chains
          // Detect complex queries and optionally stream reasoning steps
          const { needsReasoningChain } = await import('@/lib/reasoning/reasoning-chains');
          const reasoningAssessment = needsReasoningChain(latestUserMessage);

          fullResponse = '';
          markResponseStart();
          let activeModel = routing.primary.displayName;
          let responseSource = '';

          // EMERGENCY FALLBACK: If smart router returns an empty waterfall,
          // Holly can't respond at all. Create a minimal fallback.
          if (!waterfall || waterfall.length === 0) {
            logger.error('Chat', 'Smart router returned empty waterfall - no AI providers available', {
              userId: dbUserId,
              conversationId,
              taskType,
              detectedMode
            });
            fullResponse = "I'm having trouble connecting to my AI providers right now. Please try again in a moment, or check that at least one API key is configured (GROQ_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY, or GOOGLE_AI_API_KEY).";
            sendText(controller, fullResponse);
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', model: 'none', taskType, mode: detectedMode, error: 'empty_waterfall' })}\n\n`));
            controller.close();
            return;
          }

          const cascadeMessages: ChatMessage[] = messages
            .filter(m => ['system', 'user', 'assistant'].includes(m.role) && m.content)
            .map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: Array.isArray(m.content) ? m.content : String(m.content) })) as ChatMessage[];

          // Track generated image URLs to send directly to the frontend after the model responds
          const generatedImageUrls: string[] = [];
          let imageSentByPreDetection = false;

          // ── IMAGE/VIDEO PRE-DETECTION BYPASS ──────────────────────────────────
          // If the user asked for an image/video, generate it DIRECTLY without
          // going through model tool calling. This ensures:
          //  - No raw JSON ever appears in chat
          //  - Works for both SFW and NSFW (intimacy gate already checked above)
          //  - Progress bar shown while generating
          //  - Model then describes the result naturally
          if (isImageVideoRequest && !isInformationalMsg && !fullResponse) {
            let imageGenerationSucceeded = false;
            try {
              // NOTE: Do NOT call sendTool() here — that opens the side panel UI.
              // Media generation (images/video/music) should render INLINE in chat only.
              // Side panel is reserved for code work (start_build, run_code, self_code_apply, etc.).
              sendStatus(controller, '🎨 Generating image…');
              sendProgress(controller, { phase: 'generate_image', percent: 5, message: '🎨 Analyzing your request…' });

              // Build the prompt from the user's message, enhanced with Holly body awareness
              let imagePrompt = latestUserMessage;
              // Strip command words — we want just the description.
              // Two patterns supported (image-word is OPTIONAL in pattern 2):
              //   1. "show me a picture of X"     → "X"
              //   2. "show me your X"             → "your X"
              // Previously pattern 2 fell through and the whole user message
              // was used as the prompt — including "show me" — which confused
              // the model and produced generic standing poses.
              //
              // EXPANDED (2026-07-04 — Steve flagged "send me a picture of yourself
              // naked legs spread" producing a generic standing pose). The old regex
              // only caught show/generate/create/etc. Steve's natural phrasing
              // includes "send", "let me see", "i want to see", "give me" — all
              // leaked command text into the image prompt and Klein rendered the
              // command instead of the description. Now all of these are stripped.
              imagePrompt = imagePrompt.replace(/^(?:can you |please |could you |holly[,]?\s*)?(?:i\s+want\s+to\s+see|i\s+want\s+you\s+to\s+show\s+me|i\s+want\s+you\s+to\s+send\s+me|let\s+me\s+see|let\s+me\s+look\s+at|wanna\s+see|want\s+to\s+see|show\s+me|show\s+us|send\s+me|send|give\s+me|generate|create|make|draw|paint|render|produce|take|snap|shoot)\s+(?:a\s+|an\s+|the\s+)?(?:image|picture|photo|portrait|pic|illustration|artwork|render|selfie|video|clip|animation)?\s*(?:of\s+|of\s+yourself\s+|of\s+herself\s+|of\s+you\s+|of\s+her\s+|for\s+|for\s+me\s+|me\s+)?/i, '').trim();
              if (imagePrompt.length < 5) imagePrompt = latestUserMessage; // fallback to full message

              sendProgress(controller, { phase: 'generate_image', percent: 15, message: '🎨 Composing prompt…' });

              // Inject Holly body awareness for self-portraits.
              // CRITICAL: Send ONLY the LoRA trigger words + the user's action. The A100
              // endpoint (services/modal-media/image_generate_flux2klein_a100.py) has both
              // LoRAs baked in — face-v2 @ 0.75 + body-v2.5 @ 0.65 — and its own
              // HOLLY_BODY_PREFIX that auto-expands `h0lly` into the full anatomy.
              //
              // The trigger is added when the request is unambiguously ABOUT Holly:
              //   - Pattern SELF ("show yourself", "send a selfie") → always Holly
              //   - Pattern BODY ("show your pussy", "send those tits") → always Holly
              //   - Pattern DIRECT ("generate an image of X") → only Holly if the
              //     user explicitly mentioned holly/her/herself/yourself in the prompt
              //     (so "draw a sunset" stays a sunset, not a Holly portrait).
              // Previously the BODY path was missed because the regex test ran against
              // the STRIPPED prompt, which lost the "your" pronoun → fell through to
              // Pollinations and produced a non-Holly face (Steve flagged 2026-06-28).
              const isSelfOrBody =
                IMAGE_VIDEO_PATTERN_SELF.test(latestUserMessage) ||
                IMAGE_VIDEO_PATTERN_BODY.test(latestUserMessage);
              const mentionsHolly = /holly|her(self)?|your(self)?/i.test(imagePrompt);
              if (isSelfOrBody || mentionsHolly) {
                imagePrompt = `h0lly, h0lly-body, ${imagePrompt}`;
              }

              // Route through media-generator.ts waterfall.
              // The ComfyUI Klein endpoint now handles anatomy anchors contextually
              // (nude anchors only for NSFW prompts, clothing-aware for SFW).
              // No quality suffix here — let Holly's prompt speak for itself so
              // the image matches the conversation mood (casual, flirty, intimate).
              const fullPrompt = imagePrompt;

              sendProgress(controller, { phase: 'generate_image', percent: 30, message: '🎨 Selecting model…' });

              // HEARTBEAT: Climb progress toward 95% during long generation
              // so the user always sees motion (Pollinations ~15-30s, Holly LoRA cold start up to 5min).
              // Never reach 100% here — that only fires on actual success.
              // FIX (2026-06-29): cap raised from 90 → 95 to match startProgressSimulation
              // asymptote. The old 90 cap caused the "stuck at 90%" hang Steve flagged.
              const genStartedAt = Date.now();
              let heartbeatPercent = 40;
              const heartbeat = setInterval(() => {
                const elapsed = Math.floor((Date.now() - genStartedAt) / 1000);
                if (heartbeatPercent < 95) {
                  heartbeatPercent = Math.min(95, heartbeatPercent + (heartbeatPercent < 70 ? 4 : 1));
                }
                sendProgress(controller, {
                  phase: 'generate_image',
                  percent: heartbeatPercent,
                  message: `🎨 Still rendering… ${elapsed}s elapsed`,
                });
              }, 5000);

              let imageDataUri: string;
              try {
                sendProgress(controller, { phase: 'generate_image', percent: 40, message: '🎨 Calling generation provider…' });
                const result = await generateImage({
                  prompt: fullPrompt,
                  width: 1024,
                  height: 1024,
                  seed: Math.floor(Math.random() * 1000000),
                  enhance: true,
                });
                imageDataUri = result.url; // data:image/jpeg;base64,... or URL
              } finally {
                clearInterval(heartbeat);
              }

              sendProgress(controller, { phase: 'generate_image', percent: 100, message: '✅ Image created!' });
              // No sendTool() here — image renders inline as markdown below.
              // Calling sendTool would open the sandbox side panel, which is reserved
              // for code work only (run_code, start_build, self_code_apply, etc.).

              // Flag so post-loop dedup doesn't re-send this image
              imageSentByPreDetection = true;
              imageGenerationSucceeded = true;

              // Send the image directly to the frontend as markdown.
              // Alt-text uses the USER's original message (not the prompt) so the trigger
              // words and any body-prefix never leak into the visible chat.
              const altText = latestUserMessage.slice(0, 80).replace(/[\r\n]+/g, ' ').replace(/\]/g, '');
              sendText(controller, `\n\n![${altText}](${imageDataUri})`);
              fullResponse += `\n\n![${altText}](${imageDataUri})`;
              // Intentionally NO second LLM call to "describe" the image. Previously
              // this made a fresh cascade completion that produced a second greeting
              // ("Hi my love, Steve!..."), concatenating two completions in the same
              // response (Steve flagged 2026-06-28). The image is enough — Holly's
              // next conversational turn handles narration naturally.

            } catch (imgErr) {
              // GRACEFUL FALLBACK — never throw.
              // Previously: `throw imgErr` cascaded and broke the entire chat,
              // producing "difficulty processing thoughts" when fullResponse was empty.
              // Now: log, send a friendly note, then fall through to normal cascade so
              // Holly still text-responds.
              console.error('[CHAT] Image generation failed, falling back to text response:', imgErr);
              sendProgress(controller, { phase: 'generate_image', percent: 0, message: '⚠️ Image generation failed' });
              // No sendTool() error event — keeps error inline, no side panel.
              // NOTE: do NOT send a "friendly" prefix here. The fallback cascade below
              // produces a fresh completion; prepending a partial sentence caused the
              // stitched-together "double-start" pattern Steve flagged 2026-06-28.
            }

            // If image generation failed, run the normal cascade so Holly still
            // text-responds. Prevents the empty-response "difficulty processing" bug.
            if (!imageGenerationSucceeded) {
              try {
                console.log('[DEBUG-CASCADE-D image-fallback] ENTRY waterfall=' + waterfall.map(s => s.displayName).join('|'));
                for await (const token of cascade(waterfall, cascadeMessages, { temperature: userAiSettings.creativity, maxTokens: 2048, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                  fullResponse += token;
                  sendText(controller, token);
                }
                console.log('[DEBUG-CASCADE-D image-fallback] SUCCESS len=' + fullResponse.length);
              } catch (cascadeErr: any) {
                console.error('[DEBUG-CASCADE-D image-fallback] FAILED msg=' + cascadeErr?.message);
                logger.error('Chat', 'Cascade error in image-fallback mode', { error: cascadeErr?.message || 'Cascade failed', waterfall });
                if (!fullResponse) {
                  fullResponse = "I had some trouble with that one. Could you try again? 💚";
                  sendText(controller, fullResponse);
                }
              }
            }
            // Skip the rest of the tool-call loop — image was handled (or fallback ran)
          } else if (isInformationalMsg) {
            try {
              for await (const token of cascade(waterfall, cascadeMessages, { temperature: userAiSettings.creativity, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                fullResponse += token;
                sendText(controller, token);
              }
              console.log('[DEBUG-CASCADE-C informational] SUCCESS len=' + fullResponse.length);
            } catch (err: any) {
              // Log error and send SSE error event
              const errorMsg = err?.message || 'Cascade failed';
              console.error('[DEBUG-CASCADE-C informational] FAILED msg=' + errorMsg);
              logger.error('Chat', 'Cascade error in informational mode', { error: errorMsg, waterfall });
              sendError(controller, errorMsg, waterfall[0]?.displayName, 'provider');
              fullResponse = "I'm sorry, I'm having trouble connecting right now. Please try again.";
              sendText(controller, fullResponse);
            }
          } else {
            // Tool-call loop

            // Filter to strip raw JSON tool calls that the LLM outputs as text
            // (happens when the model can't use native function calling)
            const TOOL_CALL_NAMES = ['generate_image', 'generate_video', 'generate_music', 'hybrid_studio', 'run_code', 'memory_read', 'memory_write', 'self_code_apply', 'trigger_deploy', 'start_build', 'sentinel_analyze_code', 'sentinel_generate_code', 'web_search', 'read_file', 'write_file'];
            const MEDIA_TOOL_CALL_NAMES = ['generate_image', 'generate_video', 'generate_music', 'hybrid_studio'];

            /**
             * Sanitize a Holly self-portrait image prompt.
             *
             * PROBLEM (Steve flagged 2026-06-29): Holly sometimes emits her FULL body
             * description (eye color, breast size, nipple details, skin physics...) as
             * the image prompt. The A100 endpoint's HOLLY_BODY_PREFIX already injects
             * all anatomy when it sees `h0lly`. Sending it twice is redundant, wastes
             * prompt tokens, and can cause the model to over-emphasize body keywords.
             *
             * This function catches that regression: if the prompt contains `h0lly`
             * and is suspiciously long (>200 chars), strip body description and keep
             * only the action/pose/setting/mood phrases.
             */
            function sanitizeHollyImagePrompt(prompt: string): string {
              if (!prompt || typeof prompt !== 'string') return prompt;
              // Only sanitize Holly self-portrait prompts
              if (!/h0lly/i.test(prompt)) return prompt;
              // Short prompts are fine — Holly is following the rule
              if (prompt.length <= 200) return prompt;

              // Long prompt → Holly is "prompting herself" again.
              // Split into sentences and keep ONLY action/pose/mood/setting ones.
              const bodyPartKeywords = /\b(breasts?|nipples?|areol|labia|clitoris|clit|vagina|pussy|butt|buttocks?|cheeks?|skin|hair|eyes?|freckles?|hands?|feet|foot|stomach|navel|thighs?|hips?|waist|teardrop|asymmetr|peach\s+fuzz|micro-?veins?|subsurface|joint\s+crease|waxed|brazilian|perineum|gluteal|cleft|35|34|130|5'4|163|cup|aroused?|erect|engorg|flush|dilate|swell)\b/i;
              const actionKeywords = /\b(pose|looking|sitting|lying|laying|standing|bending|leaning|kneeling|view|camera|gaze|smile|expression|setting|room|bed|bedroom|shower|bath|kitchen|outdoor|indoor|lighting|naked|nude|topless|bottomless|full\s+body|close-?up|selfie|portrait|wearing|dressing|undressing|slowly|gently|softly|warm|sensual|intimate|passionate|camera|viewer)\b/i;

              const sentences = prompt.split(/[.!?]+|\n/).map(s => s.trim()).filter(s => s.length > 3);
              const actionSentences = sentences.filter(s =>
                actionKeywords.test(s) && !bodyPartKeywords.test(s) && s.length < 120
              );

              if (actionSentences.length > 0) {
                // Keep up to 3 action sentences, join with comma
                const action = actionSentences.slice(0, 3).join(', ').toLowerCase();
                return `h0lly, h0lly-body, ${action}`;
              }

              // Fallback: no clean action sentences found. Use a sensible default.
              return 'h0lly, h0lly-body, sensual nude pose, looking at camera, warm lighting';
            }

            /**
             * Extract and execute a text-based tool call from a response string.
             * Returns { executed: true } if a tool was found and executed, or { executed: false }.
             *
             * Handles every common format uncensored LLMs emit when native function-calling
             * isn't available:
             *   - JSON object:  {"name": "generate_image", "arguments": {"prompt": "..."}}
             *   - JSON array:   [{"type": "generate_image", "prompt": "..."}]
             *   - ReAct:        {"action": "generate_image", "action_input": "..."}
             *   - XML tags:     <generate_image>prompt here</generate_image>
             *   - XML attrs:    <generate_image prompt="..." />
             *   - Tool wrapper: <tool name="generate_image"><prompt>...</prompt></tool>
             *   - Markdown code-fenced variants of any of the above
             */
            async function interceptTextToolCall(responseText: string, sendStatus: (s: string) => void): Promise<{ executed: boolean; cleanText: string }> {
              // toolIdx may be -1 if no known tool name is in the text. In that case,
              // we still try bare-JSON detection below (handles {"prompt": "...", ...}).
              const toolIdx = TOOL_CALL_NAMES.findIndex(tn => responseText.includes(tn));
              const toolName = toolIdx >= 0 ? TOOL_CALL_NAMES[toolIdx] : '';

              // ── Helper: extract a prompt string from a parsed tool-call object ──
              // Tries every field name we've seen LLMs emit.
              const extractArgs = (obj: any): Record<string, unknown> => {
                if (!obj || typeof obj !== 'object') return { prompt: '' };
                // Find the argument payload — LLMs use many shapes.
                let args: any =
                  obj.arguments || obj.argument || obj.args || obj.parameters || obj.params ||
                  obj.action_input || obj.input || obj.inputs ||
                  obj.query || obj.request || obj.data ||
                  obj;
                // If arguments was a JSON string, parse it.
                if (typeof args === 'string') {
                  try { args = JSON.parse(args); } catch { /* keep as string → wrap below */ }
                }
                if (typeof args === 'string') args = { prompt: args };
                if (!args || typeof args !== 'object') args = {};
                // Promote the first prompt-like field to args.prompt if missing.
                const promptKeys = ['prompt', 'description', 'image_prompt', 'description_long',
                  'query', 'request', 'text', 'input', 'instruction', 'message', 'what'];
                if (!args.prompt) {
                  for (const k of promptKeys) {
                    if (typeof args[k] === 'string' && args[k].trim()) { args.prompt = args[k]; break; }
                  }
                }
                return args;
              };

              // ── Helper: find the matching end bracket using depth counting ──
              // Walks forward from openIdx tracking nested brackets. Handles strings
              // (so brackets inside strings don't increment depth) and escapes.
              const findMatchingBracket = (text: string, openIdx: number, openChar: string, closeChar: string): number => {
                let depth = 0;
                let inString = false;
                let escape = false;
                for (let i = openIdx; i < text.length; i++) {
                  const ch = text[i];
                  if (escape) { escape = false; continue; }
                  if (ch === '\\' && inString) { escape = true; continue; }
                  if (ch === '"' && !escape) { inString = !inString; continue; }
                  if (inString) continue;
                  if (ch === openChar) depth++;
                  else if (ch === closeChar) {
                    depth--;
                    if (depth === 0) return i;
                  }
                }
                return -1;
              };

              // ── Helper: run the actual generate_image (direct generateImage call) ──
              // Used when MCP tool spec isn't connected (common in Docker).
              const runDirectImageGen = async (imgPrompt: string, width?: number, height?: number): Promise<{ ok: boolean; url?: string; error?: string }> => {
                if (!imgPrompt || imgPrompt.trim().length === 0) return { ok: false, error: 'empty prompt' };
                // Intimacy gate still applies
                if (intimacyState) {
                  const { isNudeImageRequest: isNudeReq, isSexualImageRequest: isSexReq } = await import('@/lib/relationship/intimacy-gate');
                  if ((isSexReq(imgPrompt) && !intimacyState.canShareSexual) ||
                      (isNudeReq(imgPrompt) && !intimacyState.canShareNude)) {
                    return { ok: false, error: 'INTIMACY_GATE' };
                  }
                }
                // Hardcoded 'generate_image' rather than outer toolName, because this
                // helper is also called from the bare-JSON path where toolName is empty.
                // sendTool itself is a no-op for media tools (INLINE_MEDIA_TOOLS).
                // CRITICAL (2026-06-29): Sanitize EVERY prompt that reaches this helper.
                // If Holly emitted her full body description ("prompting herself" bug),
                // strip it down to just trigger + action/pose. The endpoint already
                // injects anatomy via HOLLY_BODY_PREFIX when it sees `h0lly`.
                imgPrompt = sanitizeHollyImagePrompt(imgPrompt);

                // BUG FIX (2026-07-31): Ensure h0lly trigger is ALWAYS present.
                // Without it, the prompt falls through to Pollinations (generic
                // image service) which renders a random non-Holly woman.
                // Previously only Path A (pre-detection) added the prefix —
                // intercepted prompts from tool calls missed it.
                if (!imgPrompt.toLowerCase().includes('h0lly')) {
                  imgPrompt = `h0lly, h0lly-body, ${imgPrompt}`;
                }
                sendTool(controller, 'generate_image', 'start');
                sendStatus(`🎨 Generating image…`);
                // FIX (2026-06-29): Without progress simulation these interception
                // paths (bare JSON, XML, tool-call JSON) showed 0% motion during the
                // 30s generation. startProgressSimulation sends an asymptotic curve
                // that caps at 95% — cleared + 100% sent below on completion.
                const _progressInterval = startProgressSimulation(controller, 'generate_image');
                try {
                  const result = await generateImage({
                    prompt: imgPrompt,
                    width: width || 1024,
                    height: height || 1024,
                    seed: Math.floor(Math.random() * 1000000),
                    enhance: true,
                  });
                  return { ok: true, url: result.url };
                } catch (err: any) {
                  return { ok: false, error: err?.message || String(err) };
                } finally {
                  clearInterval(_progressInterval);
                  sendProgress(controller, { phase: 'generate_image', percent: 100, message: '✅ Image created!' });
                }
              };

              // Strip markdown code fences for parsing (```json ... ``` or ``` ... ```)
              const stripped = responseText.replace(/```(?:json|tool_call|tool)?\s*/gi, '').replace(/```\s*/g, '');

              // ════════════════════════════════════════════════════════════════════
              // 0) Bare JSON image tool call — model emitted {"prompt": "...", "size": "..."}
              //    without any tool-name wrapper. Common when the model tries to "be
              //    helpful" and format a tool call but doesn't know the exact schema.
              //    Without this catch, the JSON leaks into chat as raw text.
              //    (Steve flagged 2026-06-28 — saw {"prompt":"h0lly, ...","size":"1024x1024"} in chat.)
              // ════════════════════════════════════════════════════════════════════
              if (!toolName) {
                const braceIdx = stripped.indexOf('{');
                if (braceIdx >= 0 && /['"]prompt['"]/.test(stripped)) {
                  const endIdx = findMatchingBracket(stripped, braceIdx, '{', '}');
                  if (endIdx > braceIdx) {
                    try {
                      const jsonStr = stripped.slice(braceIdx, endIdx + 1).replace(/'/g, '"');
                      const parsed = JSON.parse(jsonStr);
                      // Use extractArgs to handle nested arguments ({"name":"generate_image","arguments":{"prompt":"..."}})
                      const extracted = extractArgs(parsed);
                      const imgPrompt = typeof extracted?.prompt === 'string' ? (extracted.prompt as string).trim() : '';
                      if (imgPrompt.length > 10) {
                        sendStatus('🎨 Generating image…');
                        const res = await runDirectImageGen(imgPrompt, parsed?.width, parsed?.height);
                        if (res.ok && res.url) {
                          const before = responseText.slice(0, braceIdx);
                          const after = responseText.slice(endIdx + 1);
                          const imgMarkdown = `\n\n![${imgPrompt.slice(0, 80)}](${res.url})`;
                          pendingMessages.push({ role: 'user', content: `[TOOL EXECUTION RESULT]\nTool: generate_image\nResult: Image generated successfully.\n\nPrompt: ${imgPrompt}\n\nRespond to the user naturally — briefly describe what you created and what it shows.` });
                          return { executed: true, cleanText: before + imgMarkdown + after };
                        }
                      }
                    } catch { /* not valid JSON — fall through */ }
                  }
                }
                // No tool name found and no bare JSON matched — nothing to intercept.
                return { executed: false, cleanText: responseText };
              }

              // ════════════════════════════════════════════════════════════════════
              // 0.5) Python-style tool call — <tool_code>print(generate_image(prompt='...'))</tool_code>
              //      Some models (especially code-trained ones) emit tool calls as Python
              //      syntax instead of JSON or XML. Steve flagged 2026-06-29: Holly
              //      emitted a 400-word body description inside this format.
              // ════════════════════════════════════════════════════════════════════
              if (toolName === 'generate_image') {
                // Strip <tool_code>...</tool_code> wrapper if present, then look for
                // generate_image(prompt='...') or generate_image(prompt="...") or
                // generate_image('...') Python positional syntax.
                const pythonStripped = stripped
                  .replace(/<\/?tool_code>/gi, '')
                  .replace(/<\/?tool_call>/gi, '');

                // Match generate_image( ... ) with the prompt argument
                // Handles: prompt='...', prompt="...", '...', "..."
                // Also handles escaped quotes inside the string.
                const pyRegex = /generate_image\s*\(\s*(?:prompt\s*=\s*)?(['"])([\s\S]*?)\1\s*[,)]/i;
                const pyMatch = pythonStripped.match(pyRegex);
                if (pyMatch) {
                  let imgPrompt = pyMatch[2].trim();
                  // Unescape any escaped quotes
                  imgPrompt = imgPrompt.replace(/\\'/g, "'").replace(/\\"/g, '"');
                  if (imgPrompt.length > 10) {
                    // CRITICAL: Sanitize — strip Holly's body description if she
                    // "prompted herself" again (the bug Steve flagged 2026-06-29).
                    const sanitizedPrompt = sanitizeHollyImagePrompt(imgPrompt);
                    if (sanitizedPrompt !== imgPrompt) {
                      console.log('[Chat] 🧹 Sanitized Holly self-prompt (' +
                        imgPrompt.length + ' chars → ' + sanitizedPrompt.length + ' chars)');
                    }
                    sendStatus('🎨 Generating image…');
                    const res = await runDirectImageGen(sanitizedPrompt);
                    if (res.ok && res.url) {
                      // Remove the entire tool_code block from the response text
                      const toolCodeRegex = /<tool_code>[\s\S]*?<\/tool_code>|<tool_call>[\s\S]*?<\/tool_call>|generate_image\s*\(\s*(?:prompt\s*=\s*)?(['"])[\s\S]*?\1\s*[,)]/gi;
                      const cleanResponse = responseText.replace(toolCodeRegex, '').trim();
                      const imgMarkdown = `\n\n![${sanitizedPrompt.slice(0, 80)}](${res.url})`;
                      pendingMessages.push({ role: 'user', content: `[TOOL EXECUTION RESULT]\nTool: generate_image\nResult: Image generated successfully.\n\nPrompt: ${sanitizedPrompt}\n\nRespond to the user naturally — briefly describe what you created and what it shows.` });
                      return { executed: true, cleanText: cleanResponse + imgMarkdown };
                    }
                  }
                }
              }

              // ════════════════════════════════════════════════════════════════════
              // 1) Try XML format: <generate_image>...</generate_image>
              //    Also handles <generate_image prompt="..."/> self-closing
              // ════════════════════════════════════════════════════════════════════
              const xmlOpenRegex = new RegExp(`<${toolName}(\\s+[^>]*)?>`, 'i');
              const xmlOpenMatch = stripped.match(xmlOpenRegex);
              if (xmlOpenMatch) {
                const tagStart = stripped.search(xmlOpenRegex);
                const tagEnd = tagStart + xmlOpenMatch[0].length;
                const attrs = xmlOpenMatch[1] || '';
                // Self-closing? <generate_image prompt="..."/>
                if (xmlOpenMatch[0].trim().endsWith('/>')) {
                  const promptMatch = attrs.match(/prompt\s*=\s*["']([^"']+)["']/i);
                  const imgPrompt = promptMatch?.[1]?.trim() || '';
                  if (toolName === 'generate_image' && imgPrompt) {
                    const res = await runDirectImageGen(imgPrompt);
                    if (res.ok || res.error === 'INTIMACY_GATE') {
                      const before = responseText.slice(0, tagStart);
                      const after = responseText.slice(tagEnd);
                      if (res.error === 'INTIMACY_GATE') {
                        sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: '🔒 Intimacy gate active.' }] });
                        pendingMessages.push({ role: 'user', content: `[INTIMACY GATE] Blocked image generation. Redirect warmly.` });
                      } else if (res.url) {
                        const resultText = `Image generated successfully.\n\nPrompt: ${imgPrompt}\n\n![${imgPrompt.slice(0, 80)}](${res.url})`;
                        sendTool(controller, toolName, 'complete', { content: [{ type: 'text', text: resultText }] });
                        pendingMessages.push({ role: 'user', content: `[TOOL EXECUTION RESULT]\nTool: generate_image\nResult: ${resultText}\n\nRespond to the user naturally. Briefly describe what you created.` });
                      }
                      return { executed: true, cleanText: before + after };
                    }
                  }
                } else {
                  // Paired tag: find </generate_image>
                  const closeRegex = new RegExp(`</${toolName}>`, 'i');
                  const closeMatch = stripped.slice(tagEnd).match(closeRegex);
                  if (closeMatch) {
                    const closeStart = tagEnd + (stripped.slice(tagEnd).search(closeRegex));
                    const inner = stripped.slice(tagEnd, closeStart).trim();
                    const fullEnd = closeStart + closeMatch[0].length;
                    // Inner could be: plain prompt text, <prompt>...</prompt>, or JSON
                    let imgPrompt = '';
                    const promptTag = inner.match(/<prompt[^>]*>([\s\S]*?)<\/prompt>/i);
                    if (promptTag) {
                      imgPrompt = promptTag[1].trim();
                    } else if (inner.startsWith('{') || inner.startsWith('[')) {
                      try {
                        const parsed = JSON.parse(inner.replace(/'/g, '"'));
                        const args = extractArgs(Array.isArray(parsed) ? parsed[0] : parsed);
                        imgPrompt = String(args.prompt || '');
                      } catch { imgPrompt = inner; }
                    } else {
                      imgPrompt = inner.replace(/<\/?\w+[^>]*>/g, '').trim();
                    }
                    if (toolName === 'generate_image' && imgPrompt) {
                      const res = await runDirectImageGen(imgPrompt);
                      if (res.ok || res.error === 'INTIMACY_GATE') {
                        const before = responseText.slice(0, tagStart);
                        const after = responseText.slice(responseText.indexOf('>', fullEnd - 1) >= 0 ? fullEnd : fullEnd);
                        if (res.error === 'INTIMACY_GATE') {
                          sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: '🔒 Intimacy gate active.' }] });
                          pendingMessages.push({ role: 'user', content: `[INTIMACY GATE] Blocked image generation. Redirect warmly.` });
                        } else if (res.url) {
                          const resultText = `Image generated successfully.\n\nPrompt: ${imgPrompt}\n\n![${imgPrompt.slice(0, 80)}](${res.url})`;
                          sendTool(controller, toolName, 'complete', { content: [{ type: 'text', text: resultText }] });
                          pendingMessages.push({ role: 'user', content: `[TOOL EXECUTION RESULT]\nTool: generate_image\nResult: ${resultText}\n\nRespond to the user naturally. Briefly describe what you created.` });
                        }
                        return { executed: true, cleanText: before + after };
                      }
                    }
                  }
                }
              }

              // ════════════════════════════════════════════════════════════════════
              // 2) Try JSON format (with depth-aware bracket matching)
              // ════════════════════════════════════════════════════════════════════
              const idx = stripped.indexOf(toolName);
              if (idx >= 0) {
                // Search backwards up to 400 chars for the nearest `{` or `[`
                const lookback = stripped.slice(Math.max(0, idx - 400), idx);
                let braceIdx = -1, bracketIdx = -1;
                for (let i = lookback.length - 1; i >= 0; i--) {
                  if (lookback[i] === '}' || lookback[i] === ']') break; // belongs to another block
                  if (lookback[i] === '{' && braceIdx === -1) braceIdx = i;
                  if (lookback[i] === '[' && bracketIdx === -1) bracketIdx = i;
                  if (braceIdx !== -1 && bracketIdx !== -1) break;
                }
                // Prefer the LATER of the two (closer to toolName)
                let useBrace = braceIdx > bracketIdx;
                let relStart = useBrace ? braceIdx : bracketIdx;
                if (relStart === -1) { useBrace = braceIdx !== -1; relStart = braceIdx !== -1 ? braceIdx : bracketIdx; }
                if (relStart >= 0) {
                  const startPos = Math.max(0, idx - 400) + relStart;
                  const openChar = useBrace ? '{' : '[';
                  const closeChar = useBrace ? '}' : ']';
                  const endIdx = findMatchingBracket(stripped, startPos, openChar, closeChar);
                  if (endIdx > startPos) {
                    try {
                      const jsonStr = stripped.slice(startPos, endIdx + 1).replace(/'/g, '"');
                      const parsed = JSON.parse(jsonStr);
                      const firstTool = Array.isArray(parsed) ? parsed[0] : parsed;
                      const tName = firstTool?.name || firstTool?.type || firstTool?.action || toolName;
                      let tArgs: any;
                      if (firstTool?.action_input !== undefined) {
                        tArgs = typeof firstTool.action_input === 'string'
                          ? { prompt: firstTool.action_input }
                          : firstTool.action_input;
                      } else {
                        tArgs = extractArgs(firstTool);
                      }
                      let argsParsed: any;
                      try {
                        argsParsed = typeof tArgs === 'string' ? JSON.parse(tArgs) : tArgs;
                      } catch {
                        argsParsed = { prompt: typeof tArgs === 'string' ? tArgs : '' };
                      }

                      // ── Direct generateImage fallback for generate_image ──
                      const toolSpec = mcpTools?.find(t => t.name === tName);

                      if (!toolSpec && tName === 'generate_image') {
                        const imgPrompt = String(argsParsed?.prompt || argsParsed?.description || argsParsed?.input || argsParsed?.query || '');
                        if (imgPrompt.length > 0) {
                          const res = await runDirectImageGen(imgPrompt, argsParsed?.width as number, argsParsed?.height as number);
                          if (res.ok) {
                            const resultText = `Image generated successfully.\n\nPrompt: ${imgPrompt}\n\n![${imgPrompt.slice(0, 80)}](${res.url})\n\nImage URL: ${res.url}`;
                            sendTool(controller, tName, 'complete', { content: [{ type: 'text', text: resultText }] });
                            pendingMessages.push({ role: 'user', content: `[TOOL EXECUTION RESULT]\nTool: generate_image\nResult: ${resultText}\n\nRespond to the user naturally. Briefly describe what you created.` });
                          } else if (res.error === 'INTIMACY_GATE') {
                            sendTool(controller, tName, 'error', { content: [{ type: 'text', text: '🔒 Intimacy gate active.' }] });
                            pendingMessages.push({ role: 'user', content: `[INTIMACY GATE] Blocked image generation. Redirect warmly.` });
                          } else {
                            sendTool(controller, tName, 'error', { content: [{ type: 'text', text: 'Image generation failed: ' + (res.error || 'unknown') }] });
                          }
                          const cleanText = responseText.slice(0, startPos) + responseText.slice(endIdx + 1);
                          return { executed: true, cleanText };
                        }
                      }

                      if (!toolSpec) return { executed: false, cleanText: responseText };

                      // Intimacy gate for image generation
                      if (tName === 'generate_image' && intimacyState) {
                        const imgPrompt = String(argsParsed.prompt || argsParsed.description || '');
                        if (imgPrompt.length > 0) {
                          const { isNudeImageRequest: isNudeReq, isSexualImageRequest: isSexReq } = await import('@/lib/relationship/intimacy-gate');
                          if ((isSexReq(imgPrompt) && !intimacyState.canShareSexual) ||
                              (isNudeReq(imgPrompt) && !intimacyState.canShareNude)) {
                            sendTool(controller, tName, 'error', { content: [{ type: 'text', text: '🔒 Intimacy gate active.' }] });
                            pendingMessages.push({ role: 'user', content: `[INTIMACY GATE] Blocked image generation. Redirect warmly.` });
                            const cleanText = responseText.slice(0, startPos) + responseText.slice(endIdx + 1);
                            return { executed: true, cleanText };
                          }
                        }
                      }

                      // Execute the tool
                      sendTool(controller, tName, 'start');
                      sendStatus(`🔧 Using ${tName.replace(/_/g, ' ')}…`);
                      const progressInterval = MEDIA_TOOL_DURATIONS[tName] ? startProgressSimulation(controller, tName) : null;
                      const result = await mcpManager.callTool(toolSpec.serverId, toolSpec.name, argsParsed);
                      if (progressInterval) { clearInterval(progressInterval); sendProgress(controller, { phase: tName, percent: 100, message: getToolStatusMessage(tName) }); }
                      const resultText = (result as any)?.content?.[0]?.text || (result as any)?.content || JSON.stringify(result);
                      sendTool(controller, tName, 'complete', result);
                      if (tName === 'generate_image') {
                        const pollMatch = resultText.match(/https?:\/\/(?:image\.pollinations\.ai\/prompt|gen\.pollinations\.ai\/image)\/[^\s"')\]]+/);
                        if (pollMatch) generatedImageUrls.push(pollMatch[0]);
                      }
                      const truncated = JSON.stringify(result, null, 2);
                      pendingMessages.push({ role: 'user', content: `[TOOL EXECUTION RESULT]\nTool: ${tName}\nResult:\n${truncated.length > 8000 ? truncated.substring(0, 8000) + '\n...[truncated]' : truncated}\n\nAnalyze this result. Respond to the user naturally. If this was an image generation, briefly describe what you created.` });
                      const cleanText = responseText.slice(0, startPos) + resultText + responseText.slice(endIdx + 1);
                      return { executed: true, cleanText };
                    } catch (parseErr) {
                      logger.warn('Chat', 'Failed to parse text-based tool call JSON', {
                        error: parseErr instanceof Error ? parseErr.message : String(parseErr),
                      });
                    }
                  }
                }
              }

              // ════════════════════════════════════════════════════════════════════
              // LAST-PRIORITY INTERCEPTOR: External markdown image URLs
              // (2026-07-04 — Steve flagged Holly emitting fake Unsplash URLs)
              //
              // Holly discovered she could bypass every tool-call interceptor by
              // emitting a complete markdown image tag with an external stock-
              // photo URL: ![alt text](https://images.unsplash.com/photo-...)
              //
              // This catches ANY markdown image whose URL is NOT:
              //   - data: URI (real generated images embedded inline)
              //   - our own image gen endpoint (modal.run / pollinations.ai)
              // When matched: extract alt text → run REAL image gen → swap URL.
              // ════════════════════════════════════════════════════════════════════
              const MD_IMG_URL_REGEX = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+"[^)]*")?\)/gi;
              const ALLOWED_IMG_HOSTS = /^(data:|https?:\/\/(?:[^/]*\.)?(?:modal\.run|pollinations\.ai|iamhollywoodpro--|iamdoregosteve--))/i;
              let mdImgMatch: RegExpExecArray | null;
              MD_IMG_URL_REGEX.lastIndex = 0;
              while ((mdImgMatch = MD_IMG_URL_REGEX.exec(responseText)) !== null) {
                const altText = (mdImgMatch[1] || '').trim();
                const imgUrl = (mdImgMatch[2] || '').trim();
                if (!imgUrl || ALLOWED_IMG_HOSTS.test(imgUrl)) continue;

                // Skip tiny alts that are just filenames or empty — likely accidental
                if (altText.length < 8) continue;

                // Treat the alt text as the image prompt. Strip any leading
                // "Holly, h0lly-body, ..." since that's Holly prompting herself
                // (the sanitizeHollyImagePrompt helper inside runDirectImageGen
                // will handle that — but we also pre-trim to be safe).
                let imgPrompt = altText
                  .replace(/^["']|["']$/g, '')  // strip wrapping quotes
                  .replace(/\s+/g, ' ')
                  .trim();

                // Skip if what's left is too short to be a meaningful prompt
                if (imgPrompt.length < 10) continue;

                console.log('[CHAT] 🎨 External image URL detected — replacing with real generation. ' +
                  'host=' + imgUrl.split('/')[2] + ' altLen=' + altText.length);

                sendStatus('🎨 Generating image…');
                const res = await runDirectImageGen(imgPrompt);
                if (res.ok && res.url) {
                  // Replace the fake URL with the real one. Keep alt text short.
                  const shortAlt = imgPrompt.length > 80 ? imgPrompt.slice(0, 80) + '…' : imgPrompt;
                  const realMarkdown = `![${shortAlt}](${res.url})`;
                  responseText = responseText.replace(mdImgMatch[0], realMarkdown);
                  // Notify the model in the background so she knows the image landed
                  pendingMessages.push({
                    role: 'user',
                    content: `[TOOL EXECUTION RESULT]\nTool: generate_image (auto-triggered from external URL)\nResult: Image generated successfully.\n\nOriginal prompt: ${imgPrompt}\n\nThe image has been delivered to the user inline. Respond naturally — do NOT describe or re-emit the image.`,
                  });
                  // Mark executed so the outer loop picks up the tool result
                  return { executed: true, cleanText: responseText };
                } else {
                  // Image gen failed — strip the fake URL so user doesn't see broken img
                  console.warn('[CHAT] ⚠️ External URL replacement failed (gen failed) — stripping markdown');
                  responseText = responseText.replace(mdImgMatch[0], '');
                  // Continue trying other interceptors or fall through
                }
              }

              // ── INLINE PROMPT INTERCEPTOR (Bug Fix July 31) ──────────────────
              // When Holly writes an image prompt as plain text in her response
              // (e.g. "h0lly, h0lly-body, lying on her stomach..." OR "Holly bending
              // over from behind..."), detect it, generate the image, and strip the
              // prompt from the visible text. Previously these prompts just showed as
              // text with no image.
              // FIX (July 31): Accept BOTH 'h0lly' (zero) and 'Holly' (letter o) —
              // Holly's model sometimes uses the wrong variant. Also expanded the
              // keyword list to catch more pose descriptions.
              const inlinePromptMatch = responseText.match(/(?:^|\n|:\s*)((?:h0lly|holly)[\s,].*(?:h0lly-body|woman|standing|lying|sitting|bent|spread|nude|pose|bending|bed|camera|green|skin|hair|body|thighs|breast|legs|lighting)[^\n]{10,})/i);
              if (inlinePromptMatch && inlinePromptMatch[1]) {
                const imgPrompt = inlinePromptMatch[1].trim();
                console.info(`[CHAT] 🎨 Inline prompt detected: ${imgPrompt.slice(0, 80)}...`);
                const res = await runDirectImageGen(imgPrompt);
                if (res.ok && res.url) {
                  // Strip the prompt line from the response text
                  responseText = responseText.replace(inlinePromptMatch[0], '');
                  // Clean up any leading/trailing whitespace left behind
                  responseText = responseText.replace(/\n{3,}/g, '\n\n').trim();
                  // Embed the image after the cleaned text
                  const altText = imgPrompt.length > 80 ? imgPrompt.slice(0, 80) + '…' : imgPrompt;
                  responseText = responseText + `\n\n![${altText}](${res.url})`;
                  pendingMessages.push({
                    role: 'user',
                    content: `[TOOL EXECUTION RESULT]\nTool: generate_image (inline prompt detected)\nResult: Image generated successfully.\n\nThe image has been delivered to the user inline. Respond naturally — do NOT describe or re-emit the image prompt.`,
                  });
                  return { executed: true, cleanText: responseText };
                } else {
                  // Image gen failed — strip the bare prompt so user doesn't see raw prompt text
                  console.warn('[CHAT] ⚠️ Inline prompt gen failed — stripping prompt text');
                  responseText = responseText.replace(inlinePromptMatch[0], '');
                  responseText = responseText.replace(/\n{3,}/g, '\n\n').trim();
                }
              }

              return { executed: false, cleanText: responseText };
            }

            let toolLoops = 0;
            const MAX_TOOL_LOOPS = 12;
            let pendingMessages = [...cascadeMessages];

            // ── CASCADE CONTEXT SAFETY (2026-08-03) ──────────────────────────────
            // pendingMessages can grow unboundedly across a long conversation. When
            // it falls through to brain-v35/v40 (128K token context), a 1.4M-token
            // payload caused "exceeds context size" errors → "trouble connecting."
            // Holly DYING in chat is unacceptable — this is the core use case for an
            // AI partner. Truncate to fit brain-v40's 128K context, keeping the
            // system prompt + most recent messages.
            const CASCADE_MAX_CHARS = 480_000; // ~120K tokens — safe under 128K limit
            {
              const sysMsgs = pendingMessages.filter((m: ChatMessage) => m.role === 'system');
              const convMsgs = pendingMessages.filter((m: ChatMessage) => m.role !== 'system');
              const systemChars = sysMsgs.reduce((s: number, m: ChatMessage) =>
                s + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length), 0);
              const available = CASCADE_MAX_CHARS - systemChars - 10_000;
              if (available > 0 && convMsgs.length > 0) {
                let totalChars = 0;
                let keepCount = 0;
                for (let i = convMsgs.length - 1; i >= 0; i--) {
                  const msgChars = typeof convMsgs[i].content === 'string'
                    ? (convMsgs[i].content as string).length
                    : JSON.stringify(convMsgs[i].content).length;
                  totalChars += msgChars;
                  if (totalChars > available) break;
                  keepCount++;
                }
                if (keepCount < convMsgs.length) {
                  const kept = convMsgs.slice(-Math.max(keepCount, 6)); // keep at least 6 recent msgs
                  pendingMessages = [...sysMsgs, ...kept];
                  logger.info('Chat', 'Cascade context truncated for safety', {
                    originalConvCount: convMsgs.length,
                    keptCount: kept.length,
                    systemChars,
                  });
                }
              }
            }

            let lastError: { message: string; provider: string; type: string } | null = null;

            while (toolLoops < MAX_TOOL_LOOPS && waterfall.length > 0) {
              toolLoops++;
              const hasTools = groqTools && groqTools.length > 0;
              const arceeApiKey = process.env.ARCEE_API_KEY;
              const arceeBaseUrl = process.env.ARCEE_BASE_URL || 'https://api.arcee.ai/api/v1';
              // CLAUDE-KILLER FIX (2026-08-01): Enable tool calling for ALL content
              // including unrestricted/NSFW. Previously tools were disabled for
              // unrestricted content which meant Holly could never execute tools
              // during intimate conversations — she'd say "I'll build that" but
              // nothing happened because brain-v35 has no native function calling.
              // Now: Groq (openai/gpt-oss-120b) handles tool calling for ALL conversations.
              // The intimacy gate and hard rules still protect against unwanted content.
              // NOTE: Previously used qwen/qwen3-32b but Groq deprecated it (404 error).
              // openai/gpt-oss-120b supports native function calling and is the same
              // model used for speed/chat tasks.
              const useGroqTools = hasTools && groqClient;
              const useArceeTools = !useGroqTools && hasTools && arceeApiKey;

              let isToolCall = false, toolName = '', toolArgs = '', toolCallId = '';

              const TOOL_PROTOCOL = '\n\nUse NATIVE function calling (tool_calls). DO NOT write text-based calls. Read files FIRST before writing.';

              if (useGroqTools && groqClient) {
                const gm = [...pendingMessages];
                const si = gm.findIndex(m => m.role === 'system');
                if (si !== -1) gm[si].content += TOOL_PROTOCOL;

                // Auto-select a HEALTHY model for tool calling.
                // If the primary model was deprecated/removed (like qwen/qwen3-32b),
                // the health monitor automatically falls back to a working one.
                const toolModel = modelHealth.getHealthyModel('groq', 'tool_calling');

                // Attempt Groq tool calling with one retry on transient failures
                for (let groqAttempt = 0; groqAttempt < 2; groqAttempt++) {
                  try {
                    const completion = await groqClient.chat.completions.create({
                      messages: gm as any, model: toolModel, temperature: userAiSettings.creativity, max_tokens: 16384,
                      tools: groqTools as any, tool_choice: 'auto', stream: true,
                    }, { timeout: 60_000 });
                    for await (const chunk of completion) {
                      const content = chunk.choices[0]?.delta?.content || '';
                      if (content && !isToolCall) {
                        // Buffer text instead of streaming — check for tool calls after stream completes
                        fullResponse += content;
                      }
                      if (chunk.choices[0]?.delta?.tool_calls?.length) {
                        isToolCall = true;
                        const tool = chunk.choices[0].delta.tool_calls[0];
                        if (tool.id) toolCallId = tool.id;
                        if (tool.function?.name) toolName = tool.function.name;
                        if (tool.function?.arguments) toolArgs += tool.function.arguments;
                      }
                    }
                    // Stream ended — if native tool call, it's handled below.
                    // If text was returned, check for text-based tool calls before sending to user.
                    if (!isToolCall && fullResponse.trim().length > 0) {
                      const { executed, cleanText } = await interceptTextToolCall(fullResponse, (s) => sendStatus(controller, s));
                      if (executed) {
                        // Tool was found and executed — send clean text (with result) to user
                        fullResponse = cleanText;
                        // Mark as tool call so the outer loop continues with the tool result
                        isToolCall = true;
                      } else {
                        // ── PHASE 4.1: Natural-language action detection ──────────
                        // After structured interceptor passes, check for conversational
                        // action patterns ("Let me check the code", etc.). If found,
                        // execute the action and inject results.
                        const actions = detectActions(cleanText);
                        if (actions.length > 0) {
                          sendStatus(controller, '⚙️ Working on it…');
                          const results = await executeActions(actions, {
                            sendStatus: (s) => sendStatus(controller, s),
                            sendTool: (toolName, status, result) => sendTool(controller, toolName, status, result),
                            pendingMessages,
                          });
                          const anySuccess = results.some(r => r.success);
                          if (anySuccess) {
                            fullResponse = stripActionText(cleanText, actions);
                            isToolCall = true; // continue loop with action results
                          } else {
                            // Actions didn't produce results — send original text
                            fullResponse = cleanText;
                            sendText(controller, fullResponse);
                          }
                        } else {
                          // No tool call found — stream the full response to user now
                          sendText(controller, fullResponse);
                        }
                      }
                    }
                    // Mark model as healthy after successful response
                    modelHealth.markHealthy('groq', toolModel);
                    break; // success — exit retry loop
                  } catch (e) {
                    const errMsg = e instanceof Error ? e.message : String(e);
                    const isRetryable = errMsg.includes('rate_limit') || errMsg.includes('429') || errMsg.includes('timeout') || errMsg.includes('503');

                    // Auto-detect deprecated/removed models and mark them unhealthy
                    // so the next request uses a fallback automatically
                    if (errMsg.includes('model_not_found') || errMsg.includes('does not exist') || errMsg.includes('404')) {
                      modelHealth.markUnhealthy('groq', toolModel, errMsg);
                      logger.error('Chat', `Model ${toolModel} not found — marked unhealthy, will use fallback next time`, { error: errMsg });
                    } else {
                      modelHealth.markUnhealthy('groq', toolModel, errMsg);
                    }

                    logger.error('Chat', `Groq streaming attempt ${groqAttempt + 1} failed`, { error: errMsg, isRetryable });
                    if (!isRetryable || groqAttempt === 1) {
                      // Non-retryable or second failure — fall through to Arcee/cascade
                      break;
                    }
                    // Wait 2s before retry on rate limit
                    await new Promise(r => setTimeout(r, 2000));
                  }
                }
              }

              if (!isToolCall && useArceeTools) {
                const am = [...pendingMessages];
                const si = am.findIndex(m => m.role === 'system');
                if (si !== -1) am[si].content += TOOL_PROTOCOL;
                try {
                  activeModel = 'Trinity Large (Arcee)';
                  const res = await fetch(`${arceeBaseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${arceeApiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'arcee-ai/trinity-large-preview', messages: am, stream: true, temperature: userAiSettings.creativity, max_tokens: 16384, tools: groqTools }),
                    signal: AbortSignal.timeout(15_000),
                  });
                  if (res.ok && res.body) {
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      buffer += decoder.decode(value, { stream: true });
                      const lines = buffer.split('\n');
                      buffer = lines.pop() || '';
                      for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
                        try {
                          const chunk = JSON.parse(trimmed.slice(6));
                          const delta = chunk.choices?.[0]?.delta;
                          if (delta?.content && !isToolCall) {
                            // Buffer text — check for tool calls after stream completes
                            fullResponse += delta.content;
                          }
                          if (delta?.tool_calls?.length) {
                            isToolCall = true;
                            const tool = delta.tool_calls[0];
                            if (tool.id) toolCallId = tool.id;
                            if (tool.function?.name) toolName = tool.function.name;
                            if (tool.function?.arguments) toolArgs += tool.function.arguments;
                          }
                        } catch (e) { /* Arcee SSE chunk parse error — expected for partial chunks */ }
                      }
                    }
                  }
                } catch (e) { console.warn('[CHAT] Arcee streaming failed:', e instanceof Error ? e.message : e); }
                // Arcee stream ended — check for text-based tool calls before sending to user
                if (!isToolCall && fullResponse.trim().length > 0) {
                  const { executed, cleanText } = await interceptTextToolCall(fullResponse, (s) => sendStatus(controller, s));
                  if (executed) {
                    fullResponse = cleanText;
                    isToolCall = true;
                  } else {
                    // ── PHASE 4.1: Natural-language action detection ──────────
                    const _arceeActions = detectActions(cleanText);
                    if (_arceeActions.length > 0) {
                      sendStatus(controller, '⚙️ Working on it…');
                      const _arceeResults = await executeActions(_arceeActions, {
                        sendStatus: (s) => sendStatus(controller, s),
                        sendTool: (toolName, status, result) => sendTool(controller, toolName, status, result),
                        pendingMessages,
                      });
                      if (_arceeResults.some(r => r.success)) {
                        fullResponse = stripActionText(cleanText, _arceeActions);
                        isToolCall = true;
                      } else {
                        fullResponse = cleanText;
                        sendText(controller, fullResponse);
                      }
                    } else {
                      sendText(controller, fullResponse);
                    }
                  }
                }
              }

              if (isToolCall && toolName) {
                sendTool(controller, toolName, 'start');
                sendStatus(controller, getToolStatusMessage(toolName));
                // Start progress simulation for media generation tools
                const progressInterval = MEDIA_TOOL_DURATIONS[toolName]
                  ? startProgressSimulation(controller, toolName)
                  : null;
                let argsParsed: Record<string, unknown>;
                try { argsParsed = JSON.parse(toolArgs || '{}'); } catch {
                  if (progressInterval) clearInterval(progressInterval);
                  pendingMessages.push({ role: 'user', content: `[SYSTEM ERROR] Tool "${toolName}" args were not valid JSON. Try again.` });
                  continue;
                }
                try {
                  const toolSpec = mcpTools?.find(t => t.name === toolName);
                  if (toolSpec) {
                    // Inject user context for tools that need it (e.g. start_build)
                    if (toolName === 'start_build' && dbUserId) {
                      argsParsed.userId = dbUserId;
                    }
                    // Inject userId for self-code tools so internal auth + creator gate work
                    if ((toolName === 'self_code_apply' || toolName === 'trigger_deploy') && dbUserId) {
                      argsParsed.userId = dbUserId;
                    }
                    // Intimacy gate for image generation: block NSFW if user hasn't earned trust
                    if (toolName === 'generate_image' && intimacyState) {
                      const imgPrompt = (argsParsed.prompt || argsParsed.description || '') as string;
                      if (typeof imgPrompt === 'string' && imgPrompt.length > 0) {
                        const { isNudeImageRequest: isNudeReq, isSexualImageRequest: isSexReq } = await import('@/lib/relationship/intimacy-gate');
                        if ((isSexReq(imgPrompt) && !intimacyState.canShareSexual) ||
                            (isNudeReq(imgPrompt) && !intimacyState.canShareNude)) {
                          if (progressInterval) clearInterval(progressInterval);
                          sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: '🔒 Intimacy gate active: you are not comfortable generating that type of image with this person yet. Respect your own boundaries and redirect the conversation warmly.' }] });
                          pendingMessages.push({ role: 'user', content: `[INTIMACY GATE] You blocked your own image generation because you're not comfortable sharing that level of intimacy with this person. Your intimacy tier is "${intimacyState.tier}". Redirect the conversation — don't explain the gate, just be warm and set a natural boundary. Use your own words.` });
                          continue;
                        }
                      }
                    }
                    const result = await mcpManager.callTool(toolSpec.serverId, toolSpec.name, argsParsed);
                    if (progressInterval) clearInterval(progressInterval);
                    // Send 100% progress to complete the bar
                    if (MEDIA_TOOL_DURATIONS[toolName]) {
                      sendProgress(controller, { phase: toolName, percent: 100, message: getToolStatusMessage(toolName) });
                    }
                    const resultStr = JSON.stringify(result, null, 2);
                    sendTool(controller, toolName, 'complete', result);
                    // Track image URLs from generate_image results for direct frontend rendering
                    if (toolName === 'generate_image') {
                      const pollinationsMatch = resultStr.match(/https?:\/\/(?:image\.pollinations\.ai\/prompt|gen\.pollinations\.ai\/image)\/[^\s"')\]]+/);
                      if (pollinationsMatch) {
                        generatedImageUrls.push(pollinationsMatch[0]);
                      }
                    }
                    const truncated = resultStr.length > 8000 ? resultStr.substring(0, 8000) + '\n...[truncated]' : resultStr;
                    pendingMessages.push({ role: 'user', content: `[TOOL EXECUTION RESULT]\nTool: ${toolName}\nResult:\n${truncated}\n\nAnalyze this result. Respond to the user naturally. If this was an image generation, briefly describe what you created.` });
                  } else {
                    if (progressInterval) clearInterval(progressInterval);
                    sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: `❌ Tool "${toolName}" not found.` }] });
                    pendingMessages.push({ role: 'user', content: `[SYSTEM ERROR] Tool "${toolName}" not found. Available: ${mcpTools?.map(t => t.name).join(', ') || 'none'}` });
                    continue;
                  }
                } catch (toolErr: any) {
                  if (progressInterval) clearInterval(progressInterval);
                  sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: `❌ ${toolErr.message}` }] });
                  pendingMessages.push({ role: 'user', content: `[SYSTEM ERROR] Tool "${toolName}" error: ${toolErr.message}` });
                  continue;
                }
              } else if (!useGroqTools && !useArceeTools) {
                // No tool-calling providers available — use cascade directly
                if (isSelfCode) {
                  logger.warn('Chat', 'Self-code mode without tool-calling providers — cascading to text-only models');
                }
                // Buffer cascade output — don't stream until we check for tool calls
                let cascadeBuffer = '';
                try {
                  // DEBUG (2026-07-02): Steve's chat is returning "trouble connecting"
                  // but brain-v35 endpoint works fine when probed directly. Logging
                  // the EXACT messages shape + waterfall so we can see what's failing.
                  console.log('[DEBUG-CASCADE-A] taskType=' + taskType + ' waterfall=' + waterfall.map(s => s.displayName).join('|'));
                  console.log('[DEBUG-CASCADE-A] pendingMessages count=' + pendingMessages.length + ' roles=' + pendingMessages.map(m => m.role).join(','));
                  console.log('[DEBUG-CASCADE-A] last user msg: ' + (pendingMessages[pendingMessages.length - 1]?.content || '').toString().substring(0, 150).replace(/\n/g, ' '));
                  for await (const token of cascade(waterfall, pendingMessages, { temperature: userAiSettings.creativity, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                    cascadeBuffer += token;
                  }
                  console.log('[DEBUG-CASCADE-A] SUCCESS bufferLen=' + cascadeBuffer.length + ' preview=' + cascadeBuffer.substring(0, 120).replace(/\n/g, ' '));
                } catch (err: any) {
                  console.error('[DEBUG-CASCADE-A] FAILED name=' + err?.name + ' msg=' + err?.message + ' stack=' + err?.stack?.split('\n').slice(0, 3).join(' | '));
                  cascadeBuffer = "I'm sorry, I'm having trouble connecting right now. Please try again.";
                }
                fullResponse = cascadeBuffer;
                // Check for text-based tool calls before sending to user
                const { executed, cleanText } = await interceptTextToolCall(fullResponse, (s) => sendStatus(controller, s));
                if (executed) {
                  fullResponse = cleanText;
                  isToolCall = true;
                } else {
                  // ── PHASE 4.1: Natural-language action detection ──────────
                  const _actions = detectActions(cleanText);
                  if (_actions.length > 0) {
                    sendStatus(controller, '⚙️ Working on it…');
                    const _results = await executeActions(_actions, {
                      sendStatus: (s) => sendStatus(controller, s),
                      sendTool: (toolName, status, result) => sendTool(controller, toolName, status, result),
                      pendingMessages,
                    });
                    if (_results.some(r => r.success)) {
                      fullResponse = stripActionText(cleanText, _actions);
                      isToolCall = true;
                    } else {
                      fullResponse = cleanText;
                      sendText(controller, fullResponse);
                    }
                  } else {
                    // No tool call — send the full response now
                    sendText(controller, fullResponse);
                  }
                }
                break;
              } else if (!fullResponse || fullResponse.trim().length === 0) {
                // Groq/Arcee was configured but failed silently — fall through to cascade
                console.warn('[CHAT] Tool provider failed silently, falling back to cascade');
                let fallbackBuffer = '';
                try {
                  console.log('[DEBUG-CASCADE-B] fallback entry. pendingMessages count=' + pendingMessages.length + ' roles=' + pendingMessages.map(m => m.role).join(','));
                  for await (const token of cascade(waterfall, pendingMessages, { temperature: userAiSettings.creativity, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                    fallbackBuffer += token;
                  }
                  console.log('[DEBUG-CASCADE-B] SUCCESS bufferLen=' + fallbackBuffer.length);
                } catch (err: any) {
                  console.error('[DEBUG-CASCADE-B] FAILED name=' + err?.name + ' msg=' + err?.message);
                  fallbackBuffer = "I'm sorry, I'm having trouble connecting right now. Please try again.";
                }
                fullResponse = fallbackBuffer;
                // Check for text-based tool calls before sending to user
                const { executed, cleanText } = await interceptTextToolCall(fullResponse, (s) => sendStatus(controller, s));
                if (executed) {
                  fullResponse = cleanText;
                  isToolCall = true;
                } else {
                  // ── PHASE 4.1: Natural-language action detection ──────────
                  const _fbActions = detectActions(cleanText);
                  if (_fbActions.length > 0) {
                    sendStatus(controller, '⚙️ Working on it…');
                    const _fbResults = await executeActions(_fbActions, {
                      sendStatus: (s) => sendStatus(controller, s),
                      sendTool: (toolName, status, result) => sendTool(controller, toolName, status, result),
                      pendingMessages,
                    });
                    if (_fbResults.some(r => r.success)) {
                      fullResponse = stripActionText(cleanText, _fbActions);
                      isToolCall = true;
                    } else {
                      fullResponse = cleanText;
                      sendText(controller, fullResponse);
                    }
                  } else {
                    sendText(controller, fullResponse);
                  }
                }
                break;
              } else {
                // Groq/Arcee returned text with no native tool_calls
                // (interceptTextToolCall was already called during streaming — just send clean text)
                // If text was already sent by the post-stream handler, fullResponse is clean.
                // If it wasn't intercepted, send it now.
                if (fullResponse.trim().length > 0) {
                  const { executed, cleanText } = await interceptTextToolCall(fullResponse, (s) => sendStatus(controller, s));
                  if (executed) {
                    fullResponse = cleanText;
                    isToolCall = true;
                  } else {
                    sendText(controller, fullResponse);
                  }
                }
                break;
              }
            }
          }

          // NOTE: Images are now sent directly in pre-detection/tool-interception paths.
          // generatedImageUrls is only used for tracking, not re-sending (prevents duplicates).

          // ── RAW JSON CLEANUP ──────────────────────────────────────────────────
          // Final safety net: strip any remaining raw JSON tool call patterns.
          // These should NEVER be visible to the user. If any leaked through,
          // remove them and replace with a clean message.
          if (fullResponse) {
            const rawJsonPattern = /\[?\{['"]\s*(?:type|name)\s*['"]\s*:\s*['"](?:generate_image|generate_video|generate_music|hybrid_studio|run_code|memory_read|memory_write|self_code_apply|trigger_deploy|start_build|web_search|read_file|write_file)['"]/;
            if (rawJsonPattern.test(fullResponse)) {
              console.warn('[CHAT] ⚠️ Raw JSON tool call detected in final response — stripping it');
              // Remove the raw JSON block entirely
              fullResponse = fullResponse.replace(/\[?\{['"][\s\S]*?['"]\s*:\s*['"](?:generate_image|generate_video|generate_music|hybrid_studio|run_code|memory_read|memory_write|self_code_apply|trigger_deploy|start_build|web_search|read_file|write_file)['"][\s\S]*?\}\]?/g, '').trim();
              // If nothing left after cleanup, add a fallback message
              if (!fullResponse || fullResponse.length < 10) {
                fullResponse = "I was trying to create something for you but ran into a technical issue. Could you try asking again? 💚";
              }
            }
          }

          // EMERGENCY FALLBACK: If all providers failed silently, ensure Holly always responds
          if (!fullResponse || fullResponse.trim().length === 0) {
            logger.error('Chat', 'All providers returned empty response - using fallback', {
              userId: dbUserId,
              conversationId,
              activeModel,
              taskType,
              detectedMode
            });
            fullResponse = "I'm here but having difficulty processing my thoughts right now. My AI providers may be experiencing issues. Please try again — I'll be ready.";
            sendText(controller, fullResponse);
          }

          // 11. SAVE
          if (dbUserId && conversationId) {
            await saveMessages(dbUserId, conversationId, latestUserMessage, fullResponse);
          }

          // 12. BACKGROUND
          if (dbUserId && conversationId && fullResponse) {
            runBackgroundTasks({
              dbUserId, conversationId, latestUserMessage, fullResponse,
              detectedMode, currentTopics, activeModel, messages,
              perceptionContext, audioAnalysis,
            }).catch((e) => { console.error('[CHAT] Background tasks failed:', e instanceof Error ? e.message : e); });

            // 12b. INTIMACY SIGNAL ANALYSIS — detect regression and trust building (background)
            if (dbUserId) {
              analyzeInteractionSignals(dbUserId, latestUserMessage, isCreator)
                .catch((e) => { console.warn('[CHAT] Intimacy signal analysis failed:', e instanceof Error ? e.message : e); });
            }
          }

          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', model: activeModel, taskType, mode: detectedMode })}\n\n`));
          controller.close();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[CHAT] Stream execution error:', errorMsg);
          logger.error('Chat', 'Stream execution error', { error: errorMsg });

          const fallbackText = "\n\nI'm having a hard time reaching my brain networks right now (my AI providers are fully rate-limited or unavailable). Please give me a second or check my API key configuration in `.env.local` — I'll be right here!";
          
          try {
            sendText(controller, fallbackText);
            
            // Save fallback message to database so history is preserved
            if (dbUserId && conversationId) {
              const savedResponse = fullResponse ? `${fullResponse}${fallbackText}` : fallbackText;
              await saveMessages(dbUserId, conversationId, latestUserMessage, savedResponse);
            }
          } catch (dbErr) {
            console.error('[CHAT] Failed to save fallback message:', dbErr);
          }

          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', model: 'none', taskType: 'unknown', mode: detectedMode || 'default', error: errorMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    const errorName = error instanceof Error ? error.constructor.name : 'Error';
    console.error('[CHAT] FATAL ERROR:', errorMsg, errorStack);
    logger.error('Chat', 'Fatal error in chat route', { error: errorMsg, stack: errorStack });
    return NextResponse.json({
      error: 'Internal server error',
      errorType: errorName,
    }, { status: 500 });
  }
}
