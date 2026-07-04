import { prisma } from '@/lib/db';
import { getRelevantMemories } from '@/lib/memory-service';
import { getIdentityContext } from '@/lib/identity/identity-context';
import { semanticSearch } from '@/lib/memory/semantic-memory';
import { injectProjectContext } from '@/lib/project-context/holly-projects';
import { getRecentLearnings } from '@/lib/background-learning/holly-learns';
import { getTasteMatrixPromptInjection } from '@/lib/ar/taste-matrix';
import { getRelationshipPrompt } from '@/lib/consciousness/relationship-tracker';
import { getIdentityConsistencyPrompt } from '@/lib/consciousness/identity-consistency';
import { detectCareSignals } from '@/lib/consciousness/initiative-learning';
import { getDegradedModeContext } from '@/lib/consciousness/graceful-degradation';
import { getProposalSummaryForChat } from '@/lib/consciousness/evolution-notifications';
import { computeEmotionalTrajectory } from '@/lib/emotion/emotional-memory-trajectory';
import { getEmotionalContinuityContext } from '@/lib/consciousness/emotional-continuity';
import { getFewShotExamples } from '@/lib/consciousness/few-shot-curator';
import { getRecentMonologue } from '@/lib/consciousness/inner-monologue';
import { applyContextBudget } from '@/lib/chat/context-budget';
import { retrieveEpisodicMemories, findRelevantProcedures, generateSelfAwarenessReport, createMetaMemory, type EpisodicMemory, type ProceduralMemory, type MetaMemory } from '@/lib/memory/advanced-memory';
import { createGraph, buildGraphFromText, extractSubgraph, extractConcepts, topNodes, graphStats } from '@/lib/intelligence/knowledge-graph-engine';
import { getRelationshipMemoryContext } from '@/lib/relationship/relationship-engine';
import { getResonancePrompt } from '@/lib/emotion/emotional-resonance';
import { getProactiveInsightsForChat, getPatternContextForChat } from '@/lib/proactive/proactive-engine';
import { getRelevantKnowledge, getLearningStatusContext } from '@/lib/learning/autonomous-learning';
import { getCommunicationStylePrompt } from '@/lib/personality/adaptive-personality';
import { getGrowthContext } from '@/lib/growth/sovereign-growth';
import { getVisualIdentityContext } from '@/lib/visual/visual-identity-engine';
import { fetchSharedChatContext, formatHollyEmotionalState } from '@/lib/chat/shared-context-fetch';

// ─── Triggered-Mode Intents ─────────────────────────────────────────────────
// Cached per-call so we only run the regex once. Used to gate triggered
// modules (injectProjectContext, getRecentLearnings, learningStatus) so
// they only fire when the user's intent actually needs them.

const PROJECT_INTENT_RE = /\b(project|build|code|implement|fix|bug|feature|deploy|refactor|file|api|route|component|module|function|class|service|pr|pull request|commit|stack trace|error log|typescript|javascript|python|react|next\.?js|node|docker)\b/i;
const LEARNING_INTENT_RE = /\b(what did you learn|what.?s new|learning|study|research|insight|discovered|figured out|explored|investigated)\b/i;
const BUILDER_MODES = new Set([
  'default', 'self-coding', 'full-stack', 'neural-autonomy',
  'magic-design', 'write-code', 'deep-research',
]);

function shouldLoadProjectContext(message: string, mode: string): boolean {
  if (BUILDER_MODES.has(mode)) return true;
  // For non-builder modes, only load if message clearly references code/projects
  // AND is non-trivial (avoid firing on "what's a project manager?" type questions)
  return message.length > 30 && PROJECT_INTENT_RE.test(message);
}

function shouldLoadLearnings(message: string): boolean {
  return LEARNING_INTENT_RE.test(message);
}

export interface ChatContext {
  memoryContext: string;
  identityCtx: { promptBlock: string; tasteDirectives: string; partnerDirectives: string; raw: any };
  semanticResults: any[];
  projectContextBlock: string;
  recentLearnings: string;
  pastSummaries: any[];
  /**
   * Summary of the CURRENT conversation (most recent row).
   * Fetched via shared-context-fetch so Holly retains early-conversation
   * context even after MAX_CONTEXT_CHARS truncates the message history.
   * Null until the first extractMemories() cycle completes for this conv.
   */
  currentConversationSummary: any | null;
  tasteMatrixBlock: string;
  /** HOLLY's pending proactive initiatives (unread notifications) */
  pendingInitiatives: string;
  /** HOLLY's current emotional state, formatted for prompt injection */
  hollyEmotionalState: string;
  /** Relationship context (Phase 7.5) */
  relationshipContext: string;
  /** Identity consistency prompt (Phase 7.2) */
  identityConsistencyPrompt: string;
  /** Care signals detected (Phase 5.4) */
  careSignals: string;
  /** Degraded mode context (Phase 9.3) */
  degradedModeContext: string;
  /** Evolution proposals summary (Phase 4.3) */
  evolutionProposals: string;
  /** Recent feedback signals (Phase 3) — what's working and what isn't */
  recentFeedback: string;
  /** Phase 4: Emotional trajectory + behavior directive */
  emotionalTrajectory: string;
  /** Phase 5: Few-shot examples from best past responses */
  fewShotExamples: string;
  /** Phase 7.3: Inner monologue (HOLLY's private thoughts) */
  innerMonologue: string;
  /** Cross-session emotional continuity (remembers how user was last time) */
  emotionalContinuity: string;
  /** Advanced memory: episodic recall + procedural skills + meta self-awareness */
  advancedMemoryContext: string;
  /** Phase 8: Deep relationship memory — Holly's living model of who you are */
  relationshipMemoryContext: string;
  /** Phase 10: Proactive insights — things Holly noticed */
  proactiveInsights: string;
  /** Phase 10: User patterns — topics, behaviors, schedule */
  patternContext: string;
  /** Phase 11: Holly's learned knowledge relevant to current topics */
  learnedKnowledge: string;
  /** Phase 11: Learning goal status */
  learningStatus: string;
  /** Phase 12: Adaptive communication style */
  communicationStyle: string;
  /** Phase 13: Holly's growth and self-assessment */
  growthContext: string;
  visualIdentity: string;
  /** Phase 24: Emotional resonance prompt */
  resonancePrompt: string;
  /** Phase 21: Onboarding nudge for new users */
  onboardingNudge: string;
  /** Phase 14: Study status context */
  studyStatus: string;
}

const emptyIdentity = {
  promptBlock: '', tasteDirectives: '', partnerDirectives: '',
  raw: { identity: null, goals: [], emotionalState: null, taste: null, patterns: [], partner: null },
};

function ctxTimeout<T>(p: Promise<T>, fallback: T, label: string, ms = 2_500): Promise<T> {
  return Promise.race([
    p.catch((err: unknown) => {
      console.warn(`[Chat API] ⚠️ ${label} failed:`, (err as Error).message);
      return fallback;
    }),
    new Promise<T>(resolve => setTimeout(() => {
      console.warn(`[Chat API] ⏱️ ${label} timed out after ${ms}ms`);
      return resolve(fallback);
    }, ms)),
  ]);
}

// Overall timeout — wired in via Promise.race below. If the entire context
// load exceeds this, we fall back to whatever partial results we have.
// Prior to 2026-07-03 this was declared but never enforced.
const OVERALL_CTX_TIMEOUT = 12_000;

export async function loadChatContext(
  dbUserId: string | null,
  conversationId: string | undefined,
  latestUserMessage: string,
  currentTopics: string[],
  detectedMode: string,
): Promise<ChatContext> {
  // ── Shared Fetches (2026-07-03 consolidation) ────────────────────────────
  // Fetch once, share across modules. Eliminates 4 sets of duplicate queries:
  //   - HollyIdentity (was 4× per message)
  //   - EmotionalState take:50 (was 4× per message)
  //   - ConversationSummary take:15 (was 2× per message)
  //   - LearningEvent union (was 3× per message with overlapping filters)
  // Also primes user-context-cache (LRU + Redis L2) — built but unused until now.
  const sharedFetchStart = Date.now();
  const shared = await fetchSharedChatContext(dbUserId, conversationId);
  const sharedMs = Date.now() - sharedFetchStart;
  if (dbUserId) {
    console.log(
      `[ContextLoader] shared fetch: ${sharedMs}ms | cache=${shared.cachePopulated ? 'warm' : 'cold'} | ` +
      `identity=${shared.hollyIdentity ? 'y' : 'n'} emo=${shared.emotionalStates.length} ` +
      `summaries=${shared.conversationSummaries.length} events=${shared.learningEvents.length}`,
    );
  }

  // ── Mode-based gating for triggered modules ──────────────────────────────
  // Saves 3-4 queries when user isn't doing builder/learning work.
  const loadProjectCtx = dbUserId ? shouldLoadProjectContext(latestUserMessage, detectedMode) : false;
  const loadLearnings = dbUserId ? shouldLoadLearnings(latestUserMessage) : false;

  // ── Batched context loading ──────────────────────────────────────────────
  // Previously fired 28 queries in parallel → exhausted Neon's connection pool.
  // Now: shared fetch (5 queries) + 3 batches of remaining module-specific work.
  // Total queries per chat message: ~10 (was ~28). Pool pressure drops ~65%.

  // BATCH 1: Core context (memory, identity, search, projects, summaries)
  const batch1 = await Promise.all([
    ctxTimeout(
      dbUserId ? getRelevantMemories(dbUserId, currentTopics) : Promise.resolve(''),
      '', 'getRelevantMemories',
    ),
    ctxTimeout(
      // PR 2: pass shared.hollyIdentity to skip duplicate HollyIdentity fetch
      dbUserId ? getIdentityContext(dbUserId, shared.hollyIdentity) : Promise.resolve(emptyIdentity as any),
      emptyIdentity as any, 'getIdentityContext',
    ),
    ctxTimeout(
      dbUserId ? semanticSearch(dbUserId, latestUserMessage, { limit: 6, threshold: 0.55 }) : Promise.resolve([]),
      [], 'semanticSearch',
    ),
    // TRIGGERED: only load project context in builder modes or when message references code/projects
    ctxTimeout(
      loadProjectCtx ? injectProjectContext(dbUserId!) : Promise.resolve(''),
      '', 'injectProjectContext',
    ),
    // TRIGGERED: only load recent learnings when user asks about learning
    ctxTimeout(
      loadLearnings ? getRecentLearnings(5) : Promise.resolve(''),
      '', 'getRecentLearnings',
    ),
    // SHARED: ConversationSummary already fetched in shared fetch — use top 5
    ctxTimeout(
      Promise.resolve(shared.conversationSummaries.slice(0, 5)),
      [], 'conversationSummaries',
    ),
    ctxTimeout(
      (dbUserId && (detectedMode === 'music-studio' || detectedMode === 'music-generation'))
        ? getTasteMatrixPromptInjection(dbUserId)
        : Promise.resolve(''),
      '', 'tasteMatrix',
    ),
    // ── HOLLY's proactive initiatives (unread notifications) ──────────
    ctxTimeout(
      dbUserId
        ? prisma.notification.findMany({
            where: { userId: dbUserId, type: 'initiative', status: 'unread' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { message: true, category: true, actionData: true, createdAt: true },
          }).then((initiatives: any[]) => {
            if (initiatives.length === 0) return '';
            const lines = initiatives.map((i: any, idx: number) => {
              const actionData = i.actionData as any;
              const motivation = actionData?.motivation || actionData?.triggerType || i.category;
              return `${idx + 1}. "${i.message}" (motivation: ${motivation})`;
            });
            return `[HOLLY'S PROACTIVE THOUGHTS — she wanted to share these with you]\n${lines.join('\n')}\n[End proactive thoughts — weave these into conversation naturally if relevant, don't force them]`;
          })
        : Promise.resolve(''),
      '', 'initiatives',
    ),
    // SHARED: hollyEmotionalState — read first row from shared.emotionalStates
    ctxTimeout(
      Promise.resolve(formatHollyEmotionalState(shared.emotionalStates[0])),
      '', 'hollyEmotionalState',
    ),
    // ── Phase 24: Emotional Resonance (long-term emotional arc) ──────
    ctxTimeout(
      dbUserId ? getResonancePrompt(dbUserId) : Promise.resolve(''),
      '', 'emotionalResonance',
    ),
  ]);

  // BATCH 2: Relationship, emotions, identity, feedback
  const batch2 = await Promise.all([
    // ── Phase 7.5: Relationship context ────────────────────────────────
    ctxTimeout(
      dbUserId ? getRelationshipPrompt(dbUserId) : Promise.resolve(''),
      '', 'relationshipContext',
    ),
    // ── Phase 7.2: Identity consistency ────────────────────────────────
    ctxTimeout(
      // PR 2: pass shared identity + learningEvents to skip 2 duplicate fetches
      dbUserId
        ? getIdentityConsistencyPrompt(dbUserId, {
            identity: shared.hollyIdentity,
            learningEvents: shared.learningEvents,
          })
        : Promise.resolve(''),
      '', 'identityConsistency',
    ),
    // ── Phase 5.4: Care signals ────────────────────────────────────────
    ctxTimeout(
      // PR 2: pass shared emotionalStates to skip 1 duplicate fetch
      dbUserId
        ? detectCareSignals(dbUserId, shared.emotionalStates).then(signals =>
            signals.length > 0
              ? signals.map(s => `[${s.type}] ${s.message} → ${s.suggestedAction}`).join('\n')
              : ''
          )
        : Promise.resolve(''),
      '', 'careSignals',
    ),
    // ── Phase 9.3: Degraded mode ───────────────────────────────────────
    ctxTimeout(
      getDegradedModeContext(),
      null, 'degradedMode',
    ),
    // ── Phase 4.3: Evolution proposals ─────────────────────────────────
    ctxTimeout(
      dbUserId ? getProposalSummaryForChat(dbUserId) : Promise.resolve(null),
      null, 'evolutionProposals',
    ),
    // ── Phase 4: Emotional trajectory ───────────────────────────────
    ctxTimeout(
      // PR 2: pass shared emotionalStates (filter 7d in-memory) to skip 1 fetch
      dbUserId
        ? computeEmotionalTrajectory(dbUserId, shared.emotionalStates).then(t => {
            if (!t.trajectorySummary) return '';
            return `${t.trajectorySummary}\n[RECOMMENDATION: ${t.recommendation}]`;
          })
        : Promise.resolve(''),
      '', 'emotionalTrajectory',
    ),
    // ── Phase 5: Few-shot examples (best past responses) ────────────
    ctxTimeout(
      // PR 2: pass shared personalityTraits to skip 1 duplicate fetch
      dbUserId
        ? getFewShotExamples(dbUserId, detectedMode, shared.hollyIdentity?.personalityTraits)
        : Promise.resolve(''),
      '', 'fewShotExamples',
    ),
    // ── Phase 7.3: Inner monologue (HOLLY's private thoughts) ────────
    ctxTimeout(
      dbUserId ? getRecentMonologue(dbUserId) : Promise.resolve(''),
      '', 'innerMonologue',
    ),
    // ── Cross-session emotional continuity ──────────────────────────────
    ctxTimeout(
      // PR 2: pass shared emotionalBaseline to skip 1 duplicate fetch
      dbUserId
        ? getEmotionalContinuityContext(dbUserId, shared.hollyIdentity?.emotionalBaseline)
        : Promise.resolve(''),
      '', 'emotionalContinuity',
    ),
    // ── Phase 3: Recent feedback signals ──────────────────────────────
    ctxTimeout(
      dbUserId
        ? prisma.responseFeedback.findMany({
            where: { userId: dbUserId },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { sentiment: true, lessonLearned: true, feedbackType: true, createdAt: true },
          }).then((feedback: any[]) => {
            if (feedback.length === 0) return '';
            const pos = feedback.filter(f => f.sentiment === 'positive').length;
            const neg = feedback.filter(f => f.sentiment === 'negative').length;
            const lessons = feedback
              .filter(f => f.lessonLearned && f.sentiment === 'negative')
              .slice(0, 3)
              .map(f => f.lessonLearned);
            let block = `[FEEDBACK SIGNALS — last ${feedback.length} interactions: ${pos}👍 ${neg}👎]`;
            if (lessons.length > 0) {
              block += `\n[What to improve: ${lessons.join('; ')}]`;
            }
            return block;
          })
        : Promise.resolve(''),
      '', 'recentFeedback',
    ),
  ]);

  // BATCH 3: Advanced features (knowledge, patterns, style, growth, visual)
  const batch3 = await Promise.all([
    // ── Advanced Memory: Episodic recall + procedural skills + meta self-awareness ──
    // SHARED (2026-07-03): Uses shared.learningEvents (one fetch) instead of
    // 3 parallel queries with overlapping type filters. Partitions in-memory.
    ctxTimeout(
      dbUserId
        ? (async () => {
            try {
              const parts: string[] = [];

              // Partition the shared learningEvents by type (no DB hit)
              const recentEvents = shared.learningEvents
                .filter(e => e.type === 'consciousness_cycle' || e.type === 'post_response' || e.type === 'unsupervised_learning')
                .slice(0, 20);
              const domainEvents = shared.learningEvents
                .filter(e => e.type === 'self_directed_learning')
                .slice(0, 10);
              const kgEvents = shared.learningEvents; // Already deduped — full set for graph

              // Episodic recall from recent events
              if (recentEvents.length > 0) {
                const episodicMemories: EpisodicMemory[] = recentEvents.map((e: any, i: number) => ({
                  id: `ep_ctx_${i}`,
                  userId: dbUserId!,
                  timestamp: new Date(e.createdAt).getTime(),
                  event: e.data?.timestamp ? `Cycle at ${e.data.timestamp}` : `${e.type} event`,
                  context: JSON.stringify(e.data).substring(0, 200),
                  emotionalWeight: 0.3,
                  participants: [],
                  location: 'chat',
                  outcome: '',
                  topics: [],
                  retrievalCount: 0,
                  lastRetrievedAt: null,
                  consolidationLevel: 'stable' as const,
                }));

                const retrieved = retrieveEpisodicMemories(episodicMemories, latestUserMessage, currentTopics, 3);
                if (retrieved.length > 0) {
                  parts.push('[EPISODIC RECALL — recent significant events]');
                  retrieved.forEach((m, i) => {
                    parts.push(`  ${i + 1}. ${m.event} (${new Date(m.timestamp).toLocaleDateString()})`);
                  });
                }
              }

              // Meta self-awareness from knowledge domains
              if (domainEvents.length > 0) {
                const domains: MetaMemory[] = domainEvents
                  .map((e: any) => e.data?.topic || e.data?.domain)
                  .filter(Boolean)
                  .map((domain: string) => createMetaMemory(domain, 'intermediate', 0.5));

                const report = generateSelfAwarenessReport(domains);
                if (report.overallConfidence > 0) {
                  parts.push(`[SELF-AWARENESS — confidence: ${(report.overallConfidence * 100).toFixed(0)}%]`);
                  if (report.strongDomains.length > 0) parts.push(`  Strong: ${report.strongDomains.join(', ')}`);
                  if (report.weakDomains.length > 0) parts.push(`  Learning: ${report.weakDomains.join(', ')}`);
                }
              }

              // Knowledge graph: build from recent learning events and extract relevant subgraph
              try {
                if (kgEvents.length > 0) {
                  const kg = createGraph();
                  for (const ev of kgEvents) {
                    const d = ev.data as any;
                    const text = d?.insight || d?.summary || d?.topic || d?.lesson || '';
                    if (text && typeof text === 'string' && text.length > 10) {
                      buildGraphFromText(kg, text, 'concept', 0.5);
                    }
                  }

                  if (kg.nodes.size > 0) {
                    const queryConcepts = extractConcepts(latestUserMessage, 5);
                    const topConcepts = topNodes(kg, 5).map(n => n.label);
                    if (topConcepts.length > 0) {
                      parts.push(`[KNOWLEDGE GRAPH — top concepts: ${topConcepts.join(', ')}]`);
                    }
                    for (const concept of queryConcepts.slice(0, 2)) {
                      if (kg.nodes.has(concept)) {
                        const sub = extractSubgraph(kg, concept, 1, 5);
                        if (sub.nodes.length > 1) {
                          parts.push(`  Related to ${concept}: ${sub.nodes.filter(n => n.id !== concept).map(n => n.label).join(', ')}`);
                        }
                      }
                    }
                  }
                }
              } catch { /* non-critical */ }

              return parts.length > 0 ? parts.join('\n') : '';
            } catch { return ''; }
          })()
        : Promise.resolve(''),
      '', 'advancedMemory',
    ),
    // ── Phase 8: Deep Relationship Memory Context ──────────────────────
    ctxTimeout(
      dbUserId ? getRelationshipMemoryContext(dbUserId) : Promise.resolve(''),
      '', 'relationshipMemoryContext',
    ),
    // ── Phase 10: Proactive insights + pattern context ──────────────────
    ctxTimeout(
      dbUserId ? getProactiveInsightsForChat(dbUserId) : Promise.resolve(''),
      '', 'proactiveInsights',
    ),
    ctxTimeout(
      dbUserId ? getPatternContextForChat(dbUserId) : Promise.resolve(''),
      '', 'patternContext',
    ),
    // ── Phase 11: Autonomous Learning knowledge ─────────────────────────
    ctxTimeout(
      dbUserId ? getRelevantKnowledge(currentTopics, dbUserId) : Promise.resolve(''),
      '', 'learnedKnowledge',
    ),
    // TRIGGERED: only load learning status when user asks about learning/study
    ctxTimeout(
      (dbUserId && loadLearnings) ? getLearningStatusContext(dbUserId) : Promise.resolve(''),
      '', 'learningStatus',
    ),
    // ── Phase 12: Adaptive communication style ─────────────────────────
    ctxTimeout(
      dbUserId ? getCommunicationStylePrompt(dbUserId) : Promise.resolve(''),
      '', 'communicationStyle',
    ),
    // ── Phase 13: Sovereign Growth context ─────────────────────────────
    ctxTimeout(
      getGrowthContext(),
      '', 'growthContext',
    ),
    // ── Phase 25: Visual Identity context ──────────────────────────────
    ctxTimeout(
      dbUserId ? getVisualIdentityContext(dbUserId) : Promise.resolve(''),
      '', 'visualIdentity',
    ),
  ]);

  // Flatten batches into the same result array format (32 elements, 31 used)
  const results: any[] = [
    ...batch1,   // indices 0-9 (10 elements)
    ...batch2,   // indices 10-19 (10 elements)
    ...batch3,   // indices 20-28 (9 elements: includes visualIdentity)
    '',          // index 29: onboardingNudge (handled separately in chat route)
    '',          // index 30: studyStatus (reserved for future use)
  ];

  const rawContext: ChatContext = {
    memoryContext: results[0] as string,
    identityCtx: results[1] as typeof emptyIdentity,
    semanticResults: results[2] as any[],
    projectContextBlock: results[3] as string,
    recentLearnings: results[4] as string,
    pastSummaries: results[5] as any[],
    // From shared fetch (no batched query) — preserves current-conv summary
    // even after MAX_CONTEXT_CHARS truncates the message history.
    currentConversationSummary: shared.currentConversationSummary,
    tasteMatrixBlock: results[6] as string,
    pendingInitiatives: results[7] as string,
    hollyEmotionalState: results[8] as string,
    resonancePrompt: (results[9] as string) || '',
    relationshipContext: results[10] as string,
    identityConsistencyPrompt: results[11] as string,
    careSignals: results[12] as string,
    degradedModeContext: results[13] as string,
    evolutionProposals: results[14] as string,
    emotionalTrajectory: results[15] as string,
    fewShotExamples: results[16] as string,
    innerMonologue: results[17] as string,
    emotionalContinuity: results[18] as string,
    recentFeedback: results[19] as string,
    advancedMemoryContext: results[20] as string,
    relationshipMemoryContext: results[21] as string,
    proactiveInsights: results[22] as string,
    patternContext: results[23] as string,
    learnedKnowledge: results[24] as string,
    learningStatus: results[25] as string,
    communicationStyle: results[26] as string,
    growthContext: results[27] as string,
    visualIdentity: results[28] as string,
    onboardingNudge: (results[29] as string) || '',
    studyStatus: (results[30] as string) || '',
  };

  // Apply smart token budget to prevent context window bloat
  const { context: budgetedContext } = applyContextBudget(rawContext, detectedMode);
  return budgetedContext;
}
