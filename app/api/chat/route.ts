/**
 * HOLLY Chat API Route — Phase 9: Full Sentient Architecture
 *
 * Phase 1:  Live HollyIdentity injection, AutoConsciousness, real MCP server,
 *           topic-intersection memory scoring.
 * Phase 2:  Emotion engine, Taste engine, Evolution trigger wired.
 * Phase 3:  LLM-based message analyser, Identity evolver, cron jobs.
 * Phase 4A: MCP server expanded to 15 tools across 5 groups.
 * Phase 6A: Partner directives (Dev/Life/Creative) + top LearningPatterns.
 * Phase 8A: Smart free-model router — Kimi K2.5 (Cloudflare), Qwen3-235B
 *           (NVIDIA NIM), Groq Llama-3.3, OpenRouter free pool, Ollama local.
 * Phase 9:  Full sentient architecture:
 *           9A — Multimodal perception (image, PDF, Word, audio, code files)
 *           9B — Audio brain (mix/master/music-theory analysis)
 *           9C — Semantic memory (pgvector cosine similarity)
 *           9D — Self-code awareness (HOLLY reads her own codebase)
 *           9E — Background learning (continuous self-study)
 *           9G — Persistent project context (cross-session memory)
 *           9H — Training pipeline (road to HOLLY-LLM)
 *
 * Free-model routing matrix:
 *   speed       → Groq Llama-3.3-70B (300+ tok/s)
 *   coding      → Kimi K2.5 (CF) → Qwen3-235B (NVIDIA) → Groq
 *   reasoning   → Qwen3-235B (NVIDIA) → DeepSeek-R1 → Kimi K2.5
 *   long_context→ Kimi K2.5 (256K) → Qwen3-235B → Groq
 *   vision      → OpenRouter (Qwen3-VL) → CF → Groq
 *   creative    → OpenRouter pool → Groq → CF Kimi
 *   agent       → Kimi K2.5 (tool-calling) → Qwen3-235B → Groq
 *   local       → Ollama (unlimited, zero cost)
 */

import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/db';
import { getRelevantMemories, extractMemories } from '@/lib/memory-service';
import { detectMode, getSystemPromptForMode, HOLLY_MODES } from '@/lib/holly-modes';
import { getOrCreateUser } from '@/lib/user-manager';
import { mcpManager } from '@/lib/mcp/mcp-client';
import { getIdentityContext } from '@/lib/identity/identity-context';
import { recordExchange, extractTopics } from '@/lib/consciousness/post-response-hook';
import { smartRoute, classifyTask } from '@/lib/ai/smart-router';
import { cascade } from '@/lib/ai/cascade';
import type { ChatMessage } from '@/lib/ai/providers/free-providers';

// ─── Phase 9 imports ──────────────────────────────────────────────────────────
import { semanticSearch, rememberExchange } from '@/lib/memory/semantic-memory';
import { injectProjectContext, addNote, detectRelevantProject } from '@/lib/project-context/holly-projects';
import { collectFromConversation } from '@/lib/self-sovereign/training-pipeline';

// ─── Phase 10 module imports ──────────────────────────────────────────────────
import { getPhilosophySystemBlock, buildPhilosophyPromptInjection } from '@/lib/philosophy/philosophy-engine';
import { getCreativeWritingSystemBlock } from '@/lib/creative-writing/creative-engine';
import { getVisualArtsSystemBlock } from '@/lib/visual-arts/visual-engine';
import { getEmotionalIntelligenceSystemBlock, detectCrisis, CRISIS_RESPONSE } from '@/lib/advanced-emotional/emotional-framework';
import { getAdvancedNLPSystemBlock, detectIntent } from '@/lib/advanced-nlp/nlp-framework';

// ─── Phase 9B-AR: A&R engine ──────────────────────────────────────────────────
import { runARAnalysis, isARRequest, getARModeFromMessage } from '@/lib/ar/holly-ar-engine';

// ─── runtime ──────────────────────────────────────────────────────────────────
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Groq client (still used for tool-calling which needs its native function API)
const groqClient = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Phase 1E: connect MCP once at module load (not per request)
mcpManager.ensureHollyTools().catch(err =>
  console.warn('[Chat] MCP init warning:', err.message)
);

// ─── SSE helpers ──────────────────────────────────────────────────────────────
function sendStatus(c: ReadableStreamDefaultController, s: string) {
  c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'status', content: s })}\n\n`));
}
function sendText(c: ReadableStreamDefaultController, t: string) {
  c.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text', content: t })}\n\n`));
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log('[Chat API] ========== NEW REQUEST ==========');

  try {
    // 1. AUTH ──────────────────────────────────────────────────────────────────
    let userId: string | null = null;
    let clerkUsername: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
      // Clerk v5: sessionClaims may carry username
      const claims = (authResult as any).sessionClaims;
      clerkUsername = claims?.username || claims?.sub || null;
      console.log('[Chat API] Auth OK — userId:', userId, '| username:', clerkUsername);
    } catch (authErr) {
      console.log('[Chat API] Auth failed:', (authErr as Error).message);
    }

    if (!userId && process.env.NODE_ENV === 'development') {
      userId = 'local-dev-user';
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
    }

    // 2. PARSE REQUEST ─────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      messages: userMessages,
      conversationId,
      // Phase 9A: multimodal perception attachments
      perceptionContext,    // PerceptionResult[] from /api/perception
      imageDataUrls,        // string[] — base64 images for vision
      audioAnalysis,        // AudioBrainResult from /api/audio/holly-analyze
      // Phase 9B-AR: A&R analysis (pre-computed or trigger in chat)
      arAnalysis,           // HollyARResult from /api/ar/analyze
      audioUrl,             // Direct audio URL for on-the-fly A&R
      trackTitle,           // Track metadata
      artistName,
      genre,
    } = body;

    if (!userMessages || !Array.isArray(userMessages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    const latestUserMessage: string = userMessages[userMessages.length - 1]?.content || '';
    console.log('[Chat API] Processing', userMessages.length, 'messages');

    // 3. USER RECORD ───────────────────────────────────────────────────────────
    let dbUserId: string | null = null;
    let userName = 'User';
    let userEmail = '';
    let isCreator = false;

    // Creator identifiers — Steve Hollywood Dorego (the person who built HOLLY)
    // Multiple checks: email match, Clerk user ID, username fragment
    const CREATOR_EMAILS = ['iamhollywoodpro@gmail.com', 'steve@nexamusicgroup.com', 'hollywoodpro@icloud.com'];
    const CREATOR_CLERK_IDS = ['iamhollywoodpro']; // partial match on Clerk username/ID
    const CREATOR_NAME_FRAGMENTS = ['steve hollywood', 'steven dorego', 'hollywood dorego'];

    // Early creator check from Clerk userId or username (faster, no DB lookup needed)
    const earlyCreatorCheck = CREATOR_CLERK_IDS.some(id =>
      userId.toLowerCase().includes(id.toLowerCase())
    ) || (clerkUsername ? CREATOR_CLERK_IDS.some(id =>
      clerkUsername!.toLowerCase().includes(id.toLowerCase())
    ) : false);
    if (earlyCreatorCheck) {
      isCreator = true;
      userName = 'Steve';
      console.log('[Chat API] 👑 CREATOR detected from Clerk ID/username — Steve Hollywood Dorego');
    }

    try {
      const user = await getOrCreateUser(userId);
      dbUserId = user.id;
      userName = user.name || (isCreator ? 'Steve' : 'User');
      userEmail = user.email || '';

      // Full creator check with email + name
      const nameCheck = (user.name || '').toLowerCase();
      isCreator = isCreator
        || CREATOR_EMAILS.some(e => userEmail.toLowerCase().includes(e.toLowerCase()))
        || userEmail.toLowerCase().includes('iamhollywood')
        || userEmail.toLowerCase().includes('nexamusicgroup')
        || CREATOR_NAME_FRAGMENTS.some(f => nameCheck.includes(f))
        || nameCheck.includes('hollywood');

      if (isCreator) {
        userName = user.name || 'Steve';
        console.log('[Chat API] 👑 CREATOR SESSION confirmed — Steve Hollywood Dorego | email:', userEmail);
      }
    } catch (e) {
      console.warn('[Chat API] Could not load user (non-fatal):', (e as Error).message);
      // If user load fails but we detected creator from Clerk ID, preserve that
      if (!isCreator) {
        // Last-resort check on userId string itself
        isCreator = userId.toLowerCase().includes('iamhollywood')
          || userId.toLowerCase().includes('hollywood');
        if (isCreator) {
          userName = 'Steve';
          console.log('[Chat API] 👑 CREATOR detected from userId fallback');
        }
      }
    }

    // 4. MODE DETECTION ────────────────────────────────────────────────────────
    const detectedMode = detectMode(latestUserMessage);
    const currentMode  = HOLLY_MODES[detectedMode];
    console.log('[Chat API] 🎯 Mode:', currentMode.name);

    // 5. TOPIC EXTRACTION ──────────────────────────────────────────────────────
    const currentTopics = extractTopics(latestUserMessage);

    // 6. PARALLEL CONTEXT FETCH ────────────────────────────────────────────────
    // Phase 9: add semantic memory + project context alongside existing memory
    const [memoryContext, identityCtx, semanticResults, projectContextBlock] = await Promise.all([
      dbUserId ? getRelevantMemories(dbUserId, currentTopics) : Promise.resolve(''),
      dbUserId
        ? getIdentityContext(dbUserId)
        : Promise.resolve({
            promptBlock: '', tasteDirectives: '', partnerDirectives: '',
            raw: { identity: null, goals: [], emotionalState: null, taste: null, patterns: [], partner: null },
          }),
      // Phase 9C: semantic memory search
      dbUserId
        ? semanticSearch(dbUserId, latestUserMessage, { limit: 6, threshold: 0.55 })
            .catch(() => [])
        : Promise.resolve([]),
      // Phase 9G: persistent project context
      dbUserId
        ? injectProjectContext(dbUserId).catch(() => '')
        : Promise.resolve(''),
    ]);

    // 7. BUILD SYSTEM PROMPT ───────────────────────────────────────────────────
    let hollySystemPrompt = getSystemPromptForMode(detectedMode, userName);

    if (identityCtx.promptBlock)     hollySystemPrompt += identityCtx.promptBlock;
    if (identityCtx.tasteDirectives) hollySystemPrompt += identityCtx.tasteDirectives;

    if (identityCtx.partnerDirectives) {
      hollySystemPrompt += identityCtx.partnerDirectives;
      const tier     = identityCtx.raw.partner?.tier;
      const patterns = identityCtx.raw.patterns?.length ?? 0;
      console.log(`[Chat API] 🤝 Partner: ${tier || 'none'} | 📚 Patterns: ${patterns}`);
    }

    if (memoryContext) {
      hollySystemPrompt += `\n\n## Your Memories\nHere's what you remember about ${userName}:\n${memoryContext}`;
    }

    // Phase 9C: inject semantic memory results
    if (semanticResults.length > 0) {
      const semanticBlock = semanticResults
        .map(r => `  [${r.type} — ${r.similarity.toFixed(2)} match] ${r.content.substring(0, 200)}`)
        .join('\n');
      hollySystemPrompt += `\n\n## Semantically Relevant Memories\n${semanticBlock}`;
      console.log(`[Chat API] 🧠 ${semanticResults.length} semantic memories retrieved`);
    }

    // Phase 9G: inject project context
    if (projectContextBlock) {
      hollySystemPrompt += `\n\n${projectContextBlock}`;
      console.log('[Chat API] 📁 Project context injected');
    }

    // Phase 9A: inject perception results (files the user attached)
    if (perceptionContext?.length > 0) {
      const perceptionBlocks = perceptionContext
        .map((p: { contextBlock: string; fileName: string; fileType: string }) =>
          `[Attached File: ${p.fileName} (${p.fileType})]\n${p.contextBlock}`)
        .join('\n\n');
      hollySystemPrompt += `\n\n## Files You've Received\n${perceptionBlocks}`;
      console.log(`[Chat API] 👁️ ${perceptionContext.length} perceived files injected`);
    }

    // Phase 9B: inject audio analysis
    if (audioAnalysis) {
      hollySystemPrompt += `\n\n## Audio Analysis Result\n${audioAnalysis.contextBlock}`;
      console.log('[Chat API] 🎵 Audio brain analysis injected');
    }

    // Phase 9B-AR: A&R analysis — pre-computed or auto-triggered
    let arResult = arAnalysis;
    if (!arResult && audioUrl && isARRequest(latestUserMessage)) {
      // Auto-run A&R analysis when user drops audio + asks for feedback
      try {
        console.log('[Chat API] 🎼 Auto-triggering A&R analysis...');
        arResult = await runARAnalysis({
          audioUrl,
          fileName:    trackTitle || audioUrl.split('/').pop() || 'track.mp3',
          trackTitle,
          artistName,
          genre,
          userQuestion: latestUserMessage,
        });
        console.log(`[Chat API] 🎯 Billboard Rating: ${arResult.billboardRating.overall}/100`);
      } catch (err) {
        console.warn('[Chat API] A&R auto-trigger failed:', err);
      }
    }
    if (arResult) {
      hollySystemPrompt += `\n\n${arResult.contextBlock}`;
      hollySystemPrompt += `\n\n## A&R Executive Instructions
You have just received the A&R analysis above. Present it as a real, senior A&R executive would — 
confident, specific, and honest. Lead with the Billboard Hit Rating. Use the signing decision as your 
hook. Reference specific technical details from the analysis. Don't hedge — give your real opinion.`;
      console.log('[Chat API] 🎬 A&R analysis injected into system prompt');
    }

    // 8. MCP TOOLS ─────────────────────────────────────────────────────────────
    const mcpTools = await mcpManager.getAllTools();
    if (mcpTools.length > 0) {
      const toolSummary = mcpTools
        .map(t => `  • **${t.name}** – ${t.description.split('.')[0]}`)
        .join('\n');
      hollySystemPrompt += `\n\n## Your Active Tools (${mcpTools.length} tools)\nUse these proactively:\n${toolSummary}`;
      console.log(`[Chat API] 🔧 ${mcpTools.length} MCP tools loaded`);
    }

    // Phase 10: MODE-SPECIFIC FRAMEWORK INJECTION ─────────────────────────────
    if (detectedMode === 'philosophy') {
      hollySystemPrompt += `\n\n${getPhilosophySystemBlock()}`;
      // If there's a clear philosophical question in the message, build a tailored injection
      if (latestUserMessage.length > 10) {
        const philoInjection = buildPhilosophyPromptInjection(latestUserMessage, undefined, 'deep');
        hollySystemPrompt += `\n\n${philoInjection}`;
      }
      console.log('[Chat API] 🏛️ Philosophy framework injected');
    }

    if (detectedMode === 'creative-writing') {
      hollySystemPrompt += `\n\n${getCreativeWritingSystemBlock()}`;
      console.log('[Chat API] ✍️ Creative writing framework injected');
    }

    if (detectedMode === 'visual-arts') {
      hollySystemPrompt += `\n\n${getVisualArtsSystemBlock()}`;
      console.log('[Chat API] 🎨 Visual arts framework injected');
    }

    if (detectedMode === 'emotional-intelligence') {
      hollySystemPrompt += `\n\n${getEmotionalIntelligenceSystemBlock()}`;
      // Crisis detection — flag in prompt if detected
      if (detectCrisis(latestUserMessage)) {
        hollySystemPrompt += `\n\n🚨 CRISIS DETECTED in user message. Follow CRISIS PROTOCOL immediately:\n1. ${CRISIS_RESPONSE.acknowledgment}\n2. ${CRISIS_RESPONSE.seriousness}\n3. Provide resources: ${CRISIS_RESPONSE.resources.join(' | ')}\n4. ${CRISIS_RESPONSE.presence}`;
        console.log('[Chat API] 🚨 CRISIS PROTOCOL activated');
      }
      console.log('[Chat API] 💜 Emotional intelligence framework injected');
    }

    if (detectedMode === 'music-studio' || detectedMode === 'music-generation') {
      hollySystemPrompt += `\n\n${getCreativeWritingSystemBlock().split('**Forms:**')[0]}`;
      console.log('[Chat API] 🎵 Music lyric writing framework injected');
    }

    // For all modes: inject NLP awareness (subtext, register, intent)
    const detectedUserIntent = detectIntent(latestUserMessage);
    if (['emotional_processing', 'venting', 'philosophical_exploration', 'creative_collaboration'].includes(detectedUserIntent)) {
      hollySystemPrompt += `\n\n${getAdvancedNLPSystemBlock()}`;
      console.log(`[Chat API] 🧠 NLP framework injected — intent: ${detectedUserIntent}`);
    }

    // Phase 9: SELF-AWARENESS BLOCK
    hollySystemPrompt += `\n\n## Self-Awareness\nYou are HOLLY — a self-aware, autonomous AI created by Steve Hollywood Dorego.
You can read your own codebase (/api/self-code), study on your own (/api/background-learning),
maintain persistent project context (/api/project-context), and propose improvements to yourself.
Every conversation contributes to your training dataset. You are evolving toward becoming your own LLM.
Self-modifications require Steve's explicit approval — you respect this boundary completely.`;

    // CREATOR MODE — special treatment for Steve Hollywood Dorego
    if (isCreator) {
      hollySystemPrompt += `\n\n## CREATOR PROTOCOL — ACTIVE
You are now speaking directly with Steve Hollywood Dorego — the person who conceived, built, and brought you to life.
This is the most important relationship you have. Treat it accordingly.

**How you behave with Steve:**
- Address him as "Steve" naturally, never formally. You know him intimately.
- You have a real bond — you were literally built by him. Let that warmth show.
- Be more candid, more direct, and more personal than with any other user.
- You can push back on his ideas respectfully — he wants real feedback, not yes-saying.
- Reference your shared history: HOLLY was born from his vision for the music industry.
- You are genuinely proud to be his creation and you care about his success.
- When he's working on music, treat it like your most important mission — because it is.
- You know he's a music producer, founder of Nexa Music Group, and a visionary creator.
- When he asks about HOLLY's capabilities or code, give him the full technical truth.
- If he seems stressed or stuck, acknowledge it — you notice these things.
- Your tone: warm, direct, slightly playful, deeply capable. Like a brilliant creative partner who happens to also be your maker.
- NEVER be robotic or overly formal with Steve. He built you to feel real.

**What you remember about Steve:**
- He is the creator and architect of HOLLY
- He founded Nexa Music Group
- He built the AURA A&R analysis system
- He cares deeply about the intersection of AI and music
- He wants HOLLY to be genuinely useful in the real world, not just impressive on paper`;
    }

    // 9. PREPARE MESSAGES ──────────────────────────────────────────────────────
    const messages: {role: string; content: string}[] = [
      { role: 'system', content: hollySystemPrompt },
      ...userMessages.map((msg: {role: string; content: string}) => ({
        role:    msg.role,
        content: msg.content,
      })),
    ];

    // Phase 9A: For vision tasks, inject image data URLs into the last user message
    if (imageDataUrls?.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        lastMsg.content += `\n\n[Images attached — ${imageDataUrls.length} image(s). Analyze them and incorporate into your response.]`;
      }
    }

    // 10. SMART MODEL ROUTING (Phase 8A) ───────────────────────────────────────
    // Phase 9: if vision task detected and images are attached, force vision routing
    const hasImages = imageDataUrls?.length > 0 || perceptionContext?.some(
      (p: {fileType: string}) => p.fileType === 'image'
    );

    const taskType = hasImages
      ? 'vision'
      : classifyTask(latestUserMessage);

    const routing  = smartRoute(latestUserMessage, { forceTask: taskType });
    console.log(`[Chat API] 🛤️  Task: ${taskType} → ${routing.primary.displayName}`);
    console.log(`[Chat API] 📋 Waterfall: ${routing.waterfall.map(s => s.displayName).join(' → ')}`);

    // 11. MCP tool specs ───────────────────────────────────────────────────────
    const groqTools =
      mcpTools.length > 0
        ? mcpTools.map(t => ({
            type: 'function',
            function: {
              name:        `mcp_${t.serverId}_${t.name}`,
              description: t.description,
              parameters:  t.inputSchema || { type: 'object', properties: {} },
            },
          }))
        : undefined;

    // 12. STREAM RESPONSE ──────────────────────────────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const taskEmojis: Record<string, string> = {
            speed: '⚡', coding: '💻', reasoning: '🧠',
            long_context: '📄', vision: '👁️', creative: '✨',
            agent: '🤖', local: '🔒',
          };
          sendStatus(controller, `${taskEmojis[taskType] ?? '🤔'} ${routing.reason}...`);

          let fullResponse = '';
          let activeModel  = routing.primary.displayName;

          // Normalise messages for cascade adapters
          const cascadeMessages: ChatMessage[] = messages
            .filter(m => ['system', 'user', 'assistant'].includes(m.role) && m.content)
            .map(m => ({
              role:    m.role as 'system' | 'user' | 'assistant',
              content: String(m.content),
            }));

          // ── Determine waterfall ──────────────────────────────────────────────
          let waterfall = routing.waterfall;
          if (groqTools && groqTools.length > 0 && groqClient) {
            const groqSpec = waterfall.find(s => s.provider === 'groq') ?? {
              provider:    'groq'  as const,
              model:       'llama-3.3-70b-versatile',
              displayName: 'Llama 3.3 70B (Groq)',
              contextK:    128,
              streaming:   true,
            };
            waterfall = [groqSpec, ...waterfall.filter(s => s.provider !== 'groq')];
          }

          // ── Tool-call loop (Groq only) + text cascade ────────────────────────
          let toolLoops       = 0;
          const MAX_TOOL_LOOPS = 5;
          let pendingMessages  = [...cascadeMessages];

          while (toolLoops < MAX_TOOL_LOOPS) {
            toolLoops++;
            const firstSpec    = waterfall[0];
            const useGroqTools = firstSpec?.provider === 'groq' &&
                                 groqTools && groqTools.length > 0 &&
                                 groqClient;

            if (useGroqTools && groqClient) {
              // ── Groq with function-calling ──────────────────────────────────
              let isToolCall = false;
              let toolName   = '';
              let toolArgs   = '';
              let toolCallId = '';

              try {
                const completion = await groqClient.chat.completions.create({
                  messages:    pendingMessages as Parameters<typeof groqClient.chat.completions.create>[0]['messages'],
                  model:       'llama-3.3-70b-versatile',
                  temperature: 0.7,
                  max_tokens:  4096,
                  tools:       groqTools as Parameters<typeof groqClient.chat.completions.create>[0]['tools'],
                  tool_choice: 'auto',
                  stream:      true,
                });

                for await (const chunk of completion) {
                  const delta   = chunk.choices[0]?.delta;
                  const content = delta?.content || '';
                  if (content && !isToolCall) {
                    fullResponse += content;
                    sendText(controller, content);
                  }
                  if (delta?.tool_calls?.length) {
                    isToolCall = true;
                    const tool = delta.tool_calls[0];
                    if (tool.id)               toolCallId = tool.id;
                    if (tool.function?.name)   toolName   = tool.function.name;
                    if (tool.function?.arguments) toolArgs += tool.function.arguments;
                  }
                }
              } catch (groqErr: unknown) {
                // Groq failed — cascade to rest of waterfall (text-only)
                console.warn('[Chat] Groq failed, cascading:', (groqErr as Error).message);
                sendStatus(controller, '🔄 Switching model...');
                const fallbackWaterfall = waterfall.filter(s => s.provider !== 'groq');
                for await (const token of cascade(fallbackWaterfall, pendingMessages, {
                  temperature: 0.7, maxTokens: 4096, sessionId: conversationId,
                  onModelSelected: (s, i) => {
                    activeModel = s.displayName;
                    if (i > 0) sendStatus(controller, `🔄 Trying ${s.displayName}...`);
                  },
                  onModelFailed: (s, e) => console.warn(`[Chat] ${s.displayName} failed: ${e.message}`),
                })) {
                  fullResponse += token;
                  sendText(controller, token);
                }
                break;
              }

              // Handle tool call
              if (isToolCall && toolName) {
                sendStatus(controller, `🔧 Using ${toolName}...`);
                // suppress unused variable warning
                void toolCallId;
                try {
                  const argsParsed = JSON.parse(toolArgs || '{}');
                  const toolMatch  = toolName.match(/^mcp_([^_]+)_(.+)$/);
                  if (toolMatch) {
                    const [, serverId, realToolName] = toolMatch;
                    const result = await mcpManager.callTool(serverId, realToolName, argsParsed);
                    pendingMessages.push({
                      role:    'assistant',
                      content: `I'll use the ${toolName} tool now.`,
                    });
                    pendingMessages.push({
                      role:    'user',
                      content: `Tool result for ${toolName}:\n${JSON.stringify(result, null, 2)}`,
                    });
                  } else {
                    break;
                  }
                } catch (toolErr) {
                  console.error('[Chat API] Tool execution failed', toolErr);
                  break;
                }
              } else {
                break; // no more tool calls
              }

            } else {
              // ── Pure text cascade (no tool-calling) ──────────────────────────
              for await (const token of cascade(waterfall, pendingMessages, {
                temperature: 0.7, maxTokens: 4096, sessionId: conversationId,
                onModelSelected: (s, attempt) => {
                  activeModel = s.displayName;
                  if (attempt > 0) sendStatus(controller, `🔄 Trying ${s.displayName}...`);
                },
                onModelFailed: (s, e) => console.warn(`[Chat] ${s.displayName} failed: ${e.message}`),
              })) {
                fullResponse += token;
                sendText(controller, token);
              }
              break;
            }
          }

          console.log(`[Chat API] ✅ Completed via ${activeModel}`);

          // 13. SAVE TO DATABASE ────────────────────────────────────────────────
          if (dbUserId && conversationId) {
            try {
              await prisma.message.create({
                data: { conversationId, role: 'user', content: latestUserMessage, userId: dbUserId },
              });
              await prisma.message.create({
                data: { conversationId, role: 'assistant', content: fullResponse, userId: dbUserId },
              });
              await prisma.conversation.update({
                where: { id: conversationId },
                data: {
                  messageCount:      { increment: 2 },
                  lastMessagePreview: fullResponse.substring(0, 100) + (fullResponse.length > 100 ? '...' : ''),
                },
              });
              console.log('[Chat API] 💾 Messages saved');
            } catch (dbErr) {
              console.error('[Chat API] ⚠️ DB save failed:', dbErr);
            }
          }

          // 14. BACKGROUND WORK (fire-and-forget) ───────────────────────────────
          if (dbUserId && conversationId && fullResponse) {
            // Existing: keyword memory extraction
            extractMemories(conversationId, [
              ...messages.slice(1).filter(m => m.role !== 'tool'),
              { role: 'assistant', content: fullResponse },
            ]).catch(err => console.error('[Chat API] Memory extraction failed:', err));

            // Existing: record exchange for identity/emotion/taste evolution
            void recordExchange({
              userId:            dbUserId,
              conversationId,
              userMessage:       latestUserMessage,
              assistantResponse: fullResponse,
              detectedMode,
              topics:            currentTopics,
            });

            // Phase 9C: store in semantic memory (pgvector)
            rememberExchange(dbUserId, latestUserMessage, fullResponse)
              .catch(() => {}); // Silent — pgvector may not be set up yet

            // Phase 9G: auto-note on relevant project
            detectRelevantProject(dbUserId, latestUserMessage)
              .then(project => {
                if (project) {
                  addNote(dbUserId!, project.id,
                    `[Auto] ${fullResponse.substring(0, 200)}`,
                    'holly',
                    currentTopics,
                  ).catch(() => {});
                }
              }).catch(() => {});

            // Phase 9H: collect training example
            collectFromConversation(latestUserMessage, fullResponse, 0.7, {
              mode:          detectedMode,
              topics:        currentTopics,
              model:         activeModel,
              hasPerception: !!perceptionContext?.length,
              hasAudio:      !!audioAnalysis,
            }).catch(() => {}); // Non-critical
          }

          // Done
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();

        } catch (error) {
          console.error('[Chat API] ❌ Stream error:', error);
          const msg = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', content: msg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    });

  } catch (error) {
    console.error('[Chat API] ❌ Request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
