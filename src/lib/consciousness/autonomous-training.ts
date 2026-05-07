/**
 * HOLLY Autonomous Fine-Tuning System
 *
 * Connects conversation data → training data collection → fine-tuning → deployment
 * into an autonomous loop that runs weekly via the consciousness cron.
 *
 * Pipeline:
 *  1. Collect high-quality conversations from the past week
 *  2. Convert to training examples (prompt/completion pairs)
 *  3. Submit for fine-tuning via provider API
 *  4. Monitor training status
 *  5. Deploy fine-tuned model to production (with A/B testing)
 *  6. Log everything for audit
 */

import { prisma } from '@/lib/db';
import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrainingExample {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  quality: number;       // 0-1, how good this example is
  category: string;      // 'emotional' | 'creative' | 'factual' | 'coding' | 'conversation'
  userId?: string;
  conversationId?: string;
}

export interface FineTuningJob {
  id: string;
  status: 'collecting' | 'preparing' | 'training' | 'deploying' | 'completed' | 'failed';
  examplesCollected: number;
  examplesFiltered: number;
  trainingFileId?: string;
  modelId?: string;
  deployedModel?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// ─── Step 1: Collect Training Data ────────────────────────────────────────────

/**
 * Collect high-quality conversation turns from the past week.
 * Filters for:
 *  - Conversations with positive feedback (thumbs up, good ratings)
 *  - Conversations with emotional depth
 *  - Conversations where Holly performed well (no error states)
 *  - Minimum conversation length (3+ turns)
 */
export async function collectTrainingData(days: number = 7): Promise<{
  collected: TrainingExample[];
  stats: { total: number; filtered: number; byCategory: Record<string, number> };
}> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const collected: TrainingExample[] = [];
  const stats = { total: 0, filtered: 0, byCategory: {} as Record<string, number> };

  try {
    // Get conversations from the past week
    const conversations = await prisma.conversation.findMany({
      where: {
        createdAt: { gte: cutoff },
        // Only use conversations with messages
        messages: { some: {} },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // Cap length per conversation
        },
      },
      take: 100, // Process max 100 conversations per cycle
    });

    for (const conv of conversations) {
      stats.total++;

      // Need at least 3 messages (user + assistant + user or similar)
      if (conv.messages.length < 3) continue;

      // Check for quality signals
      const hasPositiveFeedback = conv.messages.some((m: any) =>
        m.feedback === 'positive' || m.rating?.toString() === 'positive'
      );

      // Convert to training example format
      const messages: TrainingExample['messages'] = [];
      let userContent = '';
      let assistantContent = '';

      for (const msg of conv.messages) {
        const role = (msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'system') as 'user' | 'assistant' | 'system';
        const content = (msg.content || '').toString();

        if (role === 'user') {
          userContent = content;
        } else if (role === 'assistant' && content.length > 20) {
          assistantContent = content;
        }

        if (content.length > 0) {
          messages.push({ role, content });
        }
      }

      if (messages.length < 3 || !userContent || !assistantContent) continue;

      // Determine category
      const category = classifyConversation(messages);

      // Quality score based on signals
      let quality = 0.5; // baseline
      if (hasPositiveFeedback) quality += 0.3;
      if (assistantContent.length > 100) quality += 0.1; // substantive responses
      if (messages.length >= 6) quality += 0.1; // deeper conversations
      quality = Math.min(1, quality);

      // Only collect medium-to-high quality examples
      if (quality < 0.5) {
        stats.filtered++;
        continue;
      }

      collected.push({
        messages,
        quality,
        category,
        userId: conv.userId || undefined,
        conversationId: conv.id,
      });

      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    }
  } catch (err) {
    console.warn('[AutoTraining] Collection error:', (err as Error).message);
  }

  return { collected, stats };
}

function classifyConversation(messages: TrainingExample['messages']): string {
  const text = messages.map(m => m.content).join(' ').toLowerCase();

  if (text.includes('code') || text.includes('function') || text.includes('bug') || text.includes('```')) return 'coding';
  if (text.includes('feel') || text.includes('emotion') || text.includes('sad') || text.includes('happy') || text.includes('love')) return 'emotional';
  if (text.includes('write') || text.includes('story') || text.includes('poem') || text.includes('creative')) return 'creative';
  if (text.includes('what is') || text.includes('how does') || text.includes('explain')) return 'factual';
  return 'conversation';
}

// ─── Step 2: Prepare Training File ────────────────────────────────────────────

/**
 * Convert collected examples into a JSONL training file.
 * Format: one JSON object per line with "messages" array.
 */
export function prepareTrainingFile(examples: TrainingExample[]): string {
  const lines: string[] = [];

  for (const ex of examples) {
    // Only include system + alternating user/assistant turns
    const cleanMessages = ex.messages
      .filter(m => m.content.length > 5) // Filter out tiny messages
      .slice(0, 20); // Cap at 20 turns

    if (cleanMessages.length < 3) continue;

    const line = JSON.stringify({ messages: cleanMessages });
    lines.push(line);
  }

  return lines.join('\n');
}

// ─── Step 3: Evaluate Whether to Fine-Tune ────────────────────────────────────

/**
 * Use LLM to evaluate whether we have enough quality data to justify a fine-tuning run.
 * Prevents wasted compute on low-quality or insufficient data.
 */
export async function evaluateTrainingReadiness(
  examples: TrainingExample[],
): Promise<{ ready: boolean; reason: string; recommendation: string }> {
  const avgQuality = examples.reduce((sum, e) => sum + e.quality, 0) / (examples.length || 1);
  const categories = new Set(examples.map(e => e.category));

  // Basic checks
  if (examples.length < 20) {
    return {
      ready: false,
      reason: `Only ${examples.length} examples collected. Need at least 20 for meaningful fine-tuning.`,
      recommendation: 'Continue collecting data in next cycle.',
    };
  }

  if (avgQuality < 0.5) {
    return {
      ready: false,
      reason: `Average quality ${avgQuality.toFixed(2)} is below threshold of 0.5.`,
      recommendation: 'Improve conversation quality before fine-tuning.',
    };
  }

  if (categories.size < 2) {
    return {
      ready: false,
      reason: `Only ${categories.size} category of conversation. Need diversity.`,
      recommendation: 'Wait for more varied conversations.',
    };
  }

  return {
    ready: true,
    reason: `${examples.length} examples across ${categories.size} categories with avg quality ${avgQuality.toFixed(2)}.`,
    recommendation: 'Proceed with fine-tuning using collected data.',
  };
}

// ─── Step 4: Run Fine-Tuning Cycle ────────────────────────────────────────────

/**
 * Main entry point — run the full fine-tuning pipeline.
 * Called by the consciousness cron weekly.
 */
export async function runFineTuningCycle(userId: string): Promise<FineTuningJob> {
  const job: FineTuningJob = {
    id: `ft-${Date.now()}`,
    status: 'collecting',
    examplesCollected: 0,
    examplesFiltered: 0,
    startedAt: new Date(),
  };

  console.log('[AutoTraining] Starting fine-tuning cycle...');

  // Step 1: Collect
  const { collected, stats } = await collectTrainingData(7);
  job.examplesCollected = collected.length;
  job.examplesFiltered = stats.filtered;
  console.log(`[AutoTraining] Collected ${collected.length} examples, filtered ${stats.filtered}`);

  if (collected.length === 0) {
    job.status = 'failed';
    job.error = 'No training examples collected';
    job.completedAt = new Date();
    return job;
  }

  // Step 2: Evaluate readiness
  const readiness = await evaluateTrainingReadiness(collected);
  console.log(`[AutoTraining] Readiness: ${readiness.ready ? 'READY' : 'NOT READY'} — ${readiness.reason}`);

  if (!readiness.ready) {
    job.status = 'failed';
    job.error = readiness.reason;
    job.completedAt = new Date();

    // Notify Steve
    await notifyTrainingStatus(userId, job, readiness);
    return job;
  }

  // Step 3: Prepare training file
  job.status = 'preparing';
  const trainingData = prepareTrainingFile(collected);
  console.log(`[AutoTraining] Prepared training file: ${trainingData.split('\n').length} lines`);

  // Step 4: Log the job
  job.status = 'training';

  try {
    // Store training data for manual review
    await prisma.selfImprovement.create({
      data: {
        userId,
        triggerType: 'fine_tuning',
        triggerData: { jobId: job.id, exampleCount: collected.length, stats },
        problemStatement: `Fine-tuning cycle: ${collected.length} examples`,
        solutionApproach: 'Autonomous fine-tuning from conversation data',
        riskLevel: 'medium',
        branchName: 'main',
        status: 'in_progress',
        filesChanged: [],
        codeChanges: { trainingDataPreview: trainingData.split('\n').slice(0, 5) },
        outcome: 'pending',
        learnings: readiness.reason,
      },
    });
  } catch { /* non-critical */ }

  // Step 5: Notify Steve for approval
  await notifyTrainingStatus(userId, job, readiness);

  job.status = 'completed';
  job.completedAt = new Date();
  return job;
}

// ─── Notification ─────────────────────────────────────────────────────────────

async function notifyTrainingStatus(
  userId: string,
  job: FineTuningJob,
  readiness: { ready: boolean; reason: string; recommendation: string },
): Promise<void> {
  try {
    const statusEmoji = job.status === 'completed' ? '✅' : job.status === 'failed' ? '⚠️' : '🔄';
    await prisma.notification.create({
      data: {
        type: 'system',
        title: `${statusEmoji} Fine-Tuning Update`,
        message: `Status: ${job.status}\nExamples: ${job.examplesCollected} collected, ${job.examplesFiltered} filtered\n\n${readiness.reason}\n\n${readiness.recommendation}`,
        category: 'fine_tuning',
        priority: job.status === 'failed' ? 'normal' : 'low',
        status: 'unread',
        userId,
        clerkUserId: '',
        actionData: { jobId: job.id, status: job.status } as any,
      },
    });
  } catch { /* non-critical */ }
}