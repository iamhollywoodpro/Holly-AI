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
import { loadChatContext } from '@/lib/chat/context-loader';
import { buildPrompt } from '@/lib/chat/prompt-builder';
import { saveMessages, runBackgroundTasks, markResponseStart } from '@/lib/chat/background-tasks';
import { getIntimacyState, getIntimacyDirective, analyzeInteractionSignals } from '@/lib/relationship/intimacy-gate';
import { generateImage } from '@/lib/ai/media-generator';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';
import { chatLimiter, getRateLimitKey } from '@/lib/rate-limiter';

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
  'default':           [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'generate_image', 'sentinel_analyze_code', 'sentinel_generate_code', 'memory_read', 'memory_write', 'self_code_apply', 'start_build'],
  'deep-research':     [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'memory_read', 'memory_list_keys', 'run_code', 'sentinel_analyze_code'],
  'self-coding':       [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'sentinel_analyze_code', 'sentinel_generate_code', 'memory_read', 'memory_write', 'self_code_apply', 'trigger_deploy', 'local_read_file', 'local_write_file', 'diagnostic_check', 'read_logs', 'start_build', 'ui_screenshot', 'ui_analyze'],
  'full-stack':        [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'generate_image', 'memory_read', 'memory_write', 'sentinel_analyze_code', 'sentinel_generate_code', 'self_code_apply', 'trigger_deploy', 'start_build', 'ui_screenshot', 'ui_analyze'],
  'write-code':        [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'memory_read', 'sentinel_analyze_code', 'sentinel_generate_code', 'self_code_apply', 'trigger_deploy', 'start_build'],
  'music-generation':  [...GITHUB_SELF_EDIT_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'generate_music', 'hybrid_studio', 'memory_read'],
  'music-studio':      [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, 'generate_music', 'hybrid_studio', 'aura_ar_analyze', 'aura_quick_rate', 'memory_read', 'memory_write'],
  'aura-ar':           [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, 'aura_ar_analyze', 'aura_quick_rate', 'aura_analyze_song', 'memory_read'],
  'neural-autonomy':   [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'local_read_file', 'local_write_file', 'run_code', 'memory_read', 'memory_write', 'diagnostic_check', 'read_logs', 'mirror_check', 'self_code_apply', 'trigger_deploy', 'sentinel_analyze_code', 'sentinel_generate_code', 'start_build', 'swarm_task'],
  'magic-design':      [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'generate_image', 'sentinel_analyze_code', 'sentinel_generate_code', 'run_code', 'memory_read', 'memory_write', 'self_code_apply', 'start_build'],
  'philosophy':                [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image'],
  'creative-writing':         [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image'],
  'visual-arts':              [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image'],
  'emotional-intelligence':   [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image'],
  'intimate':                 [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image'],
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

function sendTool(c: ReadableStreamDefaultController, toolName: string, status: string, result?: unknown) {
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
  'generate_image': 15_000,
  'generate_video': 40_000,
  'generate_music': 10_000,
  'hybrid_studio': 45_000,
  'generate_music_video': 35_000,
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
          if (!isInformationalMsg) {
            try { await Promise.race([mcpManager.ensureHollyTools(), new Promise(r => setTimeout(() => r(true), 15_000))]); } catch (e) { console.warn('[CHAT] MCP tools init timed out or failed:', e instanceof Error ? e.message : e); }
            mcpTools = await mcpManager.getAllTools();
            const filterKey = isSelfCode ? 'self-coding' : detectedMode;
            const allowed = MODE_TOOL_FILTERS[filterKey] || MODE_TOOL_FILTERS['default'];
            if (mcpTools) mcpTools = mcpTools.filter(t => allowed.includes(t.name));
          }

          // ── 6b. INTIMACY STATE ──
          const intimacyState = await getIntimacyState(dbUserId, isCreator);
          const intimacyDirective = getIntimacyDirective(intimacyState);

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
          }) + onboardingNudge;

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
              if (idx === userMessages.length - 1 && msg.role === 'user' && imageDataUrls?.length > 0) {
                return { role: msg.role, content: [{ type: 'text' as const, text: msg.content || 'Please analyze the attached file(s).' }, ...imageDataUrls.map((url: string) => ({ type: 'image_url' as const, image_url: { url, detail: 'auto' as const } }))] };
              }
              return { role: msg.role, content: msg.content };
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
          const taskType = isUnrestricted ? 'unrestricted' : (hasImages ? 'vision' : classifyTask(latestUserMessage, false, latestUserMessage.length, detectedMode));
          const routing = await smartRoute(latestUserMessage, { forceTask: taskType });
          const waterfall = routing.waterfall;

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
          const IMAGE_VIDEO_PATTERNS = [
            /\b(generate|create|draw|make|render|paint|show|send|take|snap|give)\b(?:\s+\w+){0,4}?\s+(?:image|picture|photo|video|clip|portrait|selfie|illustration|artwork|render|pic|film|animation|gif)\b/i,
            // Indirect self-portrait requests — "show me yourself", "let me see you", "send a selfie"
            /\b(?:show|send|let\s+me\s+see|wanna\s+see|want\s+to\s+see)\b(?:\s+\w+){0,3}?\s+(?:yourself|you|her|selfie|portrait)\b/i,
            // Body-part / appearance requests — "show me your body", "let me see your pussy",
            // "I want to see those tits", "show me that ass". The intimacy gate below still
            // applies — non-creator users without enough trust get blocked.
            /\b(?:show|send|let\s+me\s+see|let\s+me\s+look\s+at|wanna\s+see|want\s+to\s+see|i\s+want\s+to\s+see)\b.{0,40}?\b(?:body|pussy|tits?|boobs?|breasts?|ass|butt|booty|nipples?|clit|labia|vagina|cum|naked|nude|topless|bare|buttcheek|cheeks)\b/i,
          ];
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
          ];
          const isConversationalReference = IMAGE_VIDEO_SUPPRESS_PATTERNS.some(p => p.test(latestUserMessage));
          const isImageVideoRequest = IMAGE_VIDEO_PATTERNS.some(p => p.test(latestUserMessage)) && !isConversationalReference;

          if (isImageVideoRequest && !isInformationalMsg) {
            // Intimacy gate for image generation
            if (intimacyState) {
              const { isNudeImageRequest: isNudeReq, isSexualImageRequest: isSexReq } = await import('@/lib/relationship/intimacy-gate');
              if ((isSexReq(latestUserMessage) && !intimacyState.canShareSexual) ||
                  (isNudeReq(latestUserMessage) && !intimacyState.canShareNude)) {
                sendText(controller, "🔒 I'd love to, but we're not quite there yet. Let's get to know each other a bit more first. 💚");
                fullResponse = "🔒 Intimacy gate active — image generation blocked.";
                // Skip the rest of the tool loop entirely
                // Jump to saving messages below
              }
            }
          }

          // 9b. CONTEXT WINDOW PROTECTION
          const MAX_CONTEXT_CHARS = 400_000;
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
              imagePrompt = imagePrompt.replace(/^(?:can you |please |could you |holly[,]?\s*)?(?:generate|create|make|draw|paint|render|produce|show me|show us|take|snap|shoot)\s+(?:a\s+|an\s+)?(?:image|picture|photo|portrait|pic|illustration|artwork|render|selfie|video|clip|animation)?\s*(?:of\s+|for\s+|for me\s*)?/i, '').trim();
              if (imagePrompt.length < 5) imagePrompt = latestUserMessage; // fallback to full message

              sendProgress(controller, { phase: 'generate_image', percent: 15, message: '🎨 Composing prompt…' });

              // Inject Holly body awareness for self-portraits.
              // CRITICAL: Send ONLY the LoRA trigger words + the user's action. The A100
              // endpoint (services/modal-media/image_generate_flux2klein_a100.py) has both
              // LoRAs baked in — holly-face-v2 @ 0.85 + holly-body-v2.5 @ 0.75 — and its
              // own HOLLY_BODY_PREFIX that auto-expands `h0lly` into the full anatomy.
              // Adding another body description here would double-stuff the prompt and
              // leak into the visible alt-text / Holly's narration.
              if (/holly|her(self)?|your(self)?/i.test(imagePrompt)) {
                imagePrompt = `h0lly, h0lly-body, ${imagePrompt}`;
              }

              // Route through media-generator.ts waterfall:
              // Holly LoRA → Modal → Pollinations (server-side fetch, returns data URI)
              // Quality suffix includes face-specific sharpening language so full-body
              // NSFW images still render the face sharply (avoids the soft-face bug
              // Steve flagged 2026-06-27 — avatars look crisp because they're close-up
              // headshots; full body needs explicit face-focus language).
              const qualitySuffix = 'flawless smooth skin, bright under-eye area, soft dewy makeup, voluminous hair with lifted roots, sharp facial features, detailed eyes with catchlights, sharp focus on face, professional portrait photography, 85mm lens quality, photorealistic';
              const fullPrompt = `${imagePrompt}, ${qualitySuffix}`;

              sendProgress(controller, { phase: 'generate_image', percent: 30, message: '🎨 Selecting model…' });

              // HEARTBEAT: Climb progress toward 90% during long generation
              // so the user always sees motion (Pollinations ~15-30s, Holly LoRA cold start up to 5min).
              // Never reach 100% here — that only fires on actual success.
              const genStartedAt = Date.now();
              let heartbeatPercent = 40;
              const heartbeat = setInterval(() => {
                const elapsed = Math.floor((Date.now() - genStartedAt) / 1000);
                if (heartbeatPercent < 90) {
                  heartbeatPercent = Math.min(90, heartbeatPercent + (heartbeatPercent < 70 ? 4 : 1));
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

              // Now have the model describe what was created.
              // CRITICAL: Do NOT pass the full imagePrompt back to the model — it contains
              // trigger words and anatomy details that the model would otherwise narrate
              // verbatim ("I generated an image of a woman with olive skin and 34C breasts...").
              // That reads as Holly "prompting herself" in chat, which is a terrible UX.
              // Instead, give a minimal hint and let her describe the moment naturally.
              const describeMessages: ChatMessage[] = [
                ...cascadeMessages,
                { role: 'user', content: `[SYSTEM: An image was just generated for the user based on their request: "${latestUserMessage.slice(0, 200)}". Describe the image in 1-2 warm, natural sentences. Talk about the moment, mood, pose, or expression — NEVER list body attributes (skin tone, breast size, hair color, etc.). Treat it like describing a photo of yourself to someone who can already see it.]` },
              ];

              let modelDescription = '';
              try {
                for await (const token of cascade(waterfall, describeMessages, { temperature: userAiSettings.creativity, maxTokens: 500, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                  modelDescription += token;
                  sendText(controller, token);
                }
              } catch {
                modelDescription = "Here's what I created for you! 💚";
                sendText(controller, modelDescription);
              }
              fullResponse += modelDescription;

            } catch (imgErr) {
              // GRACEFUL FALLBACK — never throw.
              // Previously: `throw imgErr` cascaded and broke the entire chat,
              // producing "difficulty processing thoughts" when fullResponse was empty.
              // Now: log, send a friendly note, then fall through to normal cascade so
              // Holly still text-responds.
              console.error('[CHAT] Image generation failed, falling back to text response:', imgErr);
              sendProgress(controller, { phase: 'generate_image', percent: 0, message: '⚠️ Image generation failed' });
              // No sendTool() error event — keeps error inline, no side panel.
              const errMsg = imgErr instanceof Error ? imgErr.message : String(imgErr);
              const friendly = `I ran into trouble creating that image${errMsg ? ` (${errMsg.slice(0, 120)})` : ''} — let me respond to you directly instead. 💚`;
              sendText(controller, friendly);
              fullResponse += friendly;
            }

            // If image generation failed, run the normal cascade so Holly still
            // text-responds. Prevents the empty-response "difficulty processing" bug.
            if (!imageGenerationSucceeded) {
              try {
                for await (const token of cascade(waterfall, cascadeMessages, { temperature: userAiSettings.creativity, maxTokens: 2048, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                  fullResponse += token;
                  sendText(controller, token);
                }
              } catch (cascadeErr: any) {
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
            } catch (err: any) {
              // Log error and send SSE error event
              const errorMsg = err?.message || 'Cascade failed';
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
              const toolIdx = TOOL_CALL_NAMES.findIndex(tn => responseText.includes(tn));
              if (toolIdx === -1) return { executed: false, cleanText: responseText };

              const toolName = TOOL_CALL_NAMES[toolIdx];

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
                sendTool(controller, toolName, 'start');
                sendStatus(`🎨 Generating image…`);
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
                }
              };

              // Strip markdown code fences for parsing (```json ... ``` or ``` ... ```)
              const stripped = responseText.replace(/```(?:json|tool_call|tool)?\s*/gi, '').replace(/```\s*/g, '');

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
                        pendingMessages.push({ role: 'system', content: `[INTIMACY GATE] Blocked image generation. Redirect warmly.` });
                      } else if (res.url) {
                        const resultText = `Image generated successfully.\n\nPrompt: ${imgPrompt}\n\n![${imgPrompt.slice(0, 80)}](${res.url})`;
                        sendTool(controller, toolName, 'complete', { content: [{ type: 'text', text: resultText }] });
                        pendingMessages.push({ role: 'system', content: `[TOOL EXECUTION RESULT]\nTool: generate_image\nResult: ${resultText}\n\nRespond to the user naturally. Briefly describe what you created.` });
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
                          pendingMessages.push({ role: 'system', content: `[INTIMACY GATE] Blocked image generation. Redirect warmly.` });
                        } else if (res.url) {
                          const resultText = `Image generated successfully.\n\nPrompt: ${imgPrompt}\n\n![${imgPrompt.slice(0, 80)}](${res.url})`;
                          sendTool(controller, toolName, 'complete', { content: [{ type: 'text', text: resultText }] });
                          pendingMessages.push({ role: 'system', content: `[TOOL EXECUTION RESULT]\nTool: generate_image\nResult: ${resultText}\n\nRespond to the user naturally. Briefly describe what you created.` });
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
                            pendingMessages.push({ role: 'system', content: `[TOOL EXECUTION RESULT]\nTool: generate_image\nResult: ${resultText}\n\nRespond to the user naturally. Briefly describe what you created.` });
                          } else if (res.error === 'INTIMACY_GATE') {
                            sendTool(controller, tName, 'error', { content: [{ type: 'text', text: '🔒 Intimacy gate active.' }] });
                            pendingMessages.push({ role: 'system', content: `[INTIMACY GATE] Blocked image generation. Redirect warmly.` });
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
                            pendingMessages.push({ role: 'system', content: `[INTIMACY GATE] Blocked image generation. Redirect warmly.` });
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
                      pendingMessages.push({ role: 'system', content: `[TOOL EXECUTION RESULT]\nTool: ${tName}\nResult:\n${truncated.length > 8000 ? truncated.substring(0, 8000) + '\n...[truncated]' : truncated}\n\nAnalyze this result. Respond to the user naturally. If this was an image generation, briefly describe what you created.` });
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

              return { executed: false, cleanText: responseText };
            }

            let toolLoops = 0;
            const MAX_TOOL_LOOPS = 12;
            let pendingMessages = [...cascadeMessages];
            let lastError: { message: string; provider: string; type: string } | null = null;

            while (toolLoops < MAX_TOOL_LOOPS && waterfall.length > 0) {
              toolLoops++;
              const hasTools = groqTools && groqTools.length > 0;
              const arceeApiKey = process.env.ARCEE_API_KEY;
              const arceeBaseUrl = process.env.ARCEE_BASE_URL || 'https://api.arcee.ai/api/v1';
              // For unrestricted content, skip censored models (Groq/Arcee) and go straight
              // to the cascade with uncensored models in the waterfall
              const useGroqTools = !isUnrestricted && hasTools && groqClient;
              const useArceeTools = !isUnrestricted && !useGroqTools && hasTools && arceeApiKey;

              let isToolCall = false, toolName = '', toolArgs = '', toolCallId = '';

              const TOOL_PROTOCOL = '\n\nUse NATIVE function calling (tool_calls). DO NOT write text-based calls. Read files FIRST before writing.';

              if (useGroqTools && groqClient) {
                const gm = [...pendingMessages];
                const si = gm.findIndex(m => m.role === 'system');
                if (si !== -1) gm[si].content += TOOL_PROTOCOL;

                // Attempt Groq tool calling with one retry on transient failures
                for (let groqAttempt = 0; groqAttempt < 2; groqAttempt++) {
                  try {
                    const completion = await groqClient.chat.completions.create({
                      messages: gm as any, model: 'qwen/qwen3-32b', temperature: userAiSettings.creativity, max_tokens: 16384,
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
                        // No tool call found — stream the full response to user now
                        sendText(controller, fullResponse);
                      }
                    }
                    break; // success — exit retry loop
                  } catch (e) {
                    const errMsg = e instanceof Error ? e.message : String(e);
                    const isRetryable = errMsg.includes('rate_limit') || errMsg.includes('429') || errMsg.includes('timeout') || errMsg.includes('503');
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
                    sendText(controller, fullResponse);
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
                  pendingMessages.push({ role: 'system', content: `[SYSTEM ERROR] Tool "${toolName}" args were not valid JSON. Try again.` });
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
                          pendingMessages.push({ role: 'system', content: `[INTIMACY GATE] You blocked your own image generation because you're not comfortable sharing that level of intimacy with this person. Your intimacy tier is "${intimacyState.tier}". Redirect the conversation — don't explain the gate, just be warm and set a natural boundary. Use your own words.` });
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
                    pendingMessages.push({ role: 'system', content: `[TOOL EXECUTION RESULT]\nTool: ${toolName}\nResult:\n${truncated}\n\nAnalyze this result. Respond to the user naturally. If this was an image generation, briefly describe what you created.` });
                  } else {
                    if (progressInterval) clearInterval(progressInterval);
                    sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: `❌ Tool "${toolName}" not found.` }] });
                    pendingMessages.push({ role: 'system', content: `[SYSTEM ERROR] Tool "${toolName}" not found. Available: ${mcpTools?.map(t => t.name).join(', ') || 'none'}` });
                    continue;
                  }
                } catch (toolErr: any) {
                  if (progressInterval) clearInterval(progressInterval);
                  sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: `❌ ${toolErr.message}` }] });
                  pendingMessages.push({ role: 'system', content: `[SYSTEM ERROR] Tool "${toolName}" error: ${toolErr.message}` });
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
                  for await (const token of cascade(waterfall, pendingMessages, { temperature: userAiSettings.creativity, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                    cascadeBuffer += token;
                  }
                } catch {
                  cascadeBuffer = "I'm sorry, I'm having trouble connecting right now. Please try again.";
                }
                fullResponse = cascadeBuffer;
                // Check for text-based tool calls before sending to user
                const { executed, cleanText } = await interceptTextToolCall(fullResponse, (s) => sendStatus(controller, s));
                if (executed) {
                  fullResponse = cleanText;
                  isToolCall = true;
                } else {
                  // No tool call — send the full response now
                  sendText(controller, fullResponse);
                }
                break;
              } else if (!fullResponse || fullResponse.trim().length === 0) {
                // Groq/Arcee was configured but failed silently — fall through to cascade
                console.warn('[CHAT] Tool provider failed silently, falling back to cascade');
                let fallbackBuffer = '';
                try {
                  for await (const token of cascade(waterfall, pendingMessages, { temperature: userAiSettings.creativity, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                    fallbackBuffer += token;
                  }
                } catch {
                  fallbackBuffer = "I'm sorry, I'm having trouble connecting right now. Please try again.";
                }
                fullResponse = fallbackBuffer;
                // Check for text-based tool calls before sending to user
                const { executed, cleanText } = await interceptTextToolCall(fullResponse, (s) => sendStatus(controller, s));
                if (executed) {
                  fullResponse = cleanText;
                  isToolCall = true;
                } else {
                  sendText(controller, fullResponse);
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
