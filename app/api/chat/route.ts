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
import { saveMessages, runBackgroundTasks } from '@/lib/chat/background-tasks';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';
import { chatLimiter, getRateLimitKey } from '@/lib/rate-limiter';
import { hasSqlInjection, hasPathTraversal, sanitizePath } from '@/lib/security/input-sanitizer';

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

const MODE_TOOL_FILTERS: Record<string, string[]> = {
  'default':           [...GITHUB_SELF_EDIT_TOOLS, 'web_search', 'web_scrape', 'run_code', 'sentinel_analyze_code', 'sentinel_generate_code', 'memory_read', 'memory_write', 'self_code_apply', 'start_build'],
  'deep-research':     [...GITHUB_SELF_EDIT_TOOLS, 'web_search', 'web_scrape', 'memory_read', 'memory_list_keys', 'run_code', 'sentinel_analyze_code'],
  'self-coding':       [...GITHUB_SELF_EDIT_TOOLS, 'run_code', 'sentinel_analyze_code', 'sentinel_generate_code', 'memory_read', 'memory_write', 'self_code_apply', 'trigger_deploy', 'local_read_file', 'local_write_file', 'diagnostic_check', 'read_logs', 'start_build'],
  'full-stack':        [...GITHUB_SELF_EDIT_TOOLS, 'run_code', 'generate_image', 'memory_read', 'memory_write', 'sentinel_analyze_code', 'sentinel_generate_code', 'self_code_apply', 'trigger_deploy', 'start_build'],
  'write-code':        [...GITHUB_SELF_EDIT_TOOLS, 'run_code', 'memory_read', 'sentinel_analyze_code', 'sentinel_generate_code', 'self_code_apply', 'trigger_deploy', 'start_build'],
  'music-generation':  [...GITHUB_SELF_EDIT_TOOLS, 'generate_music', 'hybrid_studio', 'memory_read'],
  'music-studio':      [...GITHUB_SELF_EDIT_TOOLS, 'generate_music', 'hybrid_studio', 'aura_ar_analyze', 'aura_quick_rate', 'memory_read', 'memory_write'],
  'aura-ar':           [...GITHUB_SELF_EDIT_TOOLS, 'aura_ar_analyze', 'aura_quick_rate', 'aura_analyze_song', 'memory_read'],
  'neural-autonomy':   [...GITHUB_SELF_EDIT_TOOLS, 'local_read_file', 'local_write_file', 'web_search', 'web_scrape', 'run_code', 'memory_read', 'memory_write', 'diagnostic_check', 'read_logs', 'mirror_check', 'self_code_apply', 'trigger_deploy', 'sentinel_analyze_code', 'sentinel_generate_code', 'start_build'],
  'magic-design':      [...GITHUB_SELF_EDIT_TOOLS, 'generate_image', 'sentinel_analyze_code', 'sentinel_generate_code', 'run_code', 'memory_read', 'memory_write', 'self_code_apply', 'start_build'],
  'philosophy':                [...GITHUB_SELF_EDIT_TOOLS, 'web_search', 'web_scrape'],
  'creative-writing':         [...GITHUB_SELF_EDIT_TOOLS, 'web_search', 'web_scrape'],
  'visual-arts':              [...GITHUB_SELF_EDIT_TOOLS, 'generate_image', 'web_search'],
  'emotional-intelligence':   [...GITHUB_SELF_EDIT_TOOLS, 'web_search'],
  'intimate':                 [...GITHUB_SELF_EDIT_TOOLS, 'web_search'],
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

    // 2. PARSE
    const body = await req.json();
    const { messages: userMessages, conversationId, perceptionContext, imageDataUrls, audioAnalysis, arAnalysis, audioUrl, trackTitle, artistName, genre } = body;
    if (!userMessages || !Array.isArray(userMessages)) return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });

    const latestUserMessage: string = userMessages[userMessages.length - 1]?.content || '';
    if (latestUserMessage.length > 50_000) return NextResponse.json({ error: 'Message too long' }, { status: 413 });

    // Input security sanitization (Phase A wiring)
    if (hasSqlInjection(latestUserMessage)) {
      logger.warn('Chat', 'SQL injection attempt blocked', { userId: dbUserId });
      return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 });
    }
    for (const msg of userMessages) {
      if (msg.content && typeof msg.content === 'string' && hasPathTraversal(msg.content)) {
        logger.warn('Chat', 'Path traversal attempt blocked', { userId: dbUserId });
        return NextResponse.json({ error: 'Invalid input detected' }, { status: 400 });
      }
    }

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
    });

    // 8. PREPARE MESSAGES
    type ContentBlock = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'auto' } };
    let messages: { role: string; content: string | ContentBlock[] }[] = [
      { role: 'system', content: hollySystemPrompt },
      ...userMessages.map((msg: any, idx: number) => {
        if (idx === userMessages.length - 1 && msg.role === 'user' && imageDataUrls?.length > 0) {
          return { role: msg.role, content: [{ type: 'text' as const, text: msg.content || 'Please analyze the attached file(s).' }, ...imageDataUrls.map((url: string) => ({ type: 'image_url' as const, image_url: { url, detail: 'auto' as const } }))] };
        }
        return { role: msg.role, content: msg.content };
      }),
    ];

    // 9. ROUTING
    const hasImages = imageDataUrls?.length > 0;
    const taskType = hasImages ? 'vision' : classifyTask(latestUserMessage, false, latestUserMessage.length, detectedMode);
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
    if (availableChars > 0 && messages.length > 2) {
      const conversationMsgs = messages.slice(1); // exclude system
      let totalChars = 0;
      let keepFromEnd = 0;
      for (let i = conversationMsgs.length - 1; i >= 0; i--) {
        const msgChars = typeof conversationMsgs[i].content === 'string'
          ? conversationMsgs[i].content.length
          : JSON.stringify(conversationMsgs[i].content).length;
        totalChars += msgChars;
        if (totalChars > availableChars) break;
        keepFromEnd++;
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
        try {
          const actionStatus = detectActionStatus(latestUserMessage);
          sendStatus(controller, actionStatus || '✨ Thinking…');

          let fullResponse = '';
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
              for await (const token of cascade(waterfall, cascadeMessages, { temperature: 0.7, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
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
                    messages: gm as any, model: 'llama-3.3-70b-versatile', temperature: 0.3, max_tokens: 16384,
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
                    body: JSON.stringify({ model: 'arcee-ai/trinity-large-preview', messages: am, stream: true, temperature: 0.3, max_tokens: 16384, tools: groqTools }),
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
                  for await (const token of cascade(waterfall, pendingMessages, { temperature: 0.7, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
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
                  for await (const token of cascade(waterfall, pendingMessages, { temperature: 0.7, maxTokens: 4096, sessionId: conversationId, onModelSelected: (s) => { activeModel = s.displayName; } })) {
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
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', content: error instanceof Error ? error.message : 'Unknown error' })}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
