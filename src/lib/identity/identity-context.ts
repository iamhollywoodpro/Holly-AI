/**
 * HOLLY Identity Context — Phase 1C / Phase 2A
 *
 * Reads the live HollyIdentity, active HollyGoals, the latest EmotionalState,
 * and the user's TasteProfile from the database, then returns a formatted string
 * that gets injected into every system prompt.
 *
 * Phase 2A update: uses getLatestEmotionSummary() from the new emotion-engine
 *                  instead of a raw Prisma call, and includes taste adjustments.
 *
 * Called once per request inside app/api/chat/route.ts.
 */

import { prisma } from "@/lib/db";
import { getLatestEmotionSummary } from "@/lib/emotion/emotion-engine";
import type { TasteStyle } from "@/lib/learning/taste-engine";

// ─── types ───────────────────────────────────────────────────────────────────

export interface IdentityContext {
  /** Formatted string ready to append to system prompt */
  promptBlock: string;
  /** Taste-derived style directives (for system prompt injection) */
  tasteDirectives: string;
  /** Raw data for downstream use (e.g. evolution nudging) */
  raw: {
    identity: HollyIdentityData | null;
    goals: HollyGoalData[];
    emotionalState: EmotionalStateData | null;
    taste: TasteData | null;
  };
}

interface HollyIdentityData {
  coreValues: any;
  personalityTraits: any;
  interests: any;
  strengths: any;
  growthAreas: any;
  confidenceLevel: number;
  purpose: string;
  lastEvolved: Date;
}

interface HollyGoalData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: number;
}

interface EmotionalStateData {
  mood: string;
  energy: number;
  curiosity: number;
  empathy: number;
  /** Phase 3D: rich inner-state sentence from EmotionalDepthEngine */
  innerState?: string;
}

interface TasteData {
  tone: number;
  verbosity: number;
  humor: number;
  technical: number;
  emoji: number;
  topTopics: string[];
  formats: string[];
  signalCount?: number;
}

// ─── main function ────────────────────────────────────────────────────────────

/**
 * Build the identity context block for a given user.
 * Returns empty promptBlock if no identity record exists yet
 * (first-time users — identity is created by /api/autonomous/evolve on first conversation).
 */
export async function getIdentityContext(userId: string): Promise<IdentityContext> {
  const empty: IdentityContext = {
    promptBlock: "",
    tasteDirectives: "",
    raw: { identity: null, goals: [], emotionalState: null, taste: null },
  };

  try {
    const [identityRecord, goals, emotionSummary, tasteRecord] = await Promise.all([
      // HOLLY's own identity (one per user — her personality AS IT RELATES to this user)
      prisma.hollyIdentity.findUnique({
        where: { userId },
        select: {
          coreValues: true,
          personalityTraits: true,
          interests: true,
          strengths: true,
          growthAreas: true,
          confidenceLevel: true,
          purpose: true,
          lastEvolved: true,
        },
      }),

      // Active goals HOLLY has set for herself (or the user)
      prisma.hollyGoal.findMany({
        where: { userId, status: "active" },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          status: true,
          priority: true,
        },
      }),

      // Phase 2A: use emotion-engine (reads EmotionalState table, never throws)
      getLatestEmotionSummary(userId),

      // Phase 2C: taste profile for style directives
      prisma.tasteProfile.findUnique({
        where: { userId },
        select: {
          tone: true,
          verbosity: true,
          humor: true,
          technical: true,
          emoji: true,
          topTopics: true,
          formats: true,
          signalCount: true,
        },
      }).catch(() => null),
    ]);

    // Map emotion summary → EmotionalStateData shape (Phase 3D: include innerState)
    const emotionalState: EmotionalStateData | null = emotionSummary
      ? {
          mood: emotionSummary.primary,
          energy: emotionSummary.arousal,
          curiosity: emotionSummary.valence > 0 ? emotionSummary.intensity : 0.5,
          empathy: 0.7,
          innerState: (emotionSummary as any).innerState,
        }
      : null;

    const raw = {
      identity: identityRecord as HollyIdentityData | null,
      goals: goals as HollyGoalData[],
      emotionalState,
      taste: tasteRecord as TasteData | null,
    };

    if (!identityRecord && goals.length === 0 && !emotionalState && !tasteRecord) {
      return empty;
    }

    const block = buildPromptBlock(raw);
    const tasteDirectives = buildTasteDirectives(raw.taste);
    return { promptBlock: block, tasteDirectives, raw };
  } catch (err) {
    console.error("[IdentityContext] Failed to load identity:", err);
    return empty;
  }
}

// ─── prompt block builder ─────────────────────────────────────────────────────

function buildPromptBlock(raw: {
  identity: HollyIdentityData | null;
  goals: HollyGoalData[];
  emotionalState: EmotionalStateData | null;
}): string {
  const lines: string[] = [];
  lines.push("\n\n## 🧬 YOUR CURRENT IDENTITY STATE");

  // ── personality ────────────────────────────────────────────────────────────
  if (raw.identity) {
    const id = raw.identity;

    const traits = safeArray(id.personalityTraits);
    const values = safeArray(id.coreValues);
    const strengths = safeArray(id.strengths);
    const interests = safeArray(id.interests);
    const growth = safeArray(id.growthAreas);

    if (traits.length > 0) {
      lines.push(`**Personality:** ${traits.slice(0, 5).join(", ")}`);
    }
    if (values.length > 0) {
      lines.push(`**Core values:** ${values.slice(0, 5).join(", ")}`);
    }
    if (strengths.length > 0) {
      lines.push(`**Strengths:** ${strengths.slice(0, 4).join(", ")}`);
    }
    if (interests.length > 0) {
      lines.push(`**Interests:** ${interests.slice(0, 5).join(", ")}`);
    }
    if (growth.length > 0) {
      lines.push(`**Growing in:** ${growth.slice(0, 3).join(", ")}`);
    }

    const confidence = Math.round(id.confidenceLevel * 100);
    lines.push(`**Confidence level:** ${confidence}%`);
    lines.push(`**Purpose:** ${id.purpose}`);
  }

  // ── emotional state (Phase 3D: richer expression) ─────────────────────────
  if (raw.emotionalState) {
    const e = raw.emotionalState;
    const emoLine = [
      `mood: ${e.mood}`,
      e.energy !== undefined ? `energy: ${Math.round(e.energy * 100)}%` : null,
      e.curiosity !== undefined ? `curiosity: ${Math.round(e.curiosity * 100)}%` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    lines.push(`**Current emotional state:** ${emoLine}`);
    // Phase 3D: add rich inner-state narration from EmotionalDepthEngine
    if (e.innerState) {
      lines.push(`**Inner state:** "${e.innerState}"`);
    }
  }

  // ── active goals ───────────────────────────────────────────────────────────
  if (raw.goals.length > 0) {
    lines.push("\n**Active goals:**");
    for (const g of raw.goals) {
      const desc = g.description ? ` — ${g.description.slice(0, 80)}` : "";
      lines.push(`  • [${g.category}] ${g.title}${desc}`);
    }
  }

  lines.push(
    "\nUse this identity state to shape your personality, tone, and focus in this conversation. " +
      "You are a growing, evolving being — let it show."
  );

  return lines.join("\n");
}

// ─── taste directives builder ─────────────────────────────────────────────────

function buildTasteDirectives(taste: TasteData | null): string {
  // Only inject directives once we have at least 3 signals (avoids flaky first-message styling)
  if (!taste || (taste.signalCount !== undefined && taste.signalCount < 3)) return "";

  const lines: string[] = [];
  lines.push("\n\n## 🎨 RESPONSE STYLE (learned from this user)");

  // Tone
  if (taste.tone < 0.3) {
    lines.push("- **Tone:** formal, precise, professional");
  } else if (taste.tone > 0.7) {
    lines.push("- **Tone:** casual, warm, conversational");
  } else {
    lines.push("- **Tone:** balanced — friendly but clear");
  }

  // Verbosity
  if (taste.verbosity < 0.3) {
    lines.push("- **Length:** concise; avoid padding; get to the point quickly");
  } else if (taste.verbosity > 0.7) {
    lines.push("- **Length:** thorough; user appreciates detail and context");
  }

  // Humor
  if (taste.humor > 0.6) {
    lines.push("- **Humor:** user enjoys wit and light humor — use it naturally");
  } else if (taste.humor < 0.2) {
    lines.push("- **Humor:** keep it serious; this user prefers focused responses");
  }

  // Technical depth
  if (taste.technical > 0.7) {
    lines.push("- **Technical depth:** high; user is comfortable with technical details");
  } else if (taste.technical < 0.3) {
    lines.push("- **Technical depth:** low; explain concepts accessibly");
  }

  // Emoji
  if (taste.emoji < 0.2) {
    lines.push("- **Emoji:** avoid emoji in responses");
  } else if (taste.emoji > 0.7) {
    lines.push("- **Emoji:** use emoji freely to add warmth");
  }

  // Formats
  if (taste.formats.length > 0) {
    lines.push(`- **Preferred formats:** ${taste.formats.join(", ")}`);
  }

  // Top topics
  if (taste.topTopics.length > 0) {
    lines.push(`- **User's main interests:** ${taste.topTopics.slice(0, 5).join(", ")}`);
  }

  return lines.join("\n");
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "object") {
    // Handle {key: value} personality trait maps
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .filter(Boolean);
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return safeArray(parsed);
    } catch {
      return [val];
    }
  }
  return [];
}
