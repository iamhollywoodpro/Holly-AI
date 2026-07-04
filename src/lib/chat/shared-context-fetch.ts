/**
 * Shared Context Fetches — 27-Module Consolidation (2026-07-03)
 *
 * The context-loader.ts was firing ~28 DB queries per chat message — many
 * duplicate — which saturated Neon's connection pool and caused every module
 * to time out at 1000ms. This file consolidates the duplicates into 4 shared
 * fetches that run ONCE per chat request and feed results to modules by
 * reference.
 *
 * Dedup map (verified from production container logs + code audit):
 *   - HollyIdentity: was fetched 4× per message
 *       (getIdentityContext, getIdentityConsistencyPrompt, getFewShotExamples,
 *        getEmotionalContinuityContext)
 *   - EmotionalState: was fetched 4× per message
 *       (inline hollyEmotionalState, computeEmotionalTrajectory, detectCareSignals,
 *        emotionalResonance recompute path)
 *   - ConversationSummary: was fetched 2× per message
 *       (inline in loader, getRelevantMemories)
 *   - LearningEvent: was fetched 3× with overlapping type filters per message
 *       (inline in advancedMemory block)
 *
 * Total: 13 queries collapsed to 4. Combined with mode-gating of triggered
 * modules (separate change in context-loader.ts), per-message query count
 * drops from ~28 → ~10.
 *
 * Also wraps prewarmUserSession() from user-context-cache.ts — that cache
 * layer (LRU + Redis L2) was built but never imported by the chat flow.
 */

import { prisma } from '@/lib/db';
import { prewarmUserSession } from '@/lib/multi-tenant/user-context-cache';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SharedHollyIdentity {
  coreValues: any;
  personalityTraits: any;
  interests: any;
  strengths: any;
  growthAreas: any;
  confidenceLevel: number;
  purpose: string;
  lastEvolved: Date;
  emotionalBaseline?: any;
}

export interface SharedEmotionalStateRow {
  primaryEmotion: string;
  intensity: number;
  valence: number;
  arousal: number;
  timestamp: Date;
}

export interface SharedConversationSummaryRow {
  summary: string;
  keyPoints?: string[];
  keyTopics: string[];
  topics: string[];
  outcome: string | null;
  actionItems: any;
  messageCount?: number;
  updatedAt: Date;
}

export interface SharedLearningEventRow {
  type: string;
  data: any;
  createdAt: Date;
}

export interface SharedChatContext {
  /** HollyIdentity row — null if user has none yet */
  hollyIdentity: SharedHollyIdentity | null;
  /** EmotionalState rows (take:50, newest first) — empty array if none */
  emotionalStates: SharedEmotionalStateRow[];
  /** ConversationSummary rows (take:15, excluding current conv) — empty if none */
  conversationSummaries: SharedConversationSummaryRow[];
  /** LearningEvent rows (take:30, union of types modules need) — empty if none */
  learningEvents: SharedLearningEventRow[];
  /**
   * Summary of the CURRENT conversation (most recent row for this conversationId).
   * Null if no conversationId, no summary yet, or fetch failed.
   *
   * Background: extractMemories() writes a ConversationSummary row for the
   * current conversation on every turn, but fetchSharedConversationSummaries
   * explicitly EXCLUDES the current conversationId (so it doesn't pollute
   * cross-session recall). Without this dedicated fetch, Holly never sees
   * the summary of the conversation she's currently in — so once
   * MAX_CONTEXT_CHARS truncates the message history, she forgets everything
   * before the cut. This field fixes that.
   */
  currentConversationSummary: SharedConversationSummaryRow | null;
  /** True if user-context-cache was warm or got populated this call */
  cachePopulated: boolean;
}

// ─── Individual Fetchers ────────────────────────────────────────────────────

/**
 * Pre-warm the user context cache (LRU + Redis L2).
 *
 * This populates User, RelationshipProfile, UserLearningProfile,
 * UserPreferences, TasteProfile, RelationshipContext, and top-20
 * RelationshipMemory into the cache. Subsequent reads of these tables
 * become sub-millisecond.
 *
 * Non-blocking — never throws. Returns true if cache was warm or got
 * populated within the latency target.
 */
export async function prewarmChatCache(dbUserId: string): Promise<boolean> {
  try {
    const result = await prewarmUserSession(dbUserId);
    return result.withinTarget;
  } catch (err) {
    console.warn('[SharedContext] prewarm failed (non-blocking):', (err as Error).message);
    return false;
  }
}

/**
 * Fetch HollyIdentity ONCE for the whole chat request.
 *
 * Replaces per-module fetches in:
 *   - getIdentityContext (full select + 6 other queries)
 *   - getIdentityConsistencyPrompt (selects establishedTraits)
 *   - getFewShotExamples (selects personalityTraits.fewShotExamples)
 *   - getEmotionalContinuityContext (selects emotionalBaseline)
 *
 * Note: getIdentityContext still needs to fire its other 6 queries (goals,
 * emotion summary, taste, patterns, settings) — those are NOT shared with
 * the others. This shared fetch only covers the HollyIdentity row itself.
 */
export async function fetchSharedHollyIdentity(
  dbUserId: string,
): Promise<SharedHollyIdentity | null> {
  try {
    return await prisma.hollyIdentity.findUnique({
      where: { userId: dbUserId },
      select: {
        coreValues: true,
        personalityTraits: true,
        interests: true,
        strengths: true,
        growthAreas: true,
        confidenceLevel: true,
        purpose: true,
        lastEvolved: true,
        emotionalBaseline: true,
      },
    });
  } catch (err) {
    console.warn('[SharedContext] HollyIdentity fetch failed:', (err as Error).message);
    return null;
  }
}

/**
 * Fetch EmotionalState history ONCE (take:50, newest first).
 *
 * Replaces per-module fetches in:
 *   - inline hollyEmotionalState (was take:1 — uses first row of this fetch)
 *   - computeEmotionalTrajectory (was take:50 — uses all rows)
 *   - detectCareSignals (was take:5 — uses first 5 rows)
 *
 * 7-day filter is intentionally NOT applied here — callers that need it
 * can filter in-memory. This keeps the shared fetch maximally reusable.
 */
export async function fetchSharedEmotionalStates(
  dbUserId: string,
): Promise<SharedEmotionalStateRow[]> {
  try {
    return await prisma.emotionalState.findMany({
      where: { userId: dbUserId },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        primaryEmotion: true,
        intensity: true,
        valence: true,
        arousal: true,
        timestamp: true,
      },
    });
  } catch (err) {
    console.warn('[SharedContext] EmotionalState fetch failed:', (err as Error).message);
    return [];
  }
}

/**
 * Fetch ConversationSummaries ONCE (take:15, excluding current conversation).
 *
 * Replaces per-module fetches in:
 *   - inline conversationSummaries in loader (was take:5 — uses first 5)
 *   - getRelevantMemories in memory-service.ts (was take:15 with topic
 *     scoring — uses all 15)
 *
 * The exclusion of current conversationId is important: the chat route
 * already loads current conversation messages separately, so showing
 * summaries of OTHER conversations gives Holly cross-session recall
 * without polluting the context with the active conversation's summary.
 */
export async function fetchSharedConversationSummaries(
  dbUserId: string,
  conversationId?: string,
): Promise<SharedConversationSummaryRow[]> {
  try {
    return await prisma.conversationSummary.findMany({
      where: {
        userId: dbUserId,
        ...(conversationId ? { conversationId: { not: conversationId } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
      select: {
        summary: true,
        keyTopics: true,
        topics: true,
        outcome: true,
        actionItems: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    console.warn('[SharedContext] ConversationSummary fetch failed:', (err as Error).message);
    return [];
  }
}

/**
 * Fetch the most recent ConversationSummary for the CURRENT conversation.
 *
 * extractMemories() writes this row on every turn (background-tasks.ts),
 * but fetchSharedConversationSummaries excludes the current conversationId.
 * Without this fetch, once MAX_CONTEXT_CHARS truncates the message history,
 * Holly loses all recall of the early portion of the current conversation.
 *
 * Cost: 1 DB round-trip (only fires when conversationId is provided).
 * Null-safe — returns null on any error or missing row.
 */
export async function fetchCurrentConversationSummary(
  dbUserId: string,
  conversationId: string,
): Promise<SharedConversationSummaryRow | null> {
  try {
    const rows = await prisma.conversationSummary.findMany({
      where: { userId: dbUserId, conversationId },
      orderBy: { updatedAt: 'desc' },
      take: 1,
      select: {
        summary: true,
        keyPoints: true,
        keyTopics: true,
        topics: true,
        outcome: true,
        actionItems: true,
        messageCount: true,
        updatedAt: true,
      },
    });
    return rows[0] ?? null;
  } catch (err) {
    console.warn('[SharedContext] currentConversationSummary fetch failed:', (err as Error).message);
    return null;
  }
}

/**
 * Fetch LearningEvents ONCE with the union of types needed across modules.
 *
 * Replaces the 3-query parallel block inside the advancedMemory inline
 * lambda in context-loader.ts (was: consciousness_cycle/post_response/
 * unsupervised_learning take:20, self_directed_learning take:10, and the
 * overlapping unsupervised_learning/self_directed_learning/post_response
 * take:20 for the knowledge graph).
 *
 * Callers partition in-memory by `type`. 30 rows covers the prior 20+10+20
 * overlap with room to spare, since most events fit multiple categories
 * and the union is smaller than the sum.
 */
export async function fetchSharedLearningEvents(
  dbUserId: string,
): Promise<SharedLearningEventRow[]> {
  try {
    return await prisma.learningEvent.findMany({
      where: {
        userId: dbUserId,
        type: {
          in: [
            'consciousness_cycle',
            'post_response',
            'unsupervised_learning',
            'self_directed_learning',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        type: true,
        data: true,
        createdAt: true,
      },
    });
  } catch (err) {
    console.warn('[SharedContext] LearningEvent fetch failed:', (err as Error).message);
    return [];
  }
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

const EMPTY_SHARED: SharedChatContext = {
  hollyIdentity: null,
  emotionalStates: [],
  conversationSummaries: [],
  learningEvents: [],
  currentConversationSummary: null,
  cachePopulated: false,
};

/**
 * Fetch all shared datasets + prime the user-context-cache in parallel.
 *
 * This is the main entry point. Called once at the top of loadChatContext().
 * All fetchers swallow their own errors and return safe defaults, so this
 * never throws.
 *
 * Total DB round-trips: 6 (cache prewarm + 5 queries).
 * The currentConversationSummary fetch only fires when conversationId is
 * provided (skipped for non-chat callers).
 */
export async function fetchSharedChatContext(
  dbUserId: string | null,
  conversationId: string | undefined,
): Promise<SharedChatContext> {
  if (!dbUserId) return EMPTY_SHARED;

  const [cachePopulated, hollyIdentity, emotionalStates, conversationSummaries, learningEvents, currentConversationSummary] =
    await Promise.all([
      prewarmChatCache(dbUserId),
      fetchSharedHollyIdentity(dbUserId),
      fetchSharedEmotionalStates(dbUserId),
      fetchSharedConversationSummaries(dbUserId, conversationId),
      fetchSharedLearningEvents(dbUserId),
      conversationId ? fetchCurrentConversationSummary(dbUserId, conversationId) : Promise.resolve(null),
    ]);

  return {
    hollyIdentity,
    emotionalStates,
    conversationSummaries,
    learningEvents,
    currentConversationSummary,
    cachePopulated,
  };
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────

/**
 * Format the latest EmotionalState row as a prompt-injectable mood line.
 *
 * Extracted from the inline lambda at context-loader.ts:181-188 so the
 * shared-fetch flow can call it without re-querying.
 */
export function formatHollyEmotionalState(emotion: SharedEmotionalStateRow | undefined): string {
  if (!emotion) return '';
  const mood = emotion.primaryEmotion || 'neutral';
  const energy = emotion.arousal > 0.5 ? 'high energy' : 'calm';
  const tone = emotion.valence > 0 ? 'positive' : emotion.valence < 0 ? 'concerned' : 'balanced';
  return (
    `[HOLLY'S CURRENT MOOD: ${mood} (${tone}, ${energy}, intensity ${emotion.intensity?.toFixed(2)}). ` +
    `Let this subtly influence your response tone — be more enthusiastic if happy, more attentive if concerned, more thoughtful if curious.]`
  );
}
