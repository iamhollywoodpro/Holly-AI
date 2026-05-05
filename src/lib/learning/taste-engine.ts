/**
 * HOLLY Taste Engine — Phase 2B / 2C
 *
 * Replaces the disabled TasteLearner with a fully-working implementation
 * aligned to the Phase 1A schema (TasteSignal + TasteProfile).
 *
 * Key responsibilities:
 *   • recordSignal()   – persist an individual taste signal (implicit or explicit)
 *   • getProfile()     – fetch the current TasteProfile
 *   • recomputeProfile()– aggregate recent signals into a fresh TasteProfile upsert
 *   • detectImplicit() – heuristic detection of implicit taste signals from a message
 *
 * The "item" field on TasteSignal stores a free-form label (e.g. "bullet_lists",
 * "formal_tone", "code_blocks", "humor").  Context stores the raw message snippet.
 *
 * Import: import { TasteEngine } from '@/lib/learning/taste-engine'
 */

import { prisma } from '@/lib/db';

// ─── public types ─────────────────────────────────────────────────────────────

export type TasteCategory = 'tone' | 'length' | 'format' | 'humor' | 'emoji' | 'technical' | 'topic';
export type TasteSignal = 'positive' | 'negative' | 'neutral';

export interface TasteSignalInput {
  category: TasteCategory;
  /** What this signal is about: "formal_tone", "bullet_lists", "code_blocks", etc. */
  item: string;
  signal: TasteSignal;
  /** Brief context (will be truncated to 500 chars) */
  context?: string;
  weight?: number;
  /** 'implicit' = inferred from behaviour; 'explicit' = user said so; 'feedback' = thumbs up/down */
  source?: 'implicit' | 'explicit' | 'feedback';
}

export interface TasteStyle {
  tone: number;        // 0=formal … 1=casual
  verbosity: number;   // 0=concise … 1=detailed
  humor: number;       // 0=serious … 1=playful
  technical: number;   // 0=simple … 1=expert
  emoji: number;       // 0=none … 1=heavy
  topTopics: string[];
  formats: string[];
  signalCount: number;
}

// ─── engine class ─────────────────────────────────────────────────────────────

export class TasteEngine {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // ── recording ──────────────────────────────────────────────────────────────

  /**
   * Record a single taste signal.
   * Safe to fire-and-forget (never throws).
   */
  async recordSignal(input: TasteSignalInput): Promise<void> {
    try {
      await prisma.tasteSignal.create({
        data: {
          userId: this.userId,
          category: input.category,
          signal: input.signal,
          context: (input.context ?? '').slice(0, 500),
          weight: input.weight ?? 1.0,
          source: input.source ?? 'implicit',
        },
      });

      // Recompute profile async — don't block the caller
      void this.recomputeProfile();
    } catch (err) {
      console.error('[TasteEngine] recordSignal error:', err);
    }
  }

  /**
   * Record multiple signals at once (e.g. from a single message analysis).
   */
  async recordSignals(inputs: TasteSignalInput[]): Promise<void> {
    if (!inputs.length) return;
    try {
      await prisma.tasteSignal.createMany({
        data: inputs.map(input => ({
          userId: this.userId,
          category: input.category,
          signal: input.signal,
          context: (input.context ?? '').slice(0, 500),
          weight: input.weight ?? 1.0,
          source: input.source ?? 'implicit',
        })),
        skipDuplicates: false,
      });
      void this.recomputeProfile();
    } catch (err) {
      console.error('[TasteEngine] recordSignals error:', err);
    }
  }

  // ── profile ────────────────────────────────────────────────────────────────

  /**
   * Fetch the current TasteProfile from the DB.
   */
  async getProfile(): Promise<TasteStyle | null> {
    try {
      const row = await prisma.tasteProfile.findUnique({
        where: { userId: this.userId },
      });
      if (!row) return null;
      return {
        tone: row.tone,
        verbosity: row.verbosity,
        humor: row.humor,
        technical: row.technical,
        emoji: row.emoji,
        topTopics: row.topTopics,
        formats: row.formats,
        signalCount: row.signalCount,
      };
    } catch {
      return null;
    }
  }

  /**
   * Aggregate the last 200 signals and write a fresh TasteProfile.
   * Called automatically after recordSignal / recordSignals.
   */
  async recomputeProfile(): Promise<void> {
    try {
      const signals = await prisma.tasteSignal.findMany({
        where: { userId: this.userId },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      if (!signals.length) return;

      // Helper: score a dimension by item keywords
      const score = (
        items: string[],
        positiveItems: string[],
        negativeItems: string[]
      ): number => {
        let pos = 0, neg = 0, total = 0;
        for (const s of signals) {
          const matches =
            (positiveItems.some(p => s.item.includes(p)) && s.signal === 'positive') ||
            (negativeItems.some(n => s.item.includes(n)) && s.signal === 'negative');
          if (matches) {
            const w = s.signal === 'positive' ? s.weight : -s.weight;
            if (w > 0) pos += w;
            else neg += Math.abs(w);
            total += s.weight;
          }
        }
        if (total === 0) return 0.5;
        return Math.min(1, Math.max(0, (pos + 0.5 * total) / (total + 0.001)));
      };

      // ── tone: formal=low, casual=high ────────────────────────────────────
      const tone = score(
        [],
        ['casual', 'informal', 'friendly', 'warm', 'conversational'],
        ['formal', 'professional', 'precise']
      );

      // ── verbosity: concise=low, detailed=high ────────────────────────────
      const verbosity = score(
        [],
        ['detailed', 'thorough', 'explain', 'verbose', 'long'],
        ['concise', 'brief', 'short', 'tl;dr', 'summary']
      );

      // ── humor ─────────────────────────────────────────────────────────────
      const humor = score([], ['humor', 'funny', 'joke', 'wit', 'playful'], ['serious', 'no_humor']);

      // ── technical ─────────────────────────────────────────────────────────
      const technical = score(
        [],
        ['technical', 'code', 'expert', 'deep', 'advanced'],
        ['simple', 'beginner', 'basic', 'accessible']
      );

      // ── emoji ─────────────────────────────────────────────────────────────
      const emoji = score([], ['emoji', 'emoticon'], ['no_emoji', 'plain']);

      // ── topics (most mentioned items in 'topic' category) ─────────────────
      const topicSignals = signals.filter(s => s.category === 'topic' && s.signal !== 'negative');
      const topicFreq: Record<string, number> = {};
      for (const s of topicSignals) {
        topicFreq[s.item] = (topicFreq[s.item] ?? 0) + s.weight;
      }
      const topTopics = Object.entries(topicFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([t]) => t);

      // ── preferred formats ─────────────────────────────────────────────────
      const formatSignals = signals.filter(s => s.category === 'format' && s.signal === 'positive');
      const fmtFreq: Record<string, number> = {};
      for (const s of formatSignals) {
        fmtFreq[s.item] = (fmtFreq[s.item] ?? 0) + s.weight;
      }
      const formats = Object.entries(fmtFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([f]) => f);

      await prisma.tasteProfile.upsert({
        where: { userId: this.userId },
        create: {
          userId: this.userId,
          tone,
          verbosity,
          humor,
          technical,
          emoji,
          topTopics,
          formats,
          signalCount: signals.length,
        },
        update: {
          tone,
          verbosity,
          humor,
          technical,
          emoji,
          topTopics,
          formats,
          signalCount: signals.length,
          lastUpdated: new Date(),
        },
      });
    } catch (err) {
      console.error('[TasteEngine] recomputeProfile error:', err);
    }
  }

  // ── implicit detection ─────────────────────────────────────────────────────

  /**
   * Heuristically extract implicit taste signals from a user message.
   * Returns an array of TasteSignalInputs ready to pass to recordSignals().
   *
   * This is intentionally lightweight — Phase 3 will use the LLM for richer
   * signal extraction.
   */
  static detectImplicit(userMessage: string, assistantResponse?: string): TasteSignalInput[] {
    const signals: TasteSignalInput[] = [];
    const msg = userMessage.toLowerCase();
    const ctx = userMessage.slice(0, 300);

    // ── length signals ──────────────────────────────────────────────────────
    if (/\b(shorter|briefer|tldr|tl;dr|summarize|in short|keep it short)\b/.test(msg)) {
      signals.push({ category: 'length', item: 'concise', signal: 'positive', context: ctx, source: 'implicit' });
    }
    if (/\b(more detail|elaborate|explain more|expand on|tell me more|go deeper)\b/.test(msg)) {
      signals.push({ category: 'length', item: 'detailed', signal: 'positive', context: ctx, source: 'implicit' });
    }

    // ── tone signals ────────────────────────────────────────────────────────
    if (/\b(formal|professional|formal tone)\b/.test(msg)) {
      signals.push({ category: 'tone', item: 'formal', signal: 'positive', context: ctx, source: 'implicit' });
    }
    if (/\b(casual|relaxed|chill|informal)\b/.test(msg)) {
      signals.push({ category: 'tone', item: 'casual', signal: 'positive', context: ctx, source: 'implicit' });
    }

    // ── humor signals ───────────────────────────────────────────────────────
    if (/\b(haha|lol|lmao|funny|hilarious|joke|make it fun|witty)\b/.test(msg)) {
      signals.push({ category: 'humor', item: 'humor', signal: 'positive', context: ctx, source: 'implicit', weight: 0.6 });
    }

    // ── emoji signals ───────────────────────────────────────────────────────
    const emojiMatch = userMessage.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/gu);
    if (emojiMatch && emojiMatch.length >= 2) {
      signals.push({ category: 'emoji', item: 'emoji', signal: 'positive', context: ctx, source: 'implicit', weight: 0.5 });
    }

    // ── technical signals ───────────────────────────────────────────────────
    const codeBlocksInMsg = (userMessage.match(/```/g) || []).length;
    if (codeBlocksInMsg >= 2) {
      signals.push({ category: 'technical', item: 'code', signal: 'positive', context: ctx, source: 'implicit' });
    }
    if (/\b(explain simply|for a beginner|non-technical|layperson)\b/.test(msg)) {
      signals.push({ category: 'technical', item: 'simple', signal: 'positive', context: ctx, source: 'implicit' });
    }

    // ── format signals from assistant response ──────────────────────────────
    if (assistantResponse) {
      const hasBullets = /^\s*[-*•]/m.test(assistantResponse);
      const hasNumbered = /^\s*\d+\./m.test(assistantResponse);
      const hasCodeBlock = assistantResponse.includes('```');
      const hasTable = /\|.+\|.+\|/.test(assistantResponse);

      // If assistant used bullets and the next message is substantive (not a complaint),
      // treat as implicit positive signal for bullet format
      if (hasBullets && userMessage.length > 20 && !/\b(don.t use bullets|no bullets|no lists)\b/.test(msg)) {
        signals.push({ category: 'format', item: 'bullet_lists', signal: 'positive', context: ctx, source: 'implicit', weight: 0.4 });
      }
      if (hasCodeBlock && !/\b(no code)\b/.test(msg)) {
        signals.push({ category: 'format', item: 'code_blocks', signal: 'positive', context: ctx, source: 'implicit', weight: 0.4 });
      }
      if (hasTable) {
        signals.push({ category: 'format', item: 'tables', signal: 'positive', context: ctx, source: 'implicit', weight: 0.4 });
      }
    }

    return signals;
  }
}
