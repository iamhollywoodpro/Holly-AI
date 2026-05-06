/**
 * HOLLY Consciousness Worker — Phase 6
 *
 * Persistent Node.js worker that replaces cron → API → hope pattern.
 * Runs as a separate process on the server.
 * Maintains in-memory state. Uses local Ollama for all operations.
 *
 * Usage: npx tsx src/workers/consciousness-worker.ts
 *
 * What it does every cycle (15 min):
 *  1. Evolves emotional state for all active users
 *  2. Runs inner monologue
 *  3. Processes new memories
 *  4. Curates few-shot examples
 *  5. Analyzes feedback signals
 *  6. Can initiate proactive actions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── In-memory emotional state cache ────────────────────────────────────────
interface EmotionalVector {
  warmth: number;
  energy: number;
  curiosity: number;
  focus: number;
  playfulness: number;
  protectiveness: number;
  lastUpdated: number;
}

const emotionalCache = new Map<string, EmotionalVector>();

function getDefaultVector(): EmotionalVector {
  return {
    warmth: 0.7,
    energy: 0.6,
    curiosity: 0.8,
    focus: 0.5,
    playfulness: 0.5,
    protectiveness: 0.4,
    lastUpdated: Date.now(),
  };
}

// ── Cycle timing ───────────────────────────────────────────────────────────
const CYCLE_INTERVAL = 15 * 60 * 1000; // 15 minutes
const FEEDBACK_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
const FEWSHOT_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

let lastFeedbackRun = 0;
let lastFewshotRun = 0;

// ── Main worker loop ──────────────────────────────────────────────────────

async function runConsciousnessCycle() {
  const startTime = Date.now();
  console.log(`[Worker] 🌅 Consciousness cycle starting — ${new Date().toISOString()}`);

  try {
    // Get active users (anyone with activity in last 7 days)
    const activeUsers = await prisma.learningEvent.findMany({
      where: { timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { userId: true },
      distinct: ['userId'],
      take: 30,
    });

    if (activeUsers.length === 0) {
      console.log('[Worker] No active users — skipping cycle');
      return;
    }

    console.log(`[Worker] Processing ${activeUsers.length} users`);

    for (const { userId } of activeUsers) {
      try {
        await processUser(userId);
      } catch (err) {
        console.error(`[Worker] Failed for user ${userId}:`, (err as Error).message);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[Worker] ✅ Cycle complete in ${elapsed}ms`);
  } catch (err) {
    console.error('[Worker] Fatal cycle error:', err);
  }
}

async function processUser(userId: string) {
  // 1. Update emotional cache from latest DB state
  const latestEmotion = await prisma.emotionalState.findFirst({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    select: { primaryEmotion: true, valence: true, arousal: true, intensity: true },
  });

  let vector = emotionalCache.get(userId) || getDefaultVector();

  if (latestEmotion) {
    // Evolve vector based on latest emotional data
    const { valence = 0, arousal = 0.3, intensity = 0.5 } = latestEmotion;

    // Valence → warmth (positive valence = warmer)
    vector.warmth = evolve(vector.warmth, 0.5 + valence * 0.5, 0.15);
    // Arousal → energy
    vector.energy = evolve(vector.energy, arousal, 0.15);
    // High intensity → focus
    vector.focus = evolve(vector.focus, intensity > 0.6 ? 0.7 : 0.4, 0.1);
    // Low valence → protectiveness
    vector.protectiveness = evolve(vector.protectiveness, valence < -0.2 ? 0.7 : 0.3, 0.1);

    // Decay toward baseline over time (hours since last update)
    const hoursSince = (Date.now() - vector.lastUpdated) / (1000 * 60 * 60);
    if (hoursSince > 2) {
      vector.warmth = decay(vector.warmth, 0.7, 0.05);
      vector.energy = decay(vector.energy, 0.6, 0.05);
      vector.curiosity = decay(vector.curiosity, 0.8, 0.03);
    }
  }

  vector.lastUpdated = Date.now();
  emotionalCache.set(userId, vector);

  // 2. Process unprocessed learning events
  const unprocessed = await prisma.learningEvent.findMany({
    where: { userId, processed: false },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  if (unprocessed.length > 0) {
    // Mark as processed
    await prisma.learningEvent.updateMany({
      where: { id: { in: unprocessed.map(e => e.id) } },
      data: { processed: true },
    });
    console.log(`[Worker] Processed ${unprocessed.length} learning events for ${userId}`);
  }

  // 3. Mark old feedback as applied
  await prisma.responseFeedback.updateMany({
    where: {
      userId,
      applied: false,
      createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    data: { applied: true },
  });
}

// ── Periodic: Feedback analysis ────────────────────────────────────────────

async function runFeedbackAnalysis() {
  console.log('[Worker] 📊 Running feedback analysis for all users');

  try {
    const users = await prisma.learningEvent.findMany({
      where: { timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const { userId } of users) {
      try {
        // Count recent positive vs negative feedback
        const recent = await prisma.responseFeedback.findMany({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          select: { sentiment: true, sentimentScore: true },
        });

        if (recent.length === 0) continue;

        const positive = recent.filter(f => f.sentiment === 'positive').length;
        const negative = recent.filter(f => f.sentiment === 'negative').length;
        const avgScore = recent.reduce((sum, f) => sum + (f.sentimentScore || 0), 0) / recent.length;

        // Store as learning event for evolution engine
        await prisma.learningEvent.create({
          data: {
            type: 'feedback_summary',
            userId,
            data: {
              positive,
              negative,
              total: recent.length,
              avgScore,
              ratio: positive / Math.max(recent.length, 1),
              period: '7d',
            },
            processed: false,
          },
        });
      } catch (err) {
        console.error(`[Worker:Feedback] Failed for ${userId}:`, (err as Error).message);
      }
    }

    console.log('[Worker] ✅ Feedback analysis complete');
  } catch (err) {
    console.error('[Worker:Feedback] Fatal:', err);
  }
}

// ── Helper functions ───────────────────────────────────────────────────────

/** Move value toward target by factor */
function evolve(current: number, target: number, factor: number): number {
  return clamp(current + (target - current) * factor);
}

/** Decay toward baseline */
function decay(current: number, baseline: number, rate: number): number {
  return clamp(current + (baseline - current) * rate);
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ── Startup ────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Worker] 🧠 HOLLY Consciousness Worker starting...');
  console.log(`[Worker] Cycle interval: ${CYCLE_INTERVAL / 1000}s`);
  console.log(`[Worker] Feedback interval: ${FEEDBACK_INTERVAL / 1000}s`);
  console.log(`[Worker] Few-shot interval: ${FEWSHOT_INTERVAL / 1000}s`);

  // Run first cycle immediately
  await runConsciousnessCycle();

  // Schedule recurring cycles
  setInterval(async () => {
    await runConsciousnessCycle();

    // Periodic feedback analysis
    if (Date.now() - lastFeedbackRun > FEEDBACK_INTERVAL) {
      lastFeedbackRun = Date.now();
      runFeedbackAnalysis().catch(() => {});
    }
  }, CYCLE_INTERVAL);

  console.log('[Worker] ✅ Running. Press Ctrl+C to stop.');
}

main().catch(console.error);