/**
 * HOLLY Post-Response Hook — Phase 1D / Phase 2A+2B / Phase 3A
 *
 * Called in the background after every chat response is sent.
 * Orchestrates all background bookkeeping without blocking the user.
 *
 * Phase 1D:  AutoConsciousness records experiences → HollyExperience table
 *            LearningEvent written for the evolution engine
 *
 * Phase 2A:  EmotionEngine detects user emotion and persists EmotionalState
 * Phase 2B:  TasteEngine detects implicit style signals and updates TasteProfile
 *
 * Phase 3A:  Single Groq llama-3.1-8b-instant call via MessageAnalyser replaces
 *            all heuristics: topics, emotion, and taste signals extracted together.
 *            Heuristic fallback preserved for API-key-missing / error cases.
 *
 * Designed to be fire-and-forget — NEVER throws to the caller.
 */

import { AutoConsciousness } from '@/lib/consciousness/auto-consciousness';
import { analyseMessage } from '@/lib/intelligence/message-analyser';
import { TasteEngine } from '@/lib/learning/taste-engine';
import { GoalFormationSystem } from '@/lib/consciousness/goal-formation';
import { triggerImmediateConsciousness } from '@/lib/consciousness/consciousness-orchestrator';
import { prisma } from '@/lib/db';

export interface PostResponsePayload {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantResponse: string;
  detectedMode: string;
  /** Pre-computed topics (from chat route); will be enriched by LLM analysis */
  topics?: string[];
}

/**
 * Fire-and-forget: record this exchange in HOLLY's consciousness.
 * Call with `void recordExchange(payload)` — do NOT await in the request path.
 */
export async function recordExchange(payload: PostResponsePayload): Promise<void> {
  const { userId, conversationId, userMessage, assistantResponse, detectedMode } = payload;

  try {
    // ── Phase 3A: single LLM analysis call ─────────────────────────────────
    // Replaces extractTopics() + EmotionalIntelligence.detectEmotion() + TasteEngine.detectImplicit()
    const analysis = await analyseMessage(userMessage, assistantResponse);

    const topics = analysis.topics.length > 0 ? analysis.topics : (payload.topics ?? []);

    // Run all bookkeeping in parallel — each step is individually try/caught
    await Promise.allSettled([
      // ── 1. Consciousness: experience recording ──────────────────────────
      runConsciousness(userId, conversationId, userMessage, assistantResponse, topics),

      // ── 2. LearningEvent for evolution engine ───────────────────────────
      runLearningEvent(userId, conversationId, detectedMode, userMessage, assistantResponse, topics),

      // ── 3. Phase 3A/2A: persist LLM-detected emotion ────────────────────
      runEmotionPersist(userId, conversationId, analysis.emotion),

      // ── 4. Phase 3A/2B: persist LLM-detected taste signals ──────────────
      runTasteSignals(userId, analysis.tasteSignals),

      // ── 5. Phase 3F: trigger goal formation every 10 events ─────────────
      runGoalFormationMaybe(userId),

      // ── 6. Immediate consciousness for high-significance exchanges ──────
      runImmediateConsciousness(userId, userMessage, analysis.emotion),

      // ── 7. Phase 3: Implicit feedback detection ──────────────────────────
      runImplicitFeedback(userId, conversationId, userMessage, assistantResponse),
    ]);

    console.log(
      `[PostHook] ✅ user=${userId} | emotion=${analysis.emotion.primary} | topics=${topics.slice(0, 3).join(',')} | llm=${analysis.fromLLM}`
    );
  } catch (err) {
    console.error('[PostHook] ⚠️ Outer error:', err);
  }
}

// ─── individual steps ─────────────────────────────────────────────────────────

async function runConsciousness(
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantResponse: string,
  topics: string[]
): Promise<void> {
  try {
    const consciousness = new AutoConsciousness(userId);
    await consciousness.recordFromChat(userMessage, 'user', { conversation_id: conversationId, topics });
    await consciousness.recordFromChat(assistantResponse, 'assistant', { conversation_id: conversationId, topics });
  } catch (err) {
    console.error('[PostHook:Consciousness] ⚠️', err);
  }
}

async function runLearningEvent(
  userId: string,
  conversationId: string,
  detectedMode: string,
  userMessage: string,
  assistantResponse: string,
  topics: string[]
): Promise<void> {
  try {
    await prisma.learningEvent.create({
      data: {
        type: 'conversation',
        userId,
        conversationId,
        data: {
          mode: detectedMode,
          userLength: userMessage.length,
          responseLength: assistantResponse.length,
          topics,
          timestamp: new Date().toISOString(),
        },
        processed: false,
      },
    });
  } catch (err) {
    console.error('[PostHook:LearningEvent] ⚠️', err);
  }
}

async function runEmotionPersist(
  userId: string,
  conversationId: string,
  emotion: { primary: string; valence: number; arousal: number; intensity: number }
): Promise<void> {
  try {
    await prisma.emotionalState.create({
      data: {
        userId,
        primaryEmotion: emotion.primary,
        intensity: emotion.intensity,
        valence: emotion.valence,
        arousal: emotion.arousal,
        secondaryEmotions: [],
        context: { source: 'message_analyser' },
        triggers: [],
        cues: [],
        conversationId,
      },
    });

    // Persist cross-session emotional continuity
    const { persistEmotionalBaseline } = await import('./emotional-continuity');
    await persistEmotionalBaseline(userId, {
      primaryMood: emotion.primary,
      valence: emotion.valence,
      arousal: emotion.arousal,
      intensity: emotion.intensity,
    });
  } catch (err) {
    console.error('[PostHook:Emotion] ⚠️', err);
  }
}

async function runTasteSignals(
  userId: string,
  signals: Array<{ category: string; item: string; signal: string }>
): Promise<void> {
  if (!signals.length) return;
  try {
    const engine = new TasteEngine(userId);
    await engine.recordSignals(
      signals.map(s => ({
        category: s.category as any,
        item: s.item,
        signal: s.signal as any,
        source: 'implicit' as const,
        weight: 0.8, // LLM-detected signals are more reliable → slightly higher weight
      }))
    );
  } catch (err) {
    console.error('[PostHook:Taste] ⚠️', err);
  }
}

async function runGoalFormationMaybe(userId: string): Promise<void> {
  try {
    // Count total learning events for this user
    const count = await prisma.learningEvent.count({ where: { userId } });
    // Generate goals on every 10th event (10, 20, 30, ...)
    if (count > 0 && count % 10 === 0) {
      const goalSystem = new GoalFormationSystem(userId);
      const goals = await goalSystem.generateGoals();
      console.log(`[PostHook:Goals] Generated ${goals.length} goals for user ${userId} (event #${count})`);
    }
  } catch (err) {
    console.error('[PostHook:Goals] ⚠️', err);
  }
}

// ─── immediate consciousness trigger ─────────────────────────────────────────

/**
 * For high-significance exchanges (emotional intensity > 0.7), trigger
 * an immediate consciousness cycle so HOLLY processes the experience
 * right away instead of waiting for the hourly cron.
 */
async function runImmediateConsciousness(
  userId: string,
  userMessage: string,
  emotion: { primary: string; valence: number; arousal: number; intensity: number }
): Promise<void> {
  try {
    // Only trigger for high-intensity emotional exchanges
    if (emotion.intensity >= 0.7 || emotion.arousal >= 0.7) {
      console.log(`[PostHook:ImmediateConsciousness] High-significance exchange detected (emotion=${emotion.primary}, intensity=${emotion.intensity.toFixed(2)})`);
      await triggerImmediateConsciousness(userId, {
        content: userMessage.substring(0, 200),
        significance: Math.max(emotion.intensity, emotion.arousal),
      });
    }
  } catch (err) {
    console.error('[PostHook:ImmediateConsciousness] ⚠️', err);
  }
}

// ─── Phase 3: Implicit feedback detection ───────────────────────────────────

const POSITIVE_SIGNALS = /\b(thanks|thank you|perfect|great|awesome|exactly|spot on|nailed it|love it|amazing|brilliant|helpful|appreciate|excellent|good job|well done|that works|fixed it|you rock|best| exactly what|right on|correct|yes exactly|that's it|bingo)\b/i;
const NEGATIVE_SIGNALS = /\b(wrong|nope|try again|not right|not what i|didn't work|doesn't work|bad|terrible|useless|not helpful|missed the|off base|incorrect|that's wrong|no that's|not even close|try something else|still broken|still not working|still wrong)\b/i;
const REPHRASE_SIGNALS = /\b(what i meant|i meant to say|let me rephrase|let me clarify|i actually wanted|to be more specific|in other words|let me explain better)\b/i;

async function runImplicitFeedback(
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantResponse: string,
): Promise<void> {
  try {
    let sentiment: 'positive' | 'negative' | null = null;
    let sentimentScore = 0;
    let feedbackType = 'implicit';
    let lesson = '';

    if (POSITIVE_SIGNALS.test(userMessage)) {
      sentiment = 'positive';
      sentimentScore = 0.6;
      lesson = 'User expressed satisfaction — this response style is working';
    } else if (NEGATIVE_SIGNALS.test(userMessage)) {
      sentiment = 'negative';
      sentimentScore = -0.6;
      lesson = 'User expressed dissatisfaction — adjust approach next time';
    } else if (REPHRASE_SIGNALS.test(userMessage)) {
      sentiment = 'negative';
      sentimentScore = -0.4;
      feedbackType = 'correction';
      lesson = 'User rephrased their question — previous response likely missed the intent';
    }

    if (!sentiment) return; // No implicit signal detected

    await prisma.responseFeedback.create({
      data: {
        userId,
        conversationId,
        feedbackType,
        sentiment,
        sentimentScore,
        hollyResponse: assistantResponse.slice(0, 2000),
        context: {
          userMessage: userMessage.slice(0, 500),
          source: 'implicit_detection',
          trigger: sentiment === 'positive' ? 'positive_words' : feedbackType === 'correction' ? 'rephrase' : 'negative_words',
        },
        lessonLearned: lesson,
        applied: false,
      },
    });

    console.log(`[PostHook:ImplicitFeedback] ${sentiment === 'positive' ? '👍' : '👎'} implicit ${feedbackType} detected`);
  } catch (err) {
    console.error('[PostHook:ImplicitFeedback] ⚠️', err);
  }
}

// ─── exported helper ─────────────────────────────────────────────────────────

/**
 * extractTopics — kept for backward compatibility with chat route.
 * Phase 3A: now delegates to the heuristic inside message-analyser,
 * but the real extraction happens async in recordExchange().
 */
export function extractTopics(text: string): string[] {
  const stopWords = new Set([
    'the','a','an','is','it','in','on','at','to','for','of','and','or','but',
    'not','with','this','that','i','you','we','my','your','can','do','how',
    'what','when','where','why','please','help','just','like','make','need',
    'want','would','could','should',
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !stopWords.has(w))
    .slice(0, 8);
}
