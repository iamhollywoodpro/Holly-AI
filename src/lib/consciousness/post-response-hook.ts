/**
 * HOLLY Post-Response Hook — Phase 1D
 *
 * Called in the background after every chat response is sent.
 * Wires the AutoConsciousness system to the live chat pipeline so that
 * every conversation populates HollyExperience and (eventually) nudges
 * HollyGoal formation.
 *
 * Also fires the LearningEngine to record a LearningEvent so the
 * evolution loop has data to work with.
 *
 * Designed to be fire-and-forget — never throws to the caller.
 */

import { AutoConsciousness } from "@/lib/consciousness/auto-consciousness";
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

  try {
    const consciousness = new AutoConsciousness(userId);

    // 1. Record the user message as an interaction experience
    await consciousness.recordFromChat(userMessage, "user", {
      conversation_id: conversationId,
      topics: topics ?? [],
    });

    // 2. Record HOLLY's response as her expression
    await consciousness.recordFromChat(assistantResponse, "assistant", {
      conversation_id: conversationId,
      topics: topics ?? [],
    });

    // 3. Write a LearningEvent so the evolution engine has training data
    await prisma.learningEvent.create({
      data: {
        type: "conversation",
        userId,
        conversationId,
        data: {
          mode: detectedMode,
          userLength: userMessage.length,
          responseLength: assistantResponse.length,
          topics: topics ?? [],
          timestamp: new Date().toISOString(),
        },
        processed: false,
      },
    });

    console.log(`[Consciousness] ✅ Exchange recorded for user ${userId}`);
  } catch (err) {
    // Never surface errors to the user — this is background bookkeeping
    console.error("[Consciousness] ⚠️ Failed to record exchange:", err);
  }
}

/**
 * Extract rough topic keywords from a message.
 * Simple heuristic — Phase 3 will use the LLM for this.
 */
export function extractTopics(text: string): string[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "it", "in", "on", "at", "to", "for", "of", "and",
    "or", "but", "not", "with", "this", "that", "i", "you", "we", "my", "your",
    "can", "do", "how", "what", "when", "where", "why", "please", "help",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stopWords.has(w))
    .slice(0, 8);
}
