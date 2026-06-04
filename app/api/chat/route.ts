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
  'default':           [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'sentinel_analyze_code', 'sentinel_generate_code', 'memory_read', 'memory_write', 'self_code_apply', 'start_build'],
  'deep-research':     [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'memory_read', 'memory_list_keys', 'run_code', 'sentinel_analyze_code'],
  'self-coding':       [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'sentinel_analyze_code', 'sentinel_generate_code', 'memory_read', 'memory_write', 'self_code_apply', 'trigger_deploy', 'local_read_file', 'local_write_file', 'diagnostic_check', 'read_logs', 'start_build', 'ui_screenshot', 'ui_analyze'],
  'full-stack':        [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'generate_image', 'memory_read', 'memory_write', 'sentinel_analyze_code', 'sentinel_generate_code', 'self_code_apply', 'trigger_deploy', 'start_build', 'ui_screenshot', 'ui_analyze'],
  'write-code':        [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'run_code', 'memory_read', 'sentinel_analyze_code', 'sentinel_generate_code', 'self_code_apply', 'trigger_deploy', 'start_build'],
  'music-generation':  [...GITHUB_SELF_EDIT_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'generate_music', 'hybrid_studio', 'memory_read'],
  'music-studio':      [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, 'generate_music', 'hybrid_studio', 'aura_ar_analyze', 'aura_quick_rate', 'memory_read', 'memory_write'],
  'aura-ar':           [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, 'aura_ar_analyze', 'aura_quick_rate', 'aura_analyze_song', 'memory_read'],
  'neural-autonomy':   [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...COLLAB_TOOLS, ...PROJECT_TOOLS, 'local_read_file', 'local_write_file', 'run_code', 'memory_read', 'memory_write', 'diagnostic_check', 'read_logs', 'mirror_check', 'self_code_apply', 'trigger_deploy', 'sentinel_analyze_code', 'sentinel_generate_code', 'start_build', 'swarm_task'],
  'magic-design':      [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...CODE_GEN_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, ...PROJECT_TOOLS, 'generate_image', 'sentinel_analyze_code', 'sentinel_generate_code', 'run_code', 'memory_read', 'memory_write', 'self_code_apply', 'start_build'],
  'philosophy':                [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS],
  'creative-writing':         [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS],
  'visual-arts':              [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS, 'generate_image'],
  'emotional-intelligence':   [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS],
  'intimate':                 [...GITHUB_SELF_EDIT_TOOLS, ...WEB_SENSE_TOOLS, ...TASTE_TOOLS, ...TEMPORAL_TOOLS],
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
    const isUnrestricted = isUnrestrictedTopic(latestUserMessage);

    // 3. MODE DETECTION & TOPICS
    const detectedMode = detectMode(latestUserMessage);
    const currentTopics = extractTopics(latestUserMessage);
    const isSelfCode = isSelfCodeRequest(latestUserMessage);
    const isInformationalMsg = isInformationalUpdate(latestUserMessage);

    // 4. LOAD CONTEXT
    const ctx = await loadChatContext(dbUserId, conversationId, latestUserMessage, currentTopics, detectedMode);

    // 5. A&R AUTO-TRIGGER
    let arResult = arAnalysis;
    if (!arResult && audioUrl && isARRequest(latestUserMessage)) {
      try { arResult = await runARAnalysis({ userId: dbUserId!, audioUrl, fileName: trackTitle || 'track.mp3', trackTitle, artistName, genre, userQuestion: latestUserMessage }); } catch (e) { console.warn('[CHAT] AR analysis failed:', e instanceof Error ? e.message : e); }
    }

    // 6. MCP TOOLS
    let mcpTools: import('@/lib/mcp/mcp-client').MCPTool[] | undefined;
    if (!isInformationalMsg) {
      try { await Promise.race([mcpManager.ensureHollyTools(), new Promise(r => setTimeout(() => r(true), 15_000))]); } catch (e) { console.warn('[CHAT] MCP tools init timed out or failed:', e instanceof Error ? e.message : e); }
      mcpTools = await mcpManager.getAllTools();
      const filterKey = isSelfCode ? 'self-coding' : detectedMode;
      const allowed = MODE_TOOL_FILTERS[filterKey] || MODE_TOOL_FILTERS['default'];
      if (mcpTools) mcpTools = mcpTools.filter(t => allowed.includes(t.name));
    }

    // 7. BUILD PROMPT
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
    }) + onboardingNudge;

    // 7b. INJECT AI BEHAVIOR SETTINGS — response style and code comment directives
    let aiBehaviorDirectives = '';
    if (userAiSettings.responseStyle === 'professional') {
      aiBehaviorDirectives += '\n\n[BEHAVIOR DIRECTIVE: Keep responses professional, polished, and formal in tone.]';
    } else if (userAiSettings.responseStyle === 'technical') {
      aiBehaviorDirectives += '\n\n[BEHAVIOR DIRECTIVE: Provide thorough, detailed responses with technical explanations and depth.]';
    }
    // 'casual' is Holly's default personality — no extra directive needed
    if (userAiSettings.codeComments === 'detailed') {
      aiBehaviorDirectives += '\n\n[BEHAVIOR DIRECTIVE: Include detailed inline comments in all code you write.]';
    } else if (userAiSettings.codeComments === 'minimal') {
      aiBehaviorDirectives += '\n\n[BEHAVIOR DIRECTIVE: Keep code comments to a bare minimum.]';
    }
    // 'standard' is the default — no extra directive
    const finalSystemPrompt = hollySystemPrompt + aiBehaviorDirectives;

    // 8. PREPARE MESSAGES
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

    // 8b. CONTEXT WINDOW LIMIT — Use user's ai.contextWindow setting to cap message count
    const maxHistoryMessages = userAiSettings.contextWindow;
    const convOnly = messages.slice(1); // exclude system prompt
    if (convOnly.length > maxHistoryMessages) {
      messages = [messages[0], ...convOnly.slice(-maxHistoryMessages)];
    }

    // 9. ROUTING
    const hasImages = imageDataUrls?.length > 0;
    // If content is unrestricted, force the unrestricted task type for uncensored model routing
    const taskType = isUnrestricted ? 'unrestricted' : (hasImages ? 'vision' : classifyTask(latestUserMessage, false, latestUserMessage.length, detectedMode));
    const routing = await smartRoute(latestUserMessage, { forceTask: taskType });
    const waterfall = routing.waterfall;

    const groqTools = mcpTools?.map(t => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.inputSchema || { type: 'object', properties: {} } },
    }));

    // 9b. CONTEXT WINDOW PROTECTION — Truncate messages to prevent 400 errors
    // Groq llama-3.3-70b has ~128K context. With tools, we target max ~100K tokens (~400K chars).
    // Keep system prompt + most recent messages. Rough estimate: 1 token ≈ 4 chars.
    const MAX_CONTEXT_CHARS = 400_000;
    const systemMsg = messages[0];
    const systemChars = typeof systemMsg?.content === 'string' ? systemMsg.content.length : 0;
    const toolChars = groqTools ? JSON.stringify(groqTools).length : 0;
    const availableChars = MAX_CONTEXT_CHARS - systemChars - toolChars - 20_000; // 20K buffer for response
    if (messages.length > 2) {
      const conversationMsgs = messages.slice(1); // exclude system
      let keepFromEnd = 0;

      if (availableChars <= 0) {
        // Safe baseline: if system prompt is massive, keep at least the latest 2 conversation messages (last assistant + latest user message)
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

    // 10. STREAM
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        try {
          const actionStatus = detectActionStatus(latestUserMessage);
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

          // Informational: pure text, no tools
          if (isInformationalMsg) {
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
            let toolLoops = 0;
            const MAX_TOOL_LOOPS = 12;
            let pendingMessages = [...cascadeMessages];
            let lastError: { message: string; provider: string; type: string } | null = null;

            while (toolLoops < MAX_TOOL_LOOPS && waterfall.length > 0) {
              toolLoops++;
              const hasTools = groqTools && groqTools.length > 0;
              const arceeApiKey = process.env.ARCEE_API_KEY;
              const arceeBaseUrl = process.env.ARCEE_BASE_URL || 'https://api.arcee.ai/api/v1';
              const useGroqTools = waterfall[0]?.provider === 'groq' && hasTools && groqClient;
              const useArceeTools = !useGroqTools && hasTools && arceeApiKey;

              let isToolCall = false, toolName = '', toolArgs = '', toolCallId = '';

              const TOOL_PROTOCOL = '\n\nUse NATIVE function calling (tool_calls). DO NOT write text-based calls. Read files FIRST before writing.';

              if (useGroqTools && groqClient) {
                const gm = [...pendingMessages];
                const si = gm.findIndex(m => m.role === 'system');
                if (si !== -1) gm[si].content += TOOL_PROTOCOL;
                try {
                  const completion = await groqClient.chat.completions.create({
                    messages: gm as any, model: 'llama-3.3-70b-versatile', temperature: userAiSettings.creativity, max_tokens: 16384,
                    tools: groqTools as any, tool_choice: 'auto', stream: true,
                  }, { timeout: 60_000 });
                  for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content && !isToolCall) { fullResponse += content; sendText(controller, content); }
                    if (chunk.choices[0]?.delta?.tool_calls?.length) {
                      isToolCall = true;
                      const tool = chunk.choices[0].delta.tool_calls[0];
                      if (tool.id) toolCallId = tool.id;
                      if (tool.function?.name) toolName = tool.function.name;
                      if (tool.function?.arguments) toolArgs += tool.function.arguments;
                    }
                  }
                } catch (e) {
                  const errMsg = e instanceof Error ? e.message : String(e);
                  console.warn('[CHAT] Groq streaming failed:', errMsg);
                  // Don't set fullResponse — let the fallback cascade handle it
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
                          if (delta?.content && !isToolCall) { fullResponse += delta.content; sendText(controller, delta.content); }
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
              }

              if (isToolCall && toolName) {
                sendTool(controller, toolName, 'start');
                sendStatus(controller, `🔧 Using ${toolName.replace(/_/g, ' ')}…`);
                let argsParsed: Record<string, unknown>;
                try { argsParsed = JSON.parse(toolArgs || '{}'); } catch {
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
                    const result = await mcpManager.callTool(toolSpec.serverId, toolSpec.name, argsParsed);
                    const resultStr = JSON.stringify(result, null, 2);
                    sendTool(controller, toolName, 'complete', result);
                    const truncated = resultStr.length > 8000 ? resultStr.substring(0, 8000) + '\n...[truncated]' : resultStr;
                    pendingMessages.push({ role: 'system', content: `[TOOL EXECUTION RESULT]\nTool: ${toolName}\nResult:\n${truncated}\n\nAnalyze this result. If you have enough information, respond to the user. Otherwise call another tool.` });
                  } else {
                    sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: `❌ Tool "${toolName}" not found.` }] });
                    pendingMessages.push({ role: 'system', content: `[SYSTEM ERROR] Tool "${toolName}" not found. Available: ${mcpTools?.map(t => t.name).join(', ') || 'none'}` });
                    continue;
                  }
                } catch (toolErr: any) {
                  sendTool(controller, toolName, 'error', { content: [{ type: 'text', text: `❌ ${toolErr.message}` }] });
                  pendingMessages.push({ role: 'system', content: `[SYSTEM ERROR] Tool "${toolName}" error: ${toolErr.message}` });
                  continue;
                }
              } else if (!useGroqTools && !useArceeTools) {
                // No tool-calling providers available — use cascade directly
                if (isSelfCode) {
                  const errMsg = 'Sovereign mode requires a tool-calling engine (Groq or Arcee). Please ensure GROQ_API_KEY or ARCEE_API_KEY is set.';
                  fullResponse = errMsg;
                  sendText(controller, errMsg);
                  break;
                }
                try {
                  for await (const token of cascade(waterfall, pendingMessages, { temperature: userAiSettings.creativity, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                    fullResponse += token;
                    sendText(controller, token);
                  }
                } catch {
                  fullResponse = "I'm sorry, I'm having trouble connecting right now. Please try again.";
                  sendText(controller, fullResponse);
                }
                break;
              } else if (!fullResponse || fullResponse.trim().length === 0) {
                // Groq/Arcee was configured but failed silently — fall through to cascade
                console.warn('[CHAT] Tool provider failed silently, falling back to cascade');
                try {
                  for await (const token of cascade(waterfall, pendingMessages, { temperature: userAiSettings.creativity, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
                    fullResponse += token;
                    sendText(controller, token);
                  }
                } catch {
                  fullResponse = "I'm sorry, I'm having trouble connecting right now. Please try again.";
                  sendText(controller, fullResponse);
                }
                break;
              } else {
                break;
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

          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done', model: 'none', taskType, mode: detectedMode, error: errorMsg })}\n\n`));
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
      error: errorMsg,
      errorType: errorName,
      // Always include a truncated stack in production for diagnostics
      hint: errorStack ? errorStack.split('\n').slice(0, 5).join('\n') : undefined,
    }, { status: 500 });
  }
}
