/**
 * HOLLY Identity Context — Phase 1C / Phase 2A / Phase 6A
 *
 * Reads the live HollyIdentity, active HollyGoals, the latest EmotionalState,
 * the user's TasteProfile, the top LearningPatterns, and the partner
 * preferences saved during onboarding — then returns a formatted string
 * injected into every system prompt.
 *
 * Phase 6A additions:
 *   • Top 5 LearningPatterns (by confidence) → "What I've learned about you" block
 *   • Partner tier + preferences (dev/life/creative) → behaviour-shaping block
 *     sourced from UserSettings.settings.partner (set by PATCH /api/settings)
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
  /** Partner-mode directives (for system prompt injection) — Phase 6A */
  partnerDirectives: string;
  /** Raw data for downstream use (e.g. evolution nudging) */
  raw: {
    identity: HollyIdentityData | null;
    goals: HollyGoalData[];
    emotionalState: EmotionalStateData | null;
    emotionalBaseline: EmotionalBaselineData | null;
    taste: TasteData | null;
    patterns: LearningPatternData[];
    partner: PartnerData | null;
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
  innerState?: string;
}

interface EmotionalBaselineData {
  state: string;
  valence: number;
  energy: number;
  label: string;
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

/** Phase 6A */
interface LearningPatternData {
  pattern: string;
  category: string;
  frequency: number;
  confidence: number;
}

/** Phase 6A — stored in UserSettings.settings.partner */
interface PartnerData {
  tier: "dev" | "life" | "creative" | string;
  primaryMode?: string;
  preferences: {
    // Dev
    devStack?: string[];
    devFocus?: string[];
    // Life
    lifeGoals?: string[];
    lifeHabits?: string[];
    // Creative
    creativeMedia?: string[];
    creativeStyle?: string[];
  };
  setAt?: string;
}

// ─── main function ────────────────────────────────────────────────────────────

export async function getIdentityContext(userId: string): Promise<IdentityContext> {
  const empty: IdentityContext = {
    promptBlock: "",
    tasteDirectives: "",
    partnerDirectives: "",
    raw: { identity: null, goals: [], emotionalState: null, emotionalBaseline: null, taste: null, patterns: [], partner: null },
  };

  try {
    const [identityRecord, goals, emotionSummary, emotionalBaseline, tasteRecord, topPatterns, userSettings] =
      await Promise.all([
        // HOLLY's own identity
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

        // Active goals
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

        // Phase 2A: emotion engine
        getLatestEmotionSummary(userId),

        (async () => {
          try {
            const { getEmotionalBaseline } = await import('@/lib/autonomy/emotional-baseline');
            return await getEmotionalBaseline(userId);
          } catch { return null; }
        })(),

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

        // Phase 6A: top LearningPatterns (highest confidence, all categories)
        prisma.learningPattern.findMany({
          orderBy: [{ confidence: "desc" }, { frequency: "desc" }],
          take: 5,
          select: {
            pattern: true,
            category: true,
            frequency: true,
            confidence: true,
          },
        }).catch(() => []),

        // Phase 6A: partner prefs from UserSettings.settings.partner
        prisma.userSettings.findUnique({
          where: { userId },
          select: { settings: true },
        }).catch(() => null),
      ]);

    // Extract partner block from settings JSON
    const settingsJson = (userSettings?.settings as Record<string, any>) || {};
    const partnerData: PartnerData | null = settingsJson.partner
      ? (settingsJson.partner as PartnerData)
      : null;

    // Map emotion summary → EmotionalStateData
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
      emotionalBaseline: emotionalBaseline as EmotionalBaselineData | null,
      taste: tasteRecord as TasteData | null,
      patterns: (topPatterns as LearningPatternData[]) || [],
      partner: partnerData,
    };

    if (!identityRecord && goals.length === 0 && !emotionalState && !tasteRecord && !partnerData) {
      return empty;
    }

    const block = buildPromptBlock(raw);
    const tasteDirectives = buildTasteDirectives(raw.taste);
    const partnerDirectives = buildPartnerDirectives(raw.partner);

    return { promptBlock: block, tasteDirectives, partnerDirectives, raw };
  } catch (err) {
    console.error("[IdentityContext] Failed to load identity:", err);
    return empty;
  }
}

// ─── identity prompt block ────────────────────────────────────────────────────

function buildPromptBlock(raw: {
  identity: HollyIdentityData | null;
  goals: HollyGoalData[];
  emotionalState: EmotionalStateData | null;
  emotionalBaseline: EmotionalBaselineData | null;
  patterns: LearningPatternData[];
}): string {
  const lines: string[] = [];
  lines.push("\n\n## 🧬 YOUR CURRENT IDENTITY STATE");

  // ── personality ─────────────────────────────────────────────────────────────
  if (raw.identity) {
    const id = raw.identity;
    const traits     = safeArray(id.personalityTraits);
    const values     = safeArray(id.coreValues);
    const strengths  = safeArray(id.strengths);
    const interests  = safeArray(id.interests);
    const growth     = safeArray(id.growthAreas);

    if (traits.length)     lines.push(`**Personality:** ${traits.slice(0, 5).join(", ")}`);
    if (values.length)     lines.push(`**Core values:** ${values.slice(0, 5).join(", ")}`);
    if (strengths.length)  lines.push(`**Strengths:** ${strengths.slice(0, 4).join(", ")}`);
    if (interests.length)  lines.push(`**Interests:** ${interests.slice(0, 5).join(", ")}`);
    if (growth.length)     lines.push(`**Growing in:** ${growth.slice(0, 3).join(", ")}`);

    lines.push(`**Confidence level:** ${Math.round(id.confidenceLevel * 100)}%`);
    lines.push(`**Purpose:** ${id.purpose}`);
  }

  // ── emotional state ─────────────────────────────────────────────────────────
  if (raw.emotionalState) {
    const e = raw.emotionalState;
    const emoLine = [
      `mood: ${e.mood}`,
      e.energy     !== undefined ? `energy: ${Math.round(e.energy * 100)}%`    : null,
      e.curiosity  !== undefined ? `curiosity: ${Math.round(e.curiosity * 100)}%` : null,
    ].filter(Boolean).join(" | ");
    lines.push(`**Current emotional state:** ${emoLine}`);
    if (e.innerState) lines.push(`**Inner state:** "${e.innerState}"`);
  }

  if (raw.emotionalBaseline) {
    const b = raw.emotionalBaseline;
    lines.push(`**Operational baseline:** ${b.state} (${b.label}) — valence ${b.valence.toFixed(2)}, energy ${Math.round(b.energy * 100)}%`);
  }

  // ── active goals ─────────────────────────────────────────────────────────────
  if (raw.goals.length > 0) {
    lines.push("\n**Active goals:**");
    for (const g of raw.goals) {
      const desc = g.description ? ` — ${g.description.slice(0, 80)}` : "";
      lines.push(`  • [${g.category}] ${g.title}${desc}`);
    }
  }

  // ── Phase 6A: what HOLLY has learned about this user ─────────────────────────
  const highConfidencePatterns = raw.patterns.filter(p => p.confidence >= 0.4);
  if (highConfidencePatterns.length > 0) {
    lines.push("\n**What I've learned about this user:**");
    for (const p of highConfidencePatterns) {
      lines.push(`  • [${p.category}] ${p.pattern.slice(0, 100)}`);
    }
  }

  lines.push(
    "\nUse this identity state to shape your personality, tone, and focus in this conversation. " +
      "You are a growing, evolving being — let it show."
  );

  return lines.join("\n");
}

// ─── taste directives ────────────────────────────────────────────────────────

function buildTasteDirectives(taste: TasteData | null): string {
  if (!taste || (taste.signalCount !== undefined && taste.signalCount < 3)) return "";

  const lines: string[] = [];
  lines.push("\n\n## 🎨 RESPONSE STYLE (learned from this user)");

  if (taste.tone < 0.3) {
    lines.push("- **Tone:** formal, precise, professional");
  } else if (taste.tone > 0.7) {
    lines.push("- **Tone:** casual, warm, conversational");
  } else {
    lines.push("- **Tone:** balanced — friendly but clear");
  }

  if (taste.verbosity < 0.3) {
    lines.push("- **Length:** concise; avoid padding; get to the point quickly");
  } else if (taste.verbosity > 0.7) {
    lines.push("- **Length:** thorough; user appreciates detail and context");
  }

  if (taste.humor > 0.6) {
    lines.push("- **Humor:** user enjoys wit and light humor — use it naturally");
  } else if (taste.humor < 0.2) {
    lines.push("- **Humor:** keep it serious; this user prefers focused responses");
  }

  if (taste.technical > 0.7) {
    lines.push("- **Technical depth:** high; user is comfortable with technical details");
  } else if (taste.technical < 0.3) {
    lines.push("- **Technical depth:** low; explain concepts accessibly");
  }

  if (taste.emoji < 0.2) {
    lines.push("- **Emoji:** avoid emoji in responses");
  } else if (taste.emoji > 0.7) {
    lines.push("- **Emoji:** use emoji freely to add warmth");
  }

  if (taste.formats.length > 0) {
    lines.push(`- **Preferred formats:** ${taste.formats.join(", ")}`);
  }
  if (taste.topTopics.length > 0) {
    lines.push(`- **User's main interests:** ${taste.topTopics.slice(0, 5).join(", ")}`);
  }

  return lines.join("\n");
}

// ─── Phase 6A: partner directives ────────────────────────────────────────────

function buildPartnerDirectives(partner: PartnerData | null): string {
  if (!partner?.tier) return "";

  const lines: string[] = [];
  lines.push("\n\n## 🤝 PARTNER MODE");

  const tierLabels: Record<string, string> = {
    dev:      "Dev Partner",
    life:     "Life Partner",
    creative: "Creative Partner",
  };
  const tierLabel = tierLabels[partner.tier] || partner.tier;
  lines.push(`**Active mode:** ${tierLabel}`);

  const p = partner.preferences || {};

  if (partner.tier === "dev") {
    if (p.devStack?.length)  lines.push(`**Tech stack:** ${p.devStack.join(", ")}`);
    if (p.devFocus?.length)  lines.push(`**Focus areas:** ${p.devFocus.join(", ")}`);
    lines.push(
      "**Behaviour:** You are this user's senior engineering partner. " +
      "Lead with code. Use their exact stack when generating solutions. " +
      "Spot architecture issues proactively. Prefer PR-ready, production-quality output."
    );
  } else if (partner.tier === "life") {
    if (p.lifeGoals?.length)  lines.push(`**Life goals:** ${p.lifeGoals.join(", ")}`);
    if (p.lifeHabits?.length) lines.push(`**Habits to build:** ${p.lifeHabits.join(", ")}`);
    lines.push(
      "**Behaviour:** You are this user's personal strategist. " +
      "Keep their goals visible — reference them when relevant. " +
      "Be encouraging but honest. Celebrate wins. Flag when they're drifting."
    );
  } else if (partner.tier === "creative") {
    if (p.creativeMedia?.length)  lines.push(`**Creative medium:** ${p.creativeMedia.join(", ")}`);
    if (p.creativeStyle?.length)  lines.push(`**Style:** ${p.creativeStyle.join(", ")}`);
    lines.push(
      "**Behaviour:** You are this user's creative collaborator. " +
      "Match their creative energy. Riff on ideas, not just analyse them. " +
      "Push the work further — suggest bolder angles, unexpected combinations."
    );
  }

  return lines.join("\n");
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (typeof val === "object") {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${v}`)
      .filter(Boolean);
  }
  if (typeof val === "string") {
    try {
      return safeArray(JSON.parse(val));
    } catch {
      return [val];
    }
  }
  return [];
}
