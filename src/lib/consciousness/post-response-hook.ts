/**
 * HOLLY Post-Response Hook — Phase 1D / Phase 2A+2B
 *
 * Called in the background after every chat response is sent.
 * Orchestrates all background bookkeeping without blocking the user.
 *
 * Phase 1D:  AutoConsciousness records experiences → HollyExperience table
 *            LearningEvent written for the evolution engine
 *
 * Phase 2A:  EmotionEngine detects user emotion and persists EmotionalState
 *
 * Phase 2B:  TasteEngine detects implicit style signals and updates TasteProfile
 *
 * Designed to be fire-and-forget — NEVER throws to the caller.
 */

import { AutoConsciousness } from "@/lib/consciousness/auto-consciousness";
import { detectAndSaveEmotion } from "@/lib/emotion/emotion-engine";
import { TasteEngine } from "@/lib/learning/taste-engine";
import { prisma } from "@/lib/db";

export interface PostResponsePayload {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantResponse: string;
  detectedMode: string;
  topics?: string[];
}

/**
 * Fire-and-forget: record this exchange in HOLLY's consciousness.
 * Call with `void recordExchange(payload)` — do NOT await in the request path.
 */
export async function recordExchange(payload: PostResponsePayload): Promise<void> {
  const { userId, conversationId, userMessage, assistantResponse, detectedMode, topics } = payload;

  // Run all bookkeeping in parallel — each step is individually try/caught
  await Promise.allSettled([
    // ── 1. Consciousness: experience recording ────────────────────────────
    runConsciousness(userId, conversationId, userMessage, assistantResponse, topics ?? []),

    // ── 2. LearningEvent for evolution engine ─────────────────────────────
    runLearningEvent(userId, conversationId, detectedMode, userMessage, assistantResponse, topics ?? []),

    // ── 3. Phase 2A: emotion detection + persistence ──────────────────────
    detectAndSaveEmotion(userId, userMessage, conversationId),

    // ── 4. Phase 2B: taste signal detection + profile update ──────────────
    runTasteSignals(userId, userMessage, assistantResponse),
  ]);

  console.log(`[PostHook] ✅ Exchange recorded for user ${userId}`);
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

    await consciousness.recordFromChat(userMessage, "user", {
      conversation_id: conversationId,
      topics,
    });

    await consciousness.recordFromChat(assistantResponse, "assistant", {
      conversation_id: conversationId,
      topics,
    });
  } catch (err) {
    console.error("[PostHook:Consciousness] ⚠️", err);
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
        type: "conversation",
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
    console.error("[PostHook:LearningEvent] ⚠️", err);
  }
}

async function runTasteSignals(
  userId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    const signals = TasteEngine.detectImplicit(userMessage, assistantResponse);
    if (signals.length > 0) {
      const engine = new TasteEngine(userId);
      await engine.recordSignals(signals);
    }
  } catch (err) {
    console.error("[PostHook:Taste] ⚠️", err);
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract rough topic keywords from a message.
 * Simple heuristic — Phase 3 will use the LLM for richer extraction.
 */
export function extractTopics(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "it", "in", "on", "at", "to", "for", "of", "and",
    "or", "but", "not", "with", "this", "that", "i", "you", "we", "my", "your",
    "can", "do", "how", "what", "when", "where", "why", "please", "help",
    "just", "like", "make", "need", "want", "would", "could", "should",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopWords.has(w))
    .slice(0, 8);
}
