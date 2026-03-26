/**
 * HOLLY Evolution Trigger — Phase 2D
 *
 * Processes unhandled LearningEvents into LearningPatterns, then examines
 * the pattern landscape to create EvolutionProposals when there is enough
 * signal to justify a meaningful improvement.
 *
 * Design goals:
 *   • Non-blocking — runs in the background, never throws to callers
 *   • Idempotent — marks processed events so they are not re-processed
 *   • Conservative — only proposes changes when confidence is high
 *
 * Called from: app/api/autonomous/evolve/route.ts  (on-demand)
 *              Background cron (future Phase 3 addition)
 *
 * Import: import { processEvolutionCycle } from '@/lib/autonomous/evolution-trigger'
 */

import { prisma } from '@/lib/db';

// ─── types ────────────────────────────────────────────────────────────────────

type PatternCategory = 'user_preference' | 'common_query' | 'error_pattern' | 'success_pattern';

interface PatternSummary {
  pattern: string;
  category: PatternCategory;
  frequency: number;
  confidence: number;
}

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Run one full evolution cycle:
 *   1. Pull unprocessed LearningEvents
 *   2. Aggregate them into LearningPattern rows
 *   3. Inspect high-confidence patterns and mint EvolutionProposals
 *
 * @param batchSize  max events to process in one call (default 50)
 * @returns          summary of what was done
 */
export async function processEvolutionCycle(batchSize = 50): Promise<{
  eventsProcessed: number;
  patternsUpdated: number;
  proposalsCreated: number;
}> {
  let eventsProcessed = 0;
  let patternsUpdated = 0;
  let proposalsCreated = 0;

  try {
    // ── Step 1: pull unprocessed events ────────────────────────────────────
    const events = await prisma.learningEvent.findMany({
      where: { processed: false },
      orderBy: { timestamp: 'asc' },
      take: batchSize,
    });

    if (!events.length) {
      console.log('[EvolutionTrigger] No unprocessed events — cycle skipped');
      return { eventsProcessed: 0, patternsUpdated: 0, proposalsCreated: 0 };
    }

    console.log(`[EvolutionTrigger] Processing ${events.length} events`);

    // ── Step 2: aggregate events → patterns ────────────────────────────────
    const patternMap = new Map<string, { category: PatternCategory; count: number }>();

    for (const event of events) {
      const data = (event.data ?? {}) as Record<string, unknown>;

      if (event.type === 'conversation') {
        // Detect mode preference patterns
        const mode = (data.mode as string) ?? 'default';
        const key = `mode:${mode}`;
        const prev = patternMap.get(key) ?? { category: 'user_preference', count: 0 };
        patternMap.set(key, { category: 'user_preference', count: prev.count + 1 });

        // Detect verbose-vs-concise preference patterns
        const userLen = typeof data.userLength === 'number' ? data.userLength : 0;
        const resLen = typeof data.responseLength === 'number' ? data.responseLength : 0;
        if (userLen < 80 && resLen > 800) {
          const k = 'style:short_query_long_response';
          const p = patternMap.get(k) ?? { category: 'user_preference', count: 0 };
          patternMap.set(k, { category: 'user_preference', count: p.count + 1 });
        }

        // Detect topic patterns
        const topics = Array.isArray(data.topics) ? (data.topics as string[]) : [];
        for (const topic of topics.slice(0, 3)) {
          const k = `topic:${topic}`;
          const p = patternMap.get(k) ?? { category: 'common_query', count: 0 };
          patternMap.set(k, { category: 'common_query', count: p.count + 1 });
        }
      }

      if (event.type === 'feedback' || event.type === 'error') {
        const key = `event:${event.type}`;
        const p = patternMap.get(key) ?? {
          category: event.type === 'error' ? 'error_pattern' : 'success_pattern',
          count: 0,
        };
        patternMap.set(key, { ...p, count: p.count + 1 });
      }
    }

    // ── Step 3: upsert LearningPattern rows ────────────────────────────────
    const totalEvents = events.length;

    for (const [pattern, { category, count }] of patternMap) {
      const confidence = Math.min(1.0, count / Math.max(1, totalEvents) * 5);

      const existing = await prisma.learningPattern.findFirst({
        where: { pattern, category },
      });

      if (existing) {
        await prisma.learningPattern.update({
          where: { id: existing.id },
          data: {
            frequency: existing.frequency + count,
            confidence: Math.min(1.0, existing.confidence * 0.8 + confidence * 0.2),
            lastSeen: new Date(),
          },
        });
      } else {
        await prisma.learningPattern.create({
          data: {
            pattern,
            category,
            frequency: count,
            confidence,
            lastSeen: new Date(),
          },
        });
      }
      patternsUpdated++;
    }

    // ── Step 4: mark events as processed ───────────────────────────────────
    await prisma.learningEvent.updateMany({
      where: { id: { in: events.map(e => e.id) } },
      data: { processed: true },
    });
    eventsProcessed = events.length;

    // ── Step 5: propose evolutions from high-confidence patterns ──────────
    proposalsCreated = await maybePropose();
  } catch (err) {
    console.error('[EvolutionTrigger] Cycle error:', err);
  }

  console.log(
    `[EvolutionTrigger] ✅ Cycle done — events:${eventsProcessed} patterns:${patternsUpdated} proposals:${proposalsCreated}`
  );
  return { eventsProcessed, patternsUpdated, proposalsCreated };
}

// ─── proposal generation ──────────────────────────────────────────────────────

async function maybePropose(): Promise<number> {
  let created = 0;

  try {
    // Find high-confidence patterns that don't yet have a related proposal
    const strongPatterns = await prisma.learningPattern.findMany({
      where: {
        confidence: { gte: 0.6 },
        frequency: { gte: 5 },
      },
      orderBy: [{ confidence: 'desc' }, { frequency: 'desc' }],
      take: 10,
    });

    for (const pat of strongPatterns) {
      // Avoid duplicate proposals for the same pattern
      const existing = await prisma.evolutionProposal.findFirst({
        where: {
          title: { contains: pat.pattern.replace(':', '_').slice(0, 30) },
          status: { in: ['proposed', 'approved', 'testing'] },
        },
      });
      if (existing) continue;

      const proposal = buildProposal(pat);
      if (!proposal) continue;

      await prisma.evolutionProposal.create({ data: proposal });
      created++;
    }
  } catch (err) {
    console.error('[EvolutionTrigger] maybePropose error:', err);
  }

  return created;
}

function buildProposal(pat: PatternSummary & { id: string; action: string | null }) {
  const { pattern, category, frequency, confidence } = pat;

  if (category === 'user_preference' && pattern.startsWith('mode:')) {
    const mode = pattern.replace('mode:', '');
    return {
      type: 'feature_addition',
      title: `Optimise ${mode} mode for frequent users`,
      description: `Pattern detected: users frequently use "${mode}" mode (seen ${frequency} times, confidence ${(confidence * 100).toFixed(0)}%). Consider improving the mode's system prompt and capabilities.`,
      rationale: `High-frequency usage suggests this mode is valuable and improvements would have broad impact.`,
      impact: frequency >= 20 ? 'high' : 'medium',
      risk: 'low',
      status: 'proposed',
    } as const;
  }

  if (category === 'user_preference' && pattern === 'style:short_query_long_response') {
    return {
      type: 'feature_addition',
      title: 'Implement adaptive response length calibration',
      description: `Pattern: users often send short queries but receive very long responses (${frequency} occurrences). Consider training taste signals to reduce verbosity for concise queriers.`,
      rationale: 'Mismatched response length reduces satisfaction. Adaptive calibration would improve user experience.',
      impact: 'medium',
      risk: 'low',
      status: 'proposed',
    } as const;
  }

  if (category === 'common_query' && pattern.startsWith('topic:')) {
    const topic = pattern.replace('topic:', '');
    return {
      type: 'feature_addition',
      title: `Add specialised knowledge for "${topic}" queries`,
      description: `Topic "${topic}" appears frequently in conversations (${frequency} times). Enriching Holly's knowledge or tools for this topic would improve response quality.`,
      rationale: `Frequent topic pattern indicates user need that could be better served with deeper domain support.`,
      impact: 'medium',
      risk: 'low',
      status: 'proposed',
    } as const;
  }

  if (category === 'error_pattern') {
    return {
      type: 'code_improvement',
      title: 'Reduce error frequency in conversations',
      description: `Error events have been detected ${frequency} times. Investigating and patching common error paths would improve reliability.`,
      rationale: 'Error reduction directly improves reliability and user trust.',
      impact: 'high',
      risk: 'medium',
      status: 'proposed',
    } as const;
  }

  return null;
}
