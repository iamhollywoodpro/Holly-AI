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
    ]),
    new Promise<any[]>((resolve) => {
      setTimeout(() => {
        console.warn('[Chat API] ⏱️ Entire context fetch timed out (10s)');
        resolve(['', emptyIdentity, [], '', '', [], '']);
      }, 10_000);
    }),
  ]);

  return {
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
  };
}
