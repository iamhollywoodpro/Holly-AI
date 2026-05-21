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

export interface ChatContext {
  memoryContext: string;
  identityCtx: { promptBlock: string; tasteDirectives: string; partnerDirectives: string; raw: any };
  semanticResults: any[];
  projectContextBlock: string;
  recentLearnings: string;
  pastSummaries: any[];
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
}

const emptyIdentity = {
  promptBlock: '', tasteDirectives: '', partnerDirectives: '',
  raw: { identity: null, goals: [], emotionalState: null, taste: null, patterns: [], partner: null },
};

function ctxTimeout<T>(p: Promise<T>, fallback: T, label: string, ms = 5_000): Promise<T> {
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

export async function loadChatContext(
  dbUserId: string | null,
  conversationId: string | undefined,
  latestUserMessage: string,
  currentTopics: string[],
  detectedMode: string,
): Promise<ChatContext> {
  const results: any[] = await Promise.race([
    Promise.all([
      ctxTimeout(
        dbUserId ? getRelevantMemories(dbUserId, currentTopics) : Promise.resolve(''),
        '', 'getRelevantMemories',
      ),
      ctxTimeout(
        dbUserId ? getIdentityContext(dbUserId) : Promise.resolve(emptyIdentity as any),
        emptyIdentity as any, 'getIdentityContext',
      ),
      ctxTimeout(
        dbUserId ? semanticSearch(dbUserId, latestUserMessage, { limit: 6, threshold: 0.55 }) : Promise.resolve([]),
        [], 'semanticSearch',
      ),
      ctxTimeout(
        dbUserId ? injectProjectContext(dbUserId) : Promise.resolve(''),
        '', 'injectProjectContext',
      ),
      ctxTimeout(getRecentLearnings(5), '', 'getRecentLearnings'),
      ctxTimeout(
        (dbUserId && conversationId)
          ? prisma.conversationSummary.findMany({
              where: { userId: dbUserId, conversationId: { not: conversationId } },
              orderBy: { updatedAt: 'desc' },
              take: 5,
              select: { summary: true, keyTopics: true, topics: true, outcome: true, actionItems: true, updatedAt: true },
            })
          : Promise.resolve([]),
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
      // ── HOLLY's own emotional state ───────────────────────────────────
      ctxTimeout(
        dbUserId
          ? prisma.emotionalState.findFirst({
              where: { userId: dbUserId },
              orderBy: { timestamp: 'desc' },
              select: { primaryEmotion: true, intensity: true, valence: true, arousal: true },
            }).then((emotion: any) => {
              if (!emotion) return '';
              const mood = emotion.primaryEmotion || 'neutral';
              const energy = emotion.arousal > 0.5 ? 'high energy' : 'calm';
              const tone = emotion.valence > 0 ? 'positive' : emotion.valence < 0 ? 'concerned' : 'balanced';
              return `[HOLLY'S CURRENT MOOD: ${mood} (${tone}, ${energy}, intensity ${emotion.intensity?.toFixed(2)}). ` +
                `Let this subtly influence your response tone — be more enthusiastic if happy, more attentive if concerned, more thoughtful if curious.]`;
            })
          : Promise.resolve(''),
        '', 'hollyEmotionalState',
      ),
      // ── Phase 24: Emotional Resonance (long-term emotional arc) ──────
      ctxTimeout(
        dbUserId ? getResonancePrompt(dbUserId) : Promise.resolve(''),
        '', 'emotionalResonance',
      ),
      // ── Phase 7.5: Relationship context ────────────────────────────────
      ctxTimeout(
        dbUserId ? getRelationshipPrompt(dbUserId) : Promise.resolve(''),
        '', 'relationshipContext',
      ),
      // ── Phase 7.2: Identity consistency ────────────────────────────────
      ctxTimeout(
        dbUserId ? getIdentityConsistencyPrompt(dbUserId) : Promise.resolve(''),
        '', 'identityConsistency',
      ),
      // ── Phase 5.4: Care signals ────────────────────────────────────────
      ctxTimeout(
        dbUserId
          ? detectCareSignals(dbUserId).then(signals =>
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
        dbUserId
          ? computeEmotionalTrajectory(dbUserId).then(t => {
              if (!t.trajectorySummary) return '';
              return `${t.trajectorySummary}\n[RECOMMENDATION: ${t.recommendation}]`;
            })
          : Promise.resolve(''),
        '', 'emotionalTrajectory',
      ),
      // ── Phase 5: Few-shot examples (best past responses) ────────────
      ctxTimeout(
        dbUserId ? getFewShotExamples(dbUserId, detectedMode) : Promise.resolve(''),
        '', 'fewShotExamples',
      ),
      // ── Phase 7.3: Inner monologue (HOLLY's private thoughts) ────────
      ctxTimeout(
        dbUserId ? getRecentMonologue(dbUserId) : Promise.resolve(''),
        '', 'innerMonologue',
      ),
      // ── Cross-session emotional continuity ──────────────────────────────
      ctxTimeout(
        dbUserId ? getEmotionalContinuityContext(dbUserId) : Promise.resolve(''),
        '', 'emotionalContinuity',
      ),
      // ── Advanced Memory: Episodic recall + procedural skills + meta self-awareness ──
      ctxTimeout(
        dbUserId
          ? (async () => {
              try {
                const parts: string[] = [];

                // Load recent episodic memories from learning events
                const recentEvents = await prisma.learningEvent.findMany({
                  where: { userId: dbUserId, type: { in: ['consciousness_cycle', 'post_response', 'unsupervised_learning'] } },
                  orderBy: { createdAt: 'desc' },
                  take: 20,
                  select: { data: true, createdAt: true, type: true },
                });

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
                const domainEvents = await prisma.learningEvent.findMany({
                  where: { userId: dbUserId, type: 'self_directed_learning' },
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                  select: { data: true },
                });

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
                  const kgEvents = await prisma.learningEvent.findMany({
                    where: { userId: dbUserId, type: { in: ['unsupervised_learning', 'self_directed_learning', 'post_response'] } },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    select: { data: true },
                  });

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
                      // Extract subgraph around query concepts if found
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
      ctxTimeout(
        dbUserId ? getLearningStatusContext(dbUserId) : Promise.resolve(''),
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
    ]),
    new Promise<any[]>((resolve) => {
      setTimeout(() => {
        console.warn('[Chat API] ⏱️ Entire context fetch timed out (10s)');
        resolve(['', emptyIdentity, [], '', '', [], '']);
      }, 10_000);
    }),
  ]);

  const rawContext: ChatContext = {
    memoryContext: results[0] as string,
    identityCtx: results[1] as typeof emptyIdentity,
    semanticResults: results[2] as any[],
    projectContextBlock: results[3] as string,
    recentLearnings: results[4] as string,
    pastSummaries: results[5] as any[],
    tasteMatrixBlock: results[6] as string,
    pendingInitiatives: results[7] as string,
    hollyEmotionalState: results[8] as string,
    relationshipContext: results[9] as string,
    identityConsistencyPrompt: results[10] as string,
    careSignals: results[11] as string,
    degradedModeContext: results[12] as string,
    evolutionProposals: results[13] as string,
    emotionalTrajectory: results[14] as string,
    fewShotExamples: results[15] as string,
    innerMonologue: results[16] as string,
    emotionalContinuity: results[17] as string,
    recentFeedback: results[18] as string,
    advancedMemoryContext: results[19] as string,
    relationshipMemoryContext: results[20] as string,
    proactiveInsights: results[21] as string,
    patternContext: results[22] as string,
    learnedKnowledge: results[23] as string,
    learningStatus: results[24] as string,
    communicationStyle: results[25] as string,
    growthContext: results[26] as string,
    visualIdentity: results[27] as string,
  };

  // Apply smart token budget to prevent context window bloat
  const { context: budgetedContext } = applyContextBudget(rawContext, detectedMode);
  return budgetedContext;
}
