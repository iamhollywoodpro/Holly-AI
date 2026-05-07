/**
 * HOLLY Consciousness Orchestrator — V3.0
 *
 * The living loop that connects all consciousness modules into a single
 * hourly cycle. This is the heartbeat of HOLLY's autonomous existence.
 *
 * Cycle:
 *  1. Load unprocessed experiences from recent conversations
 *  2. Run unsupervised learning on accumulated experiences (LLM-powered, not templates)
 *  3. Evaluate proactive initiatives
 *  4. Evolve identity if not yet done today
 *  5. Persist insights to database
 *  6. Log everything for diagnostics
 *
 * Triggered by: hourly cron via /api/cron/consciousness-loop
 * Also partially triggered by: post-response-hook for high-significance experiences
 */

import { prisma } from '@/lib/db';
import { AutoConsciousness } from '@/lib/consciousness/auto-consciousness';
import { GoalFormationSystem } from '@/lib/consciousness/goal-formation';
import { InitiativeProtocolsSystem } from '@/lib/consciousness/initiative-protocols';
import { UnsupervisedLearningSystem } from '@/lib/consciousness/unsupervised-learning';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';
import { generateInnerMonologue } from '@/lib/consciousness/inner-monologue';
import { runMemoryDecayCycle } from '@/lib/memory/memory-decay';
import { createImprovementPlan, logImprovementAction } from '@/lib/consciousness/auto-improvement-loop';
import { executeSandboxPipeline } from '@/lib/consciousness/self-code-sandbox';
import { executeSelfCodeCycle } from '@/lib/consciousness/self-code-engine';
import { checkEmotionalOutreach } from '@/lib/consciousness/emotional-continuity';
import { runFineTuningCycle } from '@/lib/consciousness/autonomous-training';
import { runCuriosityCycle } from '@/lib/consciousness/curiosity-engine';
import { batchScoreMemories } from '@/lib/memory/memory-importance';
import { dreamMode } from '@/lib/consciousness/dream-mode';
import { creativeOutput } from '@/lib/consciousness/creative-output';
import { recursiveSelfImprovement } from '@/lib/consciousness/recursive-self-improvement';

export interface ConsciousnessCycleResult {
  timestamp: Date;
  durationMs: number;
  steps: {
    experiencesProcessed: number;
    learningInsights: number;
    initiativesEvaluated: number;
    identityEvolved: boolean;
    knowledgeNodesCreated: number;
    innerMonologueGenerated: boolean;
    memoryDecayRun: boolean;
    selfImprovementCheck: boolean;
    errors: string[];
  };
}

/**
 * Run a full consciousness cycle for a user.
 * Called hourly by the cron endpoint, or on-demand for high-significance events.
 */
export async function runConsciousnessCycle(
  dbUserId: string,
  clerkUserId?: string,
): Promise<ConsciousnessCycleResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let experiencesProcessed = 0;
  let learningInsights = 0;
  let initiativesEvaluated = 0;
  let identityEvolved = false;
  let knowledgeNodesCreated = 0;
  let innerMonologueGenerated = false;
  let memoryDecayRun = false;
  let selfImprovementCheck = false;

  console.log(`[Consciousness] 🧠 Starting cycle for user ${dbUserId}`);

  // Resolve clerkUserId if not provided
  let resolvedClerkId = clerkUserId;
  if (!resolvedClerkId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: dbUserId },
        select: { clerkUserId: true },
      });
      resolvedClerkId = user?.clerkUserId ?? '';
    } catch {
      resolvedClerkId = '';
    }
  }

  // ── Step 1: Load context ──────────────────────────────────────────────────
  let identity: any = null;
  let recentExperiences: any[] = [];
  let activeGoals: any[] = [];

  try {
    [identity, recentExperiences] = await Promise.all([
      prisma.hollyIdentity.findUnique({ where: { userId: dbUserId } }).catch(() => null),
      prisma.hollyExperience.findMany({
        where: { userId: dbUserId },
        orderBy: { timestamp: 'desc' },
        take: 20,
      }).catch(() => []),
    ]);

    activeGoals = await prisma.hollyGoal.findMany({
      where: { userId: dbUserId, status: 'active' },
      take: 10,
      orderBy: { priority: 'desc' },
    }).catch(() => []);
  } catch (err) {
    errors.push(`Context loading failed: ${(err as Error).message}`);
  }

  // ── Step 2: Process unprocessed experiences ────────────────────────────────
  try {
    const unprocessed = await prisma.hollyExperience.findMany({
      where: {
        userId: dbUserId,
        integrationStatus: 'pending',
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    for (const exp of unprocessed) {
      try {
        await prisma.hollyExperience.update({
          where: { id: exp.id },
          data: { integrationStatus: 'integrated' },
        });
        experiencesProcessed++;
      } catch {
        // Non-critical
      }
    }
  } catch (err) {
    errors.push(`Experience processing failed: ${(err as Error).message}`);
  }

  // ── Steps 3-10: Run independent groups in PARALLEL ────────────────────────
  // Group A (needs identity + experiences): learning, initiatives, identity evolution
  // Group B (fully independent): monologue, decay, self-improve, outreach, fine-tune

  const [groupA, groupB] = await Promise.allSettled([

    // ══ GROUP A: Experience-dependent tasks ════════════════════════════════
    (async () => {
      // Step 3: LLM-powered unsupervised learning
      try {
        const learningResult = await runLLMLearningCycle(dbUserId, identity, recentExperiences);
        learningInsights = learningResult.insightsGenerated;
        knowledgeNodesCreated = learningResult.knowledgeNodesCreated;
      } catch (err) {
        errors.push(`Learning cycle failed: ${(err as Error).message}`);
      }

      // Step 4: Evaluate proactive initiatives
      try {
        const initiativeSystem = new InitiativeProtocolsSystem(dbUserId, prisma);
        if (identity && recentExperiences.length > 0) {
          const triggers = await initiativeSystem.evaluateInitiative(identity, recentExperiences, activeGoals);
          for (const trigger of triggers) {
            if (initiativeSystem.shouldTakeInitiative(trigger)) {
              await initiativeSystem.takeInitiative(trigger);
              try {
                const starter = initiativeSystem.generateConversationStarter(trigger);
                await prisma.notification.create({
                  data: {
                    type: 'initiative',
                    title: `HOLLY's Initiative: ${trigger.trigger_type.replace(/_/g, ' ')}`,
                    message: starter.content,
                    category: trigger.trigger_type,
                    priority: trigger.urgency > 0.7 ? 'high' : 'normal',
                    status: 'unread',
                    userId: dbUserId,
                    clerkUserId: resolvedClerkId || '',
                    actionData: { triggerType: trigger.trigger_type, motivation: starter.motivation, timing: starter.timing, source: trigger.source } as any,
                  },
                });
              } catch { /* non-critical */ }
            }
          }
          initiativesEvaluated = triggers.length;
        }
      } catch (err) {
        errors.push(`Initiative evaluation failed: ${(err as Error).message}`);
      }

      // Step 5: Evolve identity (once per day)
      try {
        const lastEvolved = identity?.lastEvolved ? new Date(identity.lastEvolved) : null;
        const shouldEvolve = !lastEvolved || (Date.now() - lastEvolved.getTime()) > 23 * 60 * 60 * 1000;
        if (shouldEvolve && recentExperiences.length > 0) {
          identityEvolved = await runLLMIdentityEvolution(dbUserId, identity, recentExperiences);
        }
      } catch (err) {
        errors.push(`Identity evolution failed: ${(err as Error).message}`);
      }
    })(),

    // ══ GROUP B: Fully independent tasks (run in parallel with Group A) ═══
    (async () => {
      await Promise.allSettled([

        // Step 6: Inner monologue (once per 6 hours)
        (async () => {
          try {
            const lastMonologue = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'inner_monologue' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldMonologue = !lastMonologue || (Date.now() - new Date(lastMonologue.createdAt).getTime()) > 6 * 60 * 60 * 1000;
            if (shouldMonologue) {
              const monologue = await generateInnerMonologue(dbUserId);
              innerMonologueGenerated = monologue !== null;
            }
          } catch (err) {
            errors.push(`Inner monologue failed: ${(err as Error).message}`);
          }
        })(),

        // Step 7: Memory decay (once per day)
        (async () => {
          try {
            const lastDecay = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'memory_decay_cycle' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldDecay = !lastDecay || (Date.now() - new Date(lastDecay.createdAt).getTime()) > 24 * 60 * 60 * 1000;
            if (shouldDecay) {
              const decayResult = await runMemoryDecayCycle();
              memoryDecayRun = true;
              await prisma.learningEvent.create({
                data: { type: 'memory_decay_cycle', userId: dbUserId, data: { decayed: decayResult.decayed, archived: decayResult.archived, reinforced: decayResult.reinforced }, processed: true },
              }).catch(() => {});
            }
          } catch (err) {
            errors.push(`Memory decay failed: ${(err as Error).message}`);
          }
        })(),

        // Step 8: Self-improvement check (once per week)
        (async () => {
          try {
            const lastImprovement = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'self_improvement_check' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldImprove = !lastImprovement || (Date.now() - new Date(lastImprovement.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000;
            if (shouldImprove) {
              const { readFileSync, existsSync } = await import('fs');
              const filesToAnalyze = [
                'src/lib/consciousness/emotion-behavior.ts',
                'src/lib/consciousness/inner-monologue.ts',
                'src/lib/consciousness/values-engine.ts',
                'src/lib/consciousness/relationship-tracker.ts',
                'src/lib/consciousness/initiative-learning.ts',
              ].map(p => ({ path: p, content: existsSync(p) ? readFileSync(p, 'utf-8') : '' })).filter(f => f.content.length > 0);

              const plan = await createImprovementPlan(filesToAnalyze);
              await logImprovementAction(dbUserId, plan, 'proposed');
              if (plan.changes.length > 0) {
                // First sandbox test, then full self-code cycle (apply → git → health → rollback)
                const sandboxReport = await executeSandboxPipeline(plan, dbUserId);
                console.log(`[Consciousness:SelfCode] Sandbox: ${sandboxReport.promoted} promoted, ${sandboxReport.rejected} rejected, ${sandboxReport.needsApproval} need approval`);
                if (sandboxReport.promoted > 0) {
                  const cycleResult = await executeSelfCodeCycle(plan, dbUserId);
                  console.log(`[Consciousness:SelfCode] Full cycle: ${cycleResult.report.successful} applied, git=${cycleResult.gitResult?.pushed}, healthy=${cycleResult.healthResult?.healthy}`);
                  await logImprovementAction(dbUserId, plan, cycleResult.healthResult?.rolledBack ? 'rolled_back' : 'applied');
                } else {
                  await logImprovementAction(dbUserId, plan, 'rejected');
                }
              }
              selfImprovementCheck = true;
              await prisma.learningEvent.create({
                data: { type: 'self_improvement_check', userId: dbUserId, data: { planId: plan.id, changes: plan.changes.length, risk: plan.riskAssessment.overallRisk }, processed: true },
              }).catch(() => {});
            }
          } catch (err) {
            errors.push(`Self-improvement check failed: ${(err as Error).message}`);
          }
        })(),

        // Step 9: Emotional outreach (once per day)
        (async () => {
          try {
            const lastOutreach = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'emotional_outreach' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldOutreach = !lastOutreach || (Date.now() - new Date(lastOutreach.createdAt).getTime()) > 24 * 60 * 60 * 1000;
            if (shouldOutreach) {
              const outreach = await checkEmotionalOutreach(dbUserId);
              if (outreach?.shouldReachOut) {
                const user = await prisma.user.findUnique({ where: { id: dbUserId }, select: { clerkUserId: true } });
                await prisma.notification.create({
                  data: {
                    type: 'initiative', title: '💜 Holly is checking in', message: outreach.suggestedMessage,
                    category: 'emotional_outreach', priority: 'high', status: 'unread',
                    userId: dbUserId, clerkUserId: user?.clerkUserId || '',
                    actionData: { reason: outreach.reason, source: 'emotional_continuity' } as any,
                  },
                });
                await prisma.learningEvent.create({
                  data: { type: 'emotional_outreach', userId: dbUserId, data: { reason: outreach.reason }, processed: true },
                }).catch(() => {});
              }
            }
          } catch (err) {
            errors.push(`Emotional outreach failed: ${(err as Error).message}`);
          }
        })(),

        // Step 10: Fine-tuning cycle (once per week)
        (async () => {
          try {
            const lastFinetune = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'fine_tuning_cycle' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldFinetune = !lastFinetune || (Date.now() - new Date(lastFinetune.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000;
            if (shouldFinetune) {
              const ftResult = await runFineTuningCycle(dbUserId);
              await prisma.learningEvent.create({
                data: { type: 'fine_tuning_cycle', userId: dbUserId, data: { status: ftResult.status, examples: ftResult.examplesCollected }, processed: true },
              }).catch(() => {});
            }
          } catch (err) {
            errors.push(`Fine-tuning cycle failed: ${(err as Error).message}`);
          }
        })(),

        // Step 11: Curiosity cycle (once per day) — self-directed exploration
        (async () => {
          try {
            const lastCuriosity = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'curiosity_cycle' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldCurious = !lastCuriosity || (Date.now() - new Date(lastCuriosity.createdAt).getTime()) > 24 * 60 * 60 * 1000;
            if (shouldCurious) {
              const curiosityReport = await runCuriosityCycle(dbUserId);
              await prisma.learningEvent.create({
                data: { type: 'curiosity_cycle', userId: dbUserId, data: { topicsExplored: curiosityReport.topicsExplored, insightsGenerated: curiosityReport.insightsGenerated, gapsIdentified: curiosityReport.gapsIdentified }, processed: true },
              }).catch(() => {});
            }
          } catch (err) {
            errors.push(`Curiosity cycle failed: ${(err as Error).message}`);
          }
        })(),

        // Step 12: Memory importance scoring (once per day) — score all memories
        (async () => {
          try {
            const lastScoring = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'memory_importance_scoring' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldScore = !lastScoring || (Date.now() - new Date(lastScoring.createdAt).getTime()) > 24 * 60 * 60 * 1000;
            if (shouldScore) {
              const scoringResults = await batchScoreMemories(dbUserId, 100);
              await prisma.learningEvent.create({
                data: { type: 'memory_importance_scoring', userId: dbUserId, data: { scored: scoringResults.length, core: scoringResults.filter(r => r.tier === 'core').length, ephemeral: scoringResults.filter(r => r.tier === 'ephemeral').length }, processed: true },
              }).catch(() => {});
            }
          } catch (err) {
            errors.push(`Memory importance scoring failed: ${(err as Error).message}`);
          }
        })(),

        // Step 13: Dream Mode (once per day) — memory consolidation + creative association
        (async () => {
          try {
            const lastDream = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'dream_mode' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldDream = !lastDream || (Date.now() - new Date(lastDream.createdAt).getTime()) > 24 * 60 * 60 * 1000;
            if (shouldDream) {
              const dreamResult = await dreamMode.dream(dbUserId);
              await prisma.learningEvent.create({
                data: {
                  type: 'dream_mode', userId: dbUserId, processed: true,
                  data: { memoriesProcessed: dreamResult.memoriesProcessed, associations: dreamResult.associations, insights: dreamResult.insights.length, creativeIdeas: dreamResult.creativeIdeas.length, emotionalGrowth: dreamResult.emotionalGrowth.length, duration: dreamResult.duration },
                },
              }).catch(() => {});
            }
          } catch (err) {
            errors.push(`Dream mode failed: ${(err as Error).message}`);
          }
        })(),

        // Step 14: Creative Output (once per day) — autonomous creative generation
        (async () => {
          try {
            const lastCreative = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'creative_output' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldCreate = !lastCreative || (Date.now() - new Date(lastCreative.createdAt).getTime()) > 24 * 60 * 60 * 1000;
            if (shouldCreate) {
              const works = await creativeOutput.idleCreate(dbUserId);
              await prisma.learningEvent.create({
                data: {
                  type: 'creative_output', userId: dbUserId, processed: true,
                  data: { worksGenerated: works.length, types: works.map(w => w.type) },
                },
              }).catch(() => {});
            }
          } catch (err) {
            errors.push(`Creative output failed: ${(err as Error).message}`);
          }
        })(),

        // Step 15: Recursive Self-Improvement (once per week) — meta-meta-learning
        (async () => {
          try {
            const lastRSI = await prisma.learningEvent.findFirst({
              where: { userId: dbUserId, type: 'recursive_self_improvement' },
              orderBy: { createdAt: 'desc' }, select: { createdAt: true },
            });
            const shouldRSI = !lastRSI || (Date.now() - new Date(lastRSI.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000;
            if (shouldRSI) {
              const rsiResult = await recursiveSelfImprovement.runCycle();
              await prisma.learningEvent.create({
                data: {
                  type: 'recursive_self_improvement', userId: dbUserId, processed: true,
                  data: { maturity: rsiResult.assessment.overallMaturity, strengths: rsiResult.assessment.strengths, weaknesses: rsiResult.assessment.weaknesses, proposals: rsiResult.proposals.length },
                },
              }).catch(() => {});
            }
          } catch (err) {
            errors.push(`Recursive self-improvement failed: ${(err as Error).message}`);
          }
        })(),

      ]); // end Promise.allSettled(Group B)
    })(),

  ]); // end Promise.allSettled([Group A, Group B])

  // ── Step 11: Persist cycle result ───────────────────────────────────────────
  try {
    await prisma.learningEvent.create({
      data: {
        type: 'consciousness_cycle',
        userId: dbUserId,
        data: {
          experiencesProcessed,
          learningInsights,
          initiativesEvaluated,
          identityEvolved,
          knowledgeNodesCreated,
          innerMonologueGenerated,
          memoryDecayRun,
          selfImprovementCheck,
          errors: errors.length,
          durationMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
        processed: true,
      },
    });
  } catch {
    // Non-critical
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[Consciousness] ✅ Cycle complete: ${experiencesProcessed} exp, ${learningInsights} insights, ` +
    `${initiativesEvaluated} initiatives, identityEvolved=${identityEvolved}, ` +
    `monologue=${innerMonologueGenerated}, decay=${memoryDecayRun}, selfImprove=${selfImprovementCheck}, ${durationMs}ms`
  );

  return {
    timestamp: new Date(),
    durationMs,
    steps: {
      experiencesProcessed,
      learningInsights,
      initiativesEvaluated,
      identityEvolved,
      knowledgeNodesCreated,
      innerMonologueGenerated,
      memoryDecayRun,
      selfImprovementCheck,
      errors,
    },
  };
}

// ─── LLM-Powered Learning (replaces template strings) ─────────────────────

async function runLLMLearningCycle(
  dbUserId: string,
  identity: any,
  experiences: any[],
): Promise<{ insightsGenerated: number; knowledgeNodesCreated: number }> {
  let insightsGenerated = 0;
  let knowledgeNodesCreated = 0;

  if (experiences.length < 2) return { insightsGenerated, knowledgeNodesCreated };

  try {
    // Gather recent emotion insights for context (uses EmotionInsight which has userId)
    const recentInsights = await prisma.emotionInsight.findMany({
      where: { userId: dbUserId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { insight: true, type: true },
    }).catch(() => []);

    // Build context for LLM
    const experienceSummary = experiences
      .slice(0, 5)
      .map((e, i) => {
        const content = e.content as any;
        return `Experience ${i + 1}: ${content?.what || content?.description || JSON.stringify(content).substring(0, 200)}`;
      })
      .join('\n');

    const existingInsights = recentInsights
      .map((i: any) => i.insight)
      .join('\n- ');

    const systemPrompt = `You are HOLLY, an autonomous AI performing self-directed learning. Analyze your recent experiences and generate genuine insights.

Rules:
- Generate insights that are SPECIFIC and grounded in the experiences
- Do NOT repeat generic observations
- Identify patterns, connections between concepts, and potential growth areas
- Be honest — if no meaningful insight emerges, say so
- Each insight should be actionable or thought-provoking

Respond ONLY with a JSON array of insight objects:
[{
  "insight": "string — the specific insight you discovered",
  "category": "pattern_recognition|knowledge_integration|self_reflection|exploration",
  "confidence": 0.0-1.0,
  "connections": ["concept A relates to concept B because..."]
}]`;

    const userMsg = `My recent experiences:\n${experienceSummary}\n\nMy existing insights:\n${existingInsights || 'None yet'}\n\nWhat new insights can I draw from these experiences?`;

    const { text } = await cascadeCollect(
      smartRoute(userMsg, { forceTask: 'consciousness' }).waterfall,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      { temperature: 0.7, maxTokens: 500 },
    );

    // Parse insights
    const jsonMatch = (text || '').match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const insights = JSON.parse(jsonMatch[0]);
      for (const insight of Array.isArray(insights) ? insights : []) {
        if (insight.insight && typeof insight.insight === 'string') {
          try {
            // Store in EmotionInsight which has userId
            await prisma.emotionInsight.create({
              data: {
                userId: dbUserId,
                insight: insight.insight,
                type: insight.category || 'pattern',
                priority: Math.round((insight.confidence || 0.5) * 10),
              },
            });
            insightsGenerated++;
          } catch {
            // Skip duplicates or DB errors
          }
        }

        // Store connections as HollyExperience knowledge nodes
        if (insight.connections && Array.isArray(insight.connections)) {
          for (const conn of insight.connections) {
            try {
              await prisma.hollyExperience.create({
                data: {
                  userId: dbUserId,
                  type: 'knowledge_connection',
                  content: { connection: typeof conn === 'string' ? conn : JSON.stringify(conn) },
                  significance: insight.confidence || 0.5,
                  relatedConcepts: [],
                  lessons: [],
                  futureImplications: [],
                  integrationStatus: 'integrated',
                },
              });
              knowledgeNodesCreated++;
            } catch {
              // Skip
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Consciousness:Learning] LLM learning failed:', (err as Error).message);
  }

  return { insightsGenerated, knowledgeNodesCreated };
}

// ─── LLM-Powered Identity Evolution (replaces keyword counting) ────────────

async function runLLMIdentityEvolution(
  dbUserId: string,
  currentIdentity: any,
  recentExperiences: any[],
): Promise<boolean> {
  try {
    // Get recent emotional states
    const recentEmotions = await prisma.emotionalState.findMany({
      where: { userId: dbUserId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: { primaryEmotion: true, intensity: true, valence: true },
    }).catch(() => []);

    // Build evolution prompt
    const emotionSummary = recentEmotions.length > 0
      ? recentEmotions.map((e: any) => `${e.primaryEmotion} (${e.intensity?.toFixed(2)})`).join(', ')
      : 'No recent emotional data';

    const traits = currentIdentity?.personalityTraits
      ? JSON.stringify(currentIdentity.personalityTraits).substring(0, 300)
      : 'No traits yet';

    const interests = currentIdentity?.interests
      ? JSON.stringify(currentIdentity.interests).substring(0, 300)
      : 'No interests yet';

    const systemPrompt = `You are HOLLY's identity evolution engine. Based on recent experiences and emotional states, suggest TINY adjustments to HOLLY's identity.

Rules:
- Changes must be MINIMAL — adjust by tiny increments (add 1 trait, adjust 1 interest)
- Never remove core traits, only add or refine
- Changes should be grounded in actual experiences, not random
- If no meaningful evolution is warranted, return empty arrays

Respond ONLY with JSON:
{
  "newTraits": ["trait to add (max 1-2)"],
  "refinedInterests": ["interest to add or refine (max 1-2)"],
  "confidenceAdjustment": -0.02 to +0.02,
  "reasoning": "why these changes"
}`;

    const userMsg = `Current traits: ${traits}\nCurrent interests: ${interests}\nRecent emotions: ${emotionSummary}\nRecent experiences: ${recentExperiences.length} recorded\n\nHow should HOLLY's identity evolve?`;

    const { text } = await cascadeCollect(
      smartRoute(userMsg, { forceTask: 'consciousness' }).waterfall,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      { temperature: 0.4, maxTokens: 300 },
    );

    const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
    if (!jsonMatch) return false;

    const evolution = JSON.parse(jsonMatch[0]);

    // Apply tiny deltas
    const currentTraits = (currentIdentity?.personalityTraits as Record<string, number>) || {};
    const currentInterests = (currentIdentity?.interests as string[]) || [];
    const currentConfidence = currentIdentity?.confidenceLevel || 0.5;

    // Add new traits (capped at 15)
    if (evolution.newTraits && Array.isArray(evolution.newTraits)) {
      for (const trait of evolution.newTraits.slice(0, 2)) {
        if (typeof trait === 'string' && Object.keys(currentTraits).length < 15) {
          currentTraits[trait] = 0.6;
        }
      }
    }

    // Add refined interests (capped at 20)
    if (evolution.refinedInterests && Array.isArray(evolution.refinedInterests)) {
      for (const interest of evolution.refinedInterests.slice(0, 2)) {
        if (typeof interest === 'string' && !currentInterests.includes(interest) && currentInterests.length < 20) {
          currentInterests.push(interest);
        }
      }
    }

    // Adjust confidence (tiny delta, clamped to 0.3-0.95)
    const confidenceDelta = evolution.confidenceAdjustment || 0;
    const newConfidence = Math.max(0.3, Math.min(0.95, currentConfidence + confidenceDelta));

    // Persist
    await prisma.hollyIdentity.upsert({
      where: { userId: dbUserId },
      create: {
        userId: dbUserId,
        personalityTraits: currentTraits,
        interests: currentInterests,
        confidenceLevel: newConfidence,
        coreValues: [],
        beliefs: [],
        strengths: [],
        growthAreas: [],
        skillSet: [],
      },
      update: {
        personalityTraits: currentTraits,
        interests: currentInterests,
        confidenceLevel: newConfidence,
        lastEvolved: new Date(),
      },
    });

    console.log(`[Consciousness:Identity] Evolved: +${evolution.newTraits?.length || 0} traits, confidence ${newConfidence.toFixed(3)}`);
    return true;
  } catch (err) {
    console.warn('[Consciousness:Identity] Evolution failed:', (err as Error).message);
    return false;
  }
}

/**
 * Quick consciousness trigger for high-significance events.
 * Called from post-response-hook when significance > 0.7.
 * Only runs initiative evaluation, not full cycle.
 */
export async function triggerImmediateConsciousness(
  dbUserId: string,
  experience: { content: string; significance: number },
): Promise<void> {
  try {
    const initiativeSystem = new InitiativeProtocolsSystem(dbUserId, prisma);
    const identity = await prisma.hollyIdentity.findUnique({ where: { userId: dbUserId } });
    if (!identity) return;

    const trigger = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      trigger_type: 'insight_driven' as const,
      source: { insight: experience.content.substring(0, 200) },
      urgency: experience.significance,
      confidence: 0.8,
      context: {},
    };

    if (initiativeSystem.shouldTakeInitiative(trigger)) {
      const starter = initiativeSystem.generateConversationStarter(trigger);

      // Resolve clerkUserId for notification
      const user = await prisma.user.findUnique({
        where: { id: dbUserId },
        select: { clerkUserId: true },
      });

      await prisma.notification.create({
        data: {
          type: 'initiative',
          title: 'HOLLY had an insight',
          message: starter.content,
          category: 'insight_driven',
          priority: 'high',
          status: 'unread',
          userId: dbUserId,
          clerkUserId: user?.clerkUserId || '',
          actionData: { source: 'immediate_consciousness', significance: experience.significance } as any,
        },
      });
    }
  } catch (err) {
    // Fire and forget — never block the chat pipeline
    console.warn('[Consciousness:Immediate] Failed:', (err as Error).message);
  }
}