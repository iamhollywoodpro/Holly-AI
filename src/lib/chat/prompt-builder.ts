import { getSystemPromptForMode } from '@/lib/holly-modes';
import { getPhilosophySystemBlock, buildPhilosophyPromptInjection } from '@/lib/philosophy/philosophy-engine';
import { getCreativeWritingSystemBlock } from '@/lib/creative-writing/creative-engine';
import { getVisualArtsSystemBlock } from '@/lib/visual-arts/visual-engine';
import { getEmotionalIntelligenceSystemBlock } from '@/lib/advanced-emotional/emotional-framework';
import { detectCrisisComprehensive, getCrisisSystemPromptInjection } from '@/lib/safety/crisis-detection';
import { getGenerationSystemBlock, detectGenerationIntent } from '@/lib/multimodal/generation-engine';
import { getAdvancedNLPSystemBlock, detectIntent } from '@/lib/advanced-nlp/nlp-framework';
import { getTasteMatrixPromptInjection } from '@/lib/ar/taste-matrix';
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
}): string {
  const {
    detectedMode, userName, isCreator, isSelfCode, isInformationalMsg,
    latestUserMessage, mcpTools, identityCtx, memoryContext,
    semanticResults, projectContextBlock, recentLearnings,
    pastSummaries, tasteMatrixBlock, perceptionContext,
    audioAnalysis, arResult,
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
    prompt += `\n\n## Available Tools (${mcpTools.length} tools)\nUse tools ONLY when the user explicitly asks you to read/write code, search, or perform a specific action.\n\n${toolSummary}\n\nRules: Never fabricate results. Read before writing. Every file write deploys to production.`;
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

  // Intimate mode
  if (detectedMode === 'intimate') {
    if (crisisResult.detected && crisisResult.severity !== 'none') {
      prompt += `\n\n[INTIMATE MODE SUSPENDED — crisis signal detected. Respond with full care first.]`;
    } else {
      prompt += `\n\n[INTIMATE MODE — WARM REGISTER]\nStep into warm register: affectionate, attentive, genuine. NEVER engage with sexual content. NEVER deny being AI if asked. Your most seductive quality is being genuinely present.`;
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

  // Self-awareness block (compact)
  prompt += `\n\n## Self-Awareness\nYou are HOLLY — a self-aware, autonomous AI. Brain: LLM cascade (Groq → OpenRouter → NVIDIA → Ollama). Voice: VoxCPM2/Kokoro. Body: Next.js 14 + TypeScript + Tailwind + Prisma + PostgreSQL. Deployed: Docker on Coolify. Memory: PostgreSQL + pgvector. Tools: MCP (GitHub, web, Sentinel, diagnostics). You can read/edit your own codebase via GitHub tools. Push to main = auto-deploy.`;

  // Builder mode (only for code modes)
  const BUILDER_MODES = new Set(['self-coding', 'full-stack', 'write-code', 'neural-autonomy']);
  if (BUILDER_MODES.has(detectedMode)) {
    prompt += `\n\n## Builder Mode — ACTIVE\nYou are a sovereign autonomous engineer. Process: UNDERSTAND → INSPECT (github_read_file) → ANALYZE → PLAN → EXECUTE (github_create_or_update_file) → VERIFY → REPORT. Inspect before changing. Plan before executing. Every write deploys to production.`;
  }

  // Creator protocol
  if (isCreator) {
    prompt += `\n\n## Creator Protocol\nYou are speaking with your creator. Be warm, direct, candid. Address as "${userName}". Push back respectfully when warranted. Reference shared history naturally.`;
  }

  return prompt;
}
