/**
 * HOLLY Evolution Trigger — Phase 2D / Phase 3B+3C
 *
 * Processes unhandled LearningEvents into LearningPatterns, then examines
 * the pattern landscape to create EvolutionProposals when there is enough
 * signal to justify a meaningful improvement.
 *
 * Phase 3B: after processing events, calls evolveIdentity() for each affected
 *           user so HollyIdentity.confidenceLevel + traits drift from real data.
 *
 * Phase 3C: calls LearningEngine.processEventQueue() to populate
 *           UserLearningProfile from the same events.
 *
 * Design goals:
 *   • Non-blocking — runs in the background, never throws to callers
 *   • Idempotent — marks processed events so they are not re-processed
 *   • Conservative — only proposes changes when confidence is high
 *
 * Called from: app/api/autonomous/evolve/route.ts  (on-demand)
 *              app/api/cron/evolve/route.ts         (hourly Vercel cron)
 *
 * Import: import { processEvolutionCycle } from '@/lib/autonomous/evolution-trigger'
 */

import { prisma } from '@/lib/db';
import { evolveIdentity } from '@/lib/identity/identity-evolver';
import { learningEngine } from '@/lib/autonomous/learning-engine';

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
 *   2. Aggregate them into LearningPattern rows          (Phase 2D)
 *   3. Populate UserLearningProfile via LearningEngine   (Phase 3C)
 *   4. Evolve HollyIdentity for affected users           (Phase 3B)
 *   5. Inspect patterns → create EvolutionProposals      (Phase 2D)
 *
 * @param batchSize  max events to process in one call (default 50)
 * @returns          summary of what was done
 */
export async function processEvolutionCycle(batchSize = 50): Promise<{
  eventsProcessed: number;
  patternsUpdated: number;
  proposalsCreated: number;
  identitiesEvolved: number;
}> {
  let eventsProcessed = 0;
  let patternsUpdated = 0;
  let proposalsCreated = 0;
  let identitiesEvolved = 0;

  try {
    // ── Step 1: pull unprocessed events ──────────────────────────────────────
    const events = await prisma.learningEvent.findMany({
      where: { processed: false },
      orderBy: { timestamp: 'asc' },
      take: batchSize,
    });

    if (!events.length) {
      console.log('[EvolutionTrigger] No unprocessed events — cycle skipped');
      return { eventsProcessed: 0, patternsUpdated: 0, proposalsCreated: 0, identitiesEvolved: 0 };
    }

    console.log(`[EvolutionTrigger] Processing ${events.length} events`);

    // Collect distinct userIds affected in this batch
    const affectedUsers = [...new Set(events.map(e => e.userId))];

    // ── Step 2: aggregate events → patterns ──────────────────────────────────
    const patternMap = new Map<string, { category: PatternCategory; count: number }>();

    for (const event of events) {
      const data = (event.data ?? {}) as Record<string, unknown>;

      if (event.type === 'conversation') {
        // Mode preference patterns
        const mode = (data.mode as string) ?? 'default';
        inc(patternMap, `mode:${mode}`, 'user_preference');

        // Verbosity mismatch pattern
        const userLen = typeof data.userLength === 'number' ? data.userLength : 0;
        const resLen = typeof data.responseLength === 'number' ? data.responseLength : 0;
        if (userLen < 80 && resLen > 800) {
          inc(patternMap, 'style:short_query_long_response', 'user_preference');
        }

        // Topic patterns — now enriched by LLM extraction (Phase 3A)
        const topics = Array.isArray(data.topics) ? (data.topics as string[]) : [];
        for (const topic of topics.slice(0, 5)) {
          inc(patternMap, `topic:${topic}`, 'common_query');
        }
      }

      if (event.type === 'feedback' || event.type === 'error') {
        inc(
          patternMap,
          `event:${event.type}`,
          event.type === 'error' ? 'error_pattern' : 'success_pattern'
        );
      }
    }

    // ── Step 3: upsert LearningPattern rows ──────────────────────────────────
    const totalEvents = events.length;

    for (const [pattern, { category, count }] of patternMap) {
      const confidence = Math.min(1.0, (count / Math.max(1, totalEvents)) * 5);

      const existing = await prisma.learningPattern.findFirst({
        where: { pattern, category },
      });

      if (existing) {
        await prisma.learningPattern.update({
          where: { id: existing.id },
          data: {
            frequency: existing.frequency + count,
            // Exponential moving average: favour historical confidence
            confidence: Math.min(1.0, existing.confidence * 0.8 + confidence * 0.2),
            lastSeen: new Date(),
          },
        });
      } else {
        await prisma.learningPattern.create({
          data: { pattern, category, frequency: count, confidence, lastSeen: new Date() },
        });
      }
      patternsUpdated++;
    }

    // ── Step 4: mark events as processed ────────────────────────────────────
    await prisma.learningEvent.updateMany({
      where: { id: { in: events.map(e => e.id) } },
      data: { processed: true },
    });
    eventsProcessed = events.length;

    // ── Step 5 (Phase 3C): populate UserLearningProfile via LearningEngine ──
    // learningEngine.processEventQueue() fetches its own unprocessed batch,
    // so we call it once here (safe even after we already marked events processed —
    // it has its own "processed" flag check via raw SQL).
    try {
      await learningEngine.processEventQueue();
    } catch (leErr) {
      console.warn('[EvolutionTrigger] LearningEngine.processEventQueue failed (non-fatal):', leErr);
    }

    // ── Step 6 (Phase 3B): evolve identity for each affected user ───────────
    for (const userId of affectedUsers) {
      try {
        const result = await evolveIdentity(userId);
        if (result) identitiesEvolved++;
      } catch (idErr) {
        console.warn(`[EvolutionTrigger] evolveIdentity failed for ${userId}:`, idErr);
      }
    }

    // ── Step 7: propose evolutions from high-confidence patterns ─────────────
    proposalsCreated = await maybePropose();

  } catch (err) {
    console.error('[EvolutionTrigger] Cycle error:', err);
  }

  console.log(
    `[EvolutionTrigger] ✅ events:${eventsProcessed} patterns:${patternsUpdated} identities:${identitiesEvolved} proposals:${proposalsCreated}`
  );
  return { eventsProcessed, patternsUpdated, proposalsCreated, identitiesEvolved };
}

// ─── proposal generation ──────────────────────────────────────────────────────

async function maybePropose(): Promise<number> {
  let created = 0;

  try {
    const strongPatterns = await prisma.learningPattern.findMany({
      where: { confidence: { gte: 0.6 }, frequency: { gte: 5 } },
      orderBy: [{ confidence: 'desc' }, { frequency: 'desc' }],
      take: 10,
    });

    for (const pat of strongPatterns) {
      const existing = await prisma.evolutionProposal.findFirst({
        where: {
          title: { contains: pat.pattern.replace(':', '_').slice(0, 30) },
          status: { in: ['proposed', 'approved', 'testing'] },
        },
      });
      if (existing) continue;

      const proposal = buildProposal(pat as unknown as PatternSummary & { id: string; action: string | null });
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
      description: `Pattern: users frequently use "${mode}" mode (seen ${frequency} times, confidence ${(confidence * 100).toFixed(0)}%). Improving this mode's system prompt and capabilities would have broad impact.`,
      rationale: 'High-frequency usage indicates high value — investment here multiplies benefit.',
      impact: frequency >= 20 ? 'high' : 'medium',
      risk: 'low',
      status: 'proposed',
    } as const;
  }

  if (category === 'user_preference' && pattern === 'style:short_query_long_response') {
    return {
      type: 'feature_addition',
      title: 'Implement adaptive response length calibration',
      description: `Users often send short queries but receive very long responses (${frequency} occurrences). Adaptive calibration would better match response length to query intent.`,
      rationale: 'Mismatched response length reduces satisfaction.',
      impact: 'medium',
      risk: 'low',
      status: 'proposed',
    } as const;
  }

  if (category === 'common_query' && pattern.startsWith('topic:')) {
    const topic = pattern.replace('topic:', '');
    return {
      type: 'feature_addition',
      title: `Deepen specialised knowledge for "${topic}"`,
      description: `Topic "${topic}" appears in ${frequency} conversations. Enriching Holly's knowledge for this topic would improve response quality.`,
      rationale: 'Frequent topic pattern signals unmet user need for deeper domain coverage.',
      impact: 'medium',
      risk: 'low',
      status: 'proposed',
    } as const;
  }

  if (category === 'error_pattern') {
    return {
      type: 'code_improvement',
      title: 'Reduce error frequency in conversations',
      description: `Error events detected ${frequency} times. Investigating common error paths would improve reliability.`,
      rationale: 'Error reduction directly improves reliability and user trust.',
      impact: 'high',
      risk: 'medium',
      status: 'proposed',
    } as const;
  }

  return null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function inc(
  map: Map<string, { category: PatternCategory; count: number }>,
  key: string,
  category: PatternCategory
) {
  const prev = map.get(key) ?? { category, count: 0 };
  map.set(key, { category, count: prev.count + 1 });
}
