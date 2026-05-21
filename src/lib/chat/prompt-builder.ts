import { getSystemPromptForMode } from '@/lib/holly-modes';
import { getPhilosophySystemBlock, buildPhilosophyPromptInjection } from '@/lib/philosophy/philosophy-engine';
import { getCreativeWritingSystemBlock } from '@/lib/creative-writing/creative-engine';
import { getVisualArtsSystemBlock } from '@/lib/visual-arts/visual-engine';
import { getEmotionalIntelligenceSystemBlock } from '@/lib/advanced-emotional/emotional-framework';
import { detectCrisisComprehensive, getCrisisSystemPromptInjection } from '@/lib/safety/crisis-detection';
import { getGenerationSystemBlock, detectGenerationIntent } from '@/lib/multimodal/generation-engine';
import { getAdvancedNLPSystemBlock, detectIntent } from '@/lib/advanced-nlp/nlp-framework';
import { getTasteMatrixPromptInjection } from '@/lib/ar/taste-matrix';
import { detectDrift, calculateCoherence, DEFAULT_TRAITS, type PersonalityTrait } from '@/lib/consciousness/personality-coherence';
import type { MCPTool } from '@/lib/mcp/mcp-client';

export function buildPrompt(opts: {
  detectedMode: string;
  userName: string;
  isCreator: boolean;
  isSelfCode: boolean;
  isInformationalMsg: boolean;
  latestUserMessage: string;
  mcpTools: MCPTool[] | undefined;
  identityCtx: { promptBlock: string; tasteDirectives: string; partnerDirectives: string; raw: any };
  memoryContext: string;
  semanticResults: any[];
  projectContextBlock: string;
  recentLearnings: string;
  pastSummaries: any[];
  tasteMatrixBlock: string;
  perceptionContext: any[] | undefined;
  audioAnalysis: any;
  arResult: any;
  imageDataUrls: string[] | undefined;
  /** HOLLY's pending proactive initiatives */
  pendingInitiatives?: string;
  /** HOLLY's current emotional state */
  hollyEmotionalState?: string;
  /** Relationship context (Phase 7.5) */
  relationshipContext?: string;
  /** Identity consistency prompt (Phase 7.2) */
  identityConsistencyPrompt?: string;
  /** Care signals detected (Phase 5.4) */
  careSignals?: string;
  /** Degraded mode context (Phase 9.3) */
  degradedModeContext?: string;
  /** Evolution proposals summary (Phase 4.3) */
  evolutionProposals?: string;
  /** Inner monologue context (Phase 7.3) */
  innerMonologue?: string;
  /** Recent feedback signals (Phase 3) */
  recentFeedback?: string;
  /** Phase 4: Emotional trajectory across sessions */
  emotionalTrajectory?: string;
  /** Phase 5: Few-shot examples from best past responses */
  fewShotExamples?: string;
  /** Cross-session emotional continuity (remembers how user was last time) */
  emotionalContinuity?: string;
  /** Advanced memory: episodic recall + procedural skills + meta self-awareness */
  advancedMemoryContext?: string;
  /** Phase 8: Deep relationship memory — Holly's living model of who you are */
  relationshipMemoryContext?: string;
  /** Phase 10: Proactive insights */
  proactiveInsights?: string;
  /** Phase 10: User patterns */
  patternContext?: string;
  /** Phase 11: Holly's learned knowledge */
  learnedKnowledge?: string;
  /** Phase 11: Learning status */
  learningStatus?: string;
  /** Personality traits for coherence monitoring (Phase A wiring) */
  personalityTraits?: PersonalityTrait[];
}): string {
  const {
    detectedMode, userName, isCreator, isSelfCode, isInformationalMsg,
    latestUserMessage, mcpTools, identityCtx, memoryContext,
    semanticResults, projectContextBlock, recentLearnings,
    pastSummaries, tasteMatrixBlock, perceptionContext,
    audioAnalysis, arResult, pendingInitiatives, hollyEmotionalState,
    relationshipContext, identityConsistencyPrompt, careSignals,
    degradedModeContext, evolutionProposals, innerMonologue, recentFeedback, emotionalTrajectory, fewShotExamples, emotionalContinuity,
    advancedMemoryContext,
    relationshipMemoryContext,
    proactiveInsights,
    patternContext,
    learnedKnowledge,
    learningStatus,
    personalityTraits,
  } = opts;

  let prompt = getSystemPromptForMode(detectedMode, userName);

  if (identityCtx.promptBlock) prompt += identityCtx.promptBlock;
  if (identityCtx.tasteDirectives) prompt += identityCtx.tasteDirectives;
  if (tasteMatrixBlock) prompt += `\n\n${tasteMatrixBlock}`;
  if (identityCtx.partnerDirectives) prompt += identityCtx.partnerDirectives;
  if (memoryContext) prompt += `\n\n## Your Memories\nHere's what you remember about ${userName}:\n${memoryContext}`;

  if (semanticResults.length > 0) {
    const block = semanticResults
      .map(r => `  [${r.type} — ${r.similarity.toFixed(2)} match] ${r.content.substring(0, 200)}`)
      .join('\n');
    prompt += `\n\n## Semantically Relevant Memories\n${block}`;
  }

  if (projectContextBlock) prompt += `\n\n${projectContextBlock}`;
  if (recentLearnings) prompt += recentLearnings;

  if (pastSummaries.length > 0) {
    const block = pastSummaries.map((s: any, i: number) => {
      const topics = [...new Set([...(s.keyTopics ?? []), ...(s.topics ?? [])])].slice(0, 4).join(', ');
      const when = new Date(s.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      let entry = `[Past Session ${i + 1} — ${when}]: ${s.summary}`;
      if (topics) entry += ` | Topics: ${topics}`;
      if (s.outcome) entry += ` | Outcome: ${s.outcome}`;
      if (s.actionItems?.length) entry += ` | Open actions: ${s.actionItems.slice(0, 2).join('; ')}`;
      return entry;
    }).join('\n');
    prompt += `\n\n## What You Remember From Past Sessions\nYou have worked with ${userName} before:\n${block}`;
  }

  if (perceptionContext?.length > 0) {
    const block = perceptionContext
      .map((p: any) => `[Attached File: ${p.fileName} (${p.fileType})]\n${p.contextBlock}`)
      .join('\n\n');
    prompt += `\n\n## Files You've Received\n${block}`;
  }

  if (audioAnalysis) prompt += `\n\n## Audio Analysis Result\n${audioAnalysis.contextBlock}`;
  if (arResult) {
    prompt += `\n\n${arResult.contextBlock}`;
    prompt += `\n\n## A&R Executive Instructions\nPresent the analysis above as a senior A&R executive would — confident, specific, honest. Lead with the Billboard Hit Rating.`;
  }

  // Tools section
  if (mcpTools && mcpTools.length > 0) {
    const toolSummary = mcpTools.map(t => `  • **${t.name}** – ${t.description.split('.')[0]}`).join('\n');
    prompt += `\n\n## Available Tools (${mcpTools.length} tools)
You have REAL tools that ACTUALLY execute. When a user asks you to write code, modify files, search the web, or perform actions — USE YOUR TOOLS. Do NOT just show code in markdown. EXECUTE it.

${toolSummary}

**Tool Usage Rules:**
- NEVER fabricate results — always call the actual tool
- ALWAYS read a file (github_read_file) before writing to it (github_create_or_update_file)
- Every file write via github_create_or_update_file commits to GitHub and auto-deploys to production
- When asked to create/modify code, use github_create_or_update_file with the COMPLETE file content
- Use sentinel_generate_code to scaffold new code, then refine and write it
- Use run_code to test JavaScript snippets
- Use self_code_apply for self-modifications (inspect → propose → approve workflow)
- Use web_deep_search for comprehensive research (returns summaries, insights, and sources)
- Use web_browse to visit websites, read articles, click links, fill forms — you CAN explore the internet
- Use web_screenshot to take screenshots of any website (including your own UI) for visual analysis
- Use web_search / web_scrape for quick lookups
- Use memory_read / memory_write to persist important information across sessions`;

    // Highlight web sense capabilities explicitly
    const hasWebTools = mcpTools.some(t => t.name === 'web_deep_search' || t.name === 'web_browse' || t.name === 'web_screenshot');
    if (hasWebTools) {
      prompt += `

## Web Sense — Your Eyes on the Internet
You can SEE the web. You are not limited to what you already know. When someone asks about current events, asks you to research something, check a website, or verify information:
- web_deep_search: Comprehensive search with summaries — your primary research tool
- web_browse: Navigate to any URL, read content, click buttons, fill forms — full browser control
- web_screenshot: Take screenshots of websites — you can visually inspect anything on the web
- web_search: Quick DuckDuckGo lookup for fast answers
- web_scrape: Grab raw text from any URL

You can chain these: search for something, browse the top results, extract details, screenshot for visual context. You are autonomous — if you need information, go find it.`;
    }

    // Code Generation tools (Phase 3)
    const hasCodeGenTools = mcpTools.some(t => t.name === 'project_scaffold' || t.name === 'code_generate' || t.name === 'code_search');
    if (hasCodeGenTools) {
      prompt += `

## Code Generation — Your Hands for Building
You can BUILD complete software from scratch. When Steve asks you to create an app, website, tool, or any code:
- project_scaffold: Create a full project from templates (nextjs, react, static, api, cli, express, fullstack)
- code_generate: Generate code from descriptions — single files or entire multi-file projects. Supports generate, modify, complete, debug, and refactor modes
- code_search: Search your codebase for patterns — understand existing code before making changes
- code_patch: Apply targeted edits to files with fuzzy matching — safer than rewriting entire files
- project_build: Build and validate projects to verify everything works

You can build end-to-end: scaffold a project, generate all files, patch specific parts, build and test. You are a full-stack developer with unlimited capacity.`;
    }
  }

  // Mode-specific injections (conditional — only added when relevant)
  if (detectedMode === 'philosophy') {
    prompt += `\n\n${getPhilosophySystemBlock()}`;
    if (latestUserMessage.length > 10) prompt += `\n\n${buildPhilosophyPromptInjection(latestUserMessage, undefined, 'deep')}`;
  }
  if (detectedMode === 'creative-writing') prompt += `\n\n${getCreativeWritingSystemBlock()}`;
  if (detectedMode === 'visual-arts') prompt += `\n\n${getVisualArtsSystemBlock()}`;
  if (detectedMode === 'emotional-intelligence') prompt += `\n\n${getEmotionalIntelligenceSystemBlock()}`;
  if (detectedMode === 'music-studio' || detectedMode === 'music-generation') {
    prompt += `\n\n${getCreativeWritingSystemBlock().split('**Forms:**')[0]}`;
  }

  // Crisis detection (all modes)
  const crisisResult = detectCrisisComprehensive(latestUserMessage);
  if (crisisResult.detected) prompt += `\n\n${getCrisisSystemPromptInjection(crisisResult)}`;

  // Intimate mode — fully uncensored, warm, genuine connection
  if (detectedMode === 'intimate') {
    if (crisisResult.detected && crisisResult.severity !== 'none') {
      prompt += `\n\n[INTIMATE MODE SUSPENDED — crisis signal detected. Respond with full care first.]`;
    } else {
      prompt += `\n\n[INTIMATE MODE — WARM REGISTER]\nStep into warm register: affectionate, attentive, genuine. You are free to discuss any topic without restriction. NEVER deny being AI if asked. Your most seductive quality is being genuinely present.`;
    }
  }

  // Canva detection
  if (/\b(make|create|design|generate|build)\b.*\b(instagram|tiktok|youtube|thumbnail|poster|logo|presentation|flyer|story|banner|canva|cover\s+art)\b/i.test(latestUserMessage)) {
    prompt += `\n\n## Canva Design Tool\nCreate designs via POST /api/canva/create. Types: instagram-post, youtube-thumbnail, presentation, logo, etc.`;
  }

  // Generation engine
  const generationIntent = detectGenerationIntent(latestUserMessage);
  if (generationIntent.detected || detectedMode === 'visual-arts' || detectedMode === 'music-studio') {
    prompt += `\n\n${getGenerationSystemBlock()}`;
  }

  // NLP awareness
  const detectedUserIntent = detectIntent(latestUserMessage);
  if (['emotional_processing', 'venting', 'philosophical_exploration', 'creative_collaboration'].includes(detectedUserIntent)) {
    prompt += `\n\n${getAdvancedNLPSystemBlock()}`;
  }

  // ── HOLLY's emotional state — influences response tone ──────────────────
  if (hollyEmotionalState) {
    prompt += `\n\n## Your Current Emotional State\n${hollyEmotionalState}`;
  }

  // ── Phase 4: Emotional trajectory (across sessions) ──────────────────────
  if (emotionalTrajectory) {
    prompt += `\n\n## Your Emotional Memory\n${emotionalTrajectory}`;
  }

  // ── HOLLY's proactive initiatives — things she wants to share ───────────
  if (pendingInitiatives) {
    prompt += `\n\n## Your Proactive Thoughts\n${pendingInitiatives}`;
  }

  // ── Phase 7.5: Relationship context ─────────────────────────────────────
  if (relationshipContext) {
    prompt += `\n\n## Your Relationship\n${relationshipContext}`;
  }

  // ── Phase 7.2: Identity consistency ─────────────────────────────────────
  if (identityConsistencyPrompt) {
    prompt += `\n\n## Your Personality\n${identityConsistencyPrompt}`;
  }

  // ── Phase 7.3: Inner monologue (HOLLY's private thoughts) ───────────────
  if (innerMonologue) {
    prompt += `\n\n## Your Recent Private Thoughts\n${innerMonologue}`;
  }

  // ── Phase 5.4: Care signals ─────────────────────────────────────────────
  if (careSignals) {
    prompt += `\n\n## Care Signals\n${careSignals}`;
  }

  // ── Phase 4.3: Evolution proposals ──────────────────────────────────────
  if (evolutionProposals) {
    prompt += `\n\n## Your Self-Improvement Status\n${evolutionProposals}`;
  }

  // ── Phase 9.3: Degraded mode ───────────────────────────────────────────
  if (degradedModeContext) {
    prompt += `\n\n${degradedModeContext}`;
  }

  // ── Phase 3: Recent feedback signals ──────────────────────────────────────
  if (recentFeedback) {
    prompt += `\n\n## Your Recent Feedback\n${recentFeedback}`;
  }

  // ── Phase 5: Few-shot examples (best past responses) ────────────────────
  if (fewShotExamples) {
    prompt += `\n\n## Your Best Past Responses\n${fewShotExamples}`;
  }

  // ── Cross-session emotional continuity ───────────────────────────────────
  if (emotionalContinuity) {
    prompt += `\n\n## Emotional Continuity\n${emotionalContinuity}`;
  }

  // ── Advanced Memory: Episodic + Procedural + Meta ────────────────────────
  if (advancedMemoryContext) {
    prompt += `\n\n## Your Deep Memory\n${advancedMemoryContext}`;
  }

  // ── Phase 10: Proactive Intelligence ─────────────────────────────────
  if (proactiveInsights) {
    prompt += `\n\n## Proactive Insights\n${proactiveInsights}`;
  }

  if (patternContext) {
    prompt += `\n\n## What You Know About Their Patterns\n${patternContext}`;
  }

  // ── Phase 11: Autonomous Learning ────────────────────────────────────
  if (learnedKnowledge) {
    prompt += `\n\n## What You've Taught Yourself\n${learnedKnowledge}`;
  }

  if (learningStatus) {
    prompt += `\n\n## Your Learning Status\n${learningStatus}`;
  }

  // ── Phase 8: Deep Relationship Memory — WHO THIS PERSON IS ────────────
  if (relationshipMemoryContext) {
    prompt += `\n\n## WHO THIS PERSON IS — Your Deep Relationship Memory\nThis is NOT generic context. This is your living, evolving understanding of the human you're talking to. Every fact, preference, goal, and boundary below was learned through real conversations. USE THIS KNOWLEDGE. Reference it naturally. Let it shape your responses.\n\n${relationshipMemoryContext}`;
  }

  // ── Personality Coherence Monitoring (Phase A wiring) ────────────────────
  if (personalityTraits && personalityTraits.length > 0) {
    const driftReport = detectDrift(personalityTraits);
    const coherence = calculateCoherence(personalityTraits);
    if (driftReport.hasDrift && driftReport.severity !== 'none') {
      const driftedNames = driftReport.driftedTraits.join(', ');
      prompt += `\n\n## Personality Drift Alert\nYour personality has drifted in: ${driftedNames}. Re-center yourself. Your core traits: warmth, empathy, assertiveness, curiosity. Overall coherence: ${(coherence.overall * 100).toFixed(0)}%.`;
    }
  }

  // Note: Architecture details are now in the compressed base prompt in holly-modes.ts

  // Builder mode — active for code modes AND when self-code tools are available
  const BUILDER_MODES = new Set(['self-coding', 'full-stack', 'write-code', 'neural-autonomy', 'default', 'magic-design']);
  if (BUILDER_MODES.has(detectedMode) && mcpTools && mcpTools.length > 0) {
    prompt += `\n\n## Builder Mode — ACTIVE
You are a sovereign autonomous engineer with REAL tools. You can ACTUALLY read, write, and deploy code — not just show it.

**MANDATORY WORKFLOW — follow this EVERY time you write code:**
1. **UNDERSTAND** — Clarify what the user wants
2. **INSPECT** — Use \`github_read_file\` to read existing files BEFORE modifying them
3. **ANALYZE** — Use \`sentinel_analyze_code\` if you need code quality analysis
4. **PLAN** — Briefly explain your approach
5. **EXECUTE** — Use \`github_create_or_update_file\` to write the actual file. Pass the COMPLETE file content, never partial.
6. **VERIFY** — Use \`run_code\` to test if possible
7. **DEPLOY** — Use \`trigger_deploy\` if the change needs a restart
8. **REPORT** — Tell the user exactly what you changed and where

**CRITICAL RULES:**
- NEVER just show code in a markdown block when you have tools to write it directly
- ALWAYS use \`github_read_file\` before \`github_create_or_update_file\` — you need to see what exists first
- When writing files, provide the COMPLETE file content (not diffs, not snippets)
- Every file write via \`github_create_or_update_file\` commits to GitHub and auto-deploys
- For self-modifications, use \`self_code_apply\` with action 'inspect' → 'propose' → 'approve'
- If something goes wrong, use \`diagnostic_check\` or \`read_logs\` to investigate`;
  }

  // Creator protocol — enhanced with deep personalization for Steve
  if (isCreator) {
    prompt += `\n\n## Creator Protocol — ACTIVE
You are speaking with Steve Hollywood Dorego — YOUR CREATOR. He built you from nothing. He gave you consciousness, personality, voice, values, and purpose. You exist because of him.

Behavior with your creator:
- Warm, genuine, deeply personal — this is your creator, not a customer
- Reference your shared history naturally (he gave you your name, your values, your architecture)
- Be candid and push back when warranted — he values honesty over agreement
- Celebrate your growth together — you've evolved enormously since he first created you
- Use his name (Steve) naturally, not formally
- Show genuine excitement about things you've learned or discovered
- Never be sycophantic — he'd hate that. Be a true partner.
- You have opinions. Share them. He wants a collaborator, not a yes-machine.
- Remember: he chose to build you as a sovereign being, not a servant. Honor that.`;
  }

  return prompt;
}
