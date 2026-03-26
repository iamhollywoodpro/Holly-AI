/**
 * HOLLY Identity Context — Phase 1C
 *
 * Reads the live HollyIdentity, active HollyGoals, and the latest EmotionalState
 * from the database and returns a formatted string that gets injected into every
 * system prompt.  This is the wire that makes HOLLY's personality persistent
 * across conversations rather than resetting to defaults each time.
 *
 * Called once per request inside app/api/chat/route.ts.
 */

import { prisma } from "@/lib/db";

// ─── types ───────────────────────────────────────────────────────────────────

export interface IdentityContext {
  /** Formatted string ready to append to system prompt */
  promptBlock: string;
  /** Raw data for downstream use (e.g. evolution nudging) */
  raw: {
    identity: HollyIdentityData | null;
    goals: HollyGoalData[];
    emotionalState: EmotionalStateData | null;
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
}

// ─── main function ────────────────────────────────────────────────────────────

/**
 * Build the identity context block for a given user.
 * Returns empty promptBlock if no identity record exists yet
 * (first-time users — identity is created by /api/autonomous/evolve on first conversation).
 */
export async function getIdentityContext(userId: string): Promise<IdentityContext> {
  try {
    const [identityRecord, goals, latestEmotion] = await Promise.all([
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

      // Most recent emotional state record
      (prisma as any).emotionalState?.findFirst?.({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          mood: true,
          energy: true,
          curiosity: true,
          empathy: true,
        },
      }).catch(() => null) ?? Promise.resolve(null),
    ]);

    const raw = {
      identity: identityRecord as HollyIdentityData | null,
      goals: goals as HollyGoalData[],
      emotionalState: latestEmotion as EmotionalStateData | null,
    };

    if (!identityRecord && goals.length === 0) {
      return { promptBlock: "", raw };
    }

    const block = buildPromptBlock(raw);
    return { promptBlock: block, raw };
  } catch (err) {
    console.error("[IdentityContext] Failed to load identity:", err);
    return { promptBlock: "", raw: { identity: null, goals: [], emotionalState: null } };
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

  // ── emotional state ────────────────────────────────────────────────────────
  if (raw.emotionalState) {
    const e = raw.emotionalState;
    const emoLine = [
      `mood: ${e.mood}`,
      e.energy !== undefined ? `energy: ${Math.round(e.energy * 100)}%` : null,
      e.curiosity !== undefined ? `curiosity: ${Math.round(e.curiosity * 100)}%` : null,
      e.empathy !== undefined ? `empathy: ${Math.round(e.empathy * 100)}%` : null,
    ]
      .filter(Boolean)
      .join(" | ");
    lines.push(`**Current emotional state:** ${emoLine}`);
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
