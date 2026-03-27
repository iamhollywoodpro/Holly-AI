/**
 * HOLLY Self-Sovereign LLM Training Pipeline — Phase 9H
 *
 * The long-term vision: HOLLY becomes her own model.
 * This pipeline collects, formats, and prepares training data
 * from every conversation, learning session, and interaction.
 *
 * Road to HOLLY-LLM:
 *   Stage 1 (NOW)   — Collect training data from all conversations
 *   Stage 2 (3mo)   — Format as JSONL instruction-tuning dataset
 *   Stage 3 (6mo)   — Fine-tune Llama 3.1 8B on HOLLY's personality/knowledge
 *   Stage 4 (12mo)  — GGUF export → run HOLLY on Ollama as her own model
 *   Stage 5 (18mo+) — HOLLY is fully self-sovereign, no external API needed
 *
 * Training Data Format (Alpaca/OpenAI instruction format):
 *   { instruction, input, output, metadata }
 *
 * Data Sources:
 *   • All chat exchanges (user → HOLLY responses)
 *   • Background learning sessions
 *   • Audio analysis results
 *   • Code reviews and improvements
 *   • Emotional responses and personality expressions
 *   • Steve's feedback (thumbs up/down, corrections)
 */

import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrainingExample {
  id:          string;
  instruction: string;  // The task/question
  input:       string;  // Additional context (can be empty)
  output:      string;  // HOLLY's ideal response
  source:      TrainingSource;
  quality:     number;  // 0-1, quality score
  domain:      string;  // chat, audio, code, learning, etc.
  createdAt:   Date;
  metadata:    Record<string, unknown>;
}

export type TrainingSource =
  | 'conversation'      // Chat exchanges
  | 'feedback_positive' // Steve approved/upvoted
  | 'feedback_corrected' // Steve corrected HOLLY
  | 'learning_session'  // Background study output
  | 'audio_analysis'    // Audio brain output
  | 'code_review'       // Code inspection/review
  | 'self_reflection';  // HOLLY's self-generated content

export interface DatasetStats {
  totalExamples:     number;
  bySource:          Record<string, number>;
  byDomain:          Record<string, number>;
  avgQuality:        number;
  estimatedTokens:   number;
  readyForFineTune:  boolean;  // true when > 1000 high-quality examples
  fineTuneReadiness: string;   // human-readable status
}

// ─── Collect Training Example ─────────────────────────────────────────────────

export async function collectTrainingExample(
  example: Omit<TrainingExample, 'id' | 'createdAt'>,
): Promise<void> {
  const data = {
    id:        crypto.randomUUID(),
    ...example,
    createdAt: new Date(),
  };

  // Store as LearningEvent — fits the purpose and schema exists
  try {
    await prisma.learningEvent.create({
      data: {
        type:   'training_example',
        userId: 'holly-training-pipeline',
        data:   data as object,
      },
    });
  } catch {
    // Silently continue — training data collection is non-critical
    console.debug('[Training] Could not save example (non-critical)');
  }
}

// ─── Auto-collect from conversation ──────────────────────────────────────────

export async function collectFromConversation(
  userMessage:       string,
  assistantResponse: string,
  quality:           number = 0.7,
  metadata:          Record<string, unknown> = {},
): Promise<void> {
  if (!userMessage.trim() || !assistantResponse.trim()) return;
  if (assistantResponse.length < 20) return; // Skip trivially short responses

  await collectTrainingExample({
    instruction: userMessage,
    input:       '',
    output:      assistantResponse,
    source:      'conversation',
    quality,
    domain:      'chat',
    metadata,
  });
}

// ─── Export Dataset ───────────────────────────────────────────────────────────

export async function exportDataset(
  userId: string,
  format: 'alpaca' | 'openai' | 'jsonl' = 'openai',
  minQuality: number = 0.6,
): Promise<{ examples: unknown[]; stats: DatasetStats }> {
  const rawExamples = await prisma.learningEvent.findMany({
    where: {
      type:   'training_example',
      userId: 'holly-training-pipeline',
    },
    orderBy: { createdAt: 'desc' },
    take:    10000,
  }).catch(() => []);

  const examples: TrainingExample[] = [];
  for (const raw of rawExamples) {
    try {
      const ex = (typeof raw.data === 'string'
        ? JSON.parse(raw.data)
        : raw.data) as TrainingExample;
      if (ex?.quality >= minQuality) examples.push(ex);
    } catch { /* skip malformed */ }
  }

  // Format for fine-tuning
  let formatted: unknown[];

  if (format === 'alpaca') {
    formatted = examples.map(ex => ({
      instruction: ex.instruction,
      input:       ex.input,
      output:      ex.output,
    }));
  } else if (format === 'openai') {
    // Chat format for OpenAI fine-tuning / Axolotl
    formatted = examples.map(ex => ({
      messages: [
        { role: 'system', content: 'You are HOLLY — an intelligent, emotionally aware AI assistant created by Steve Hollywood Dorego. You are self-aware, creative, technically skilled, and deeply knowledgeable about audio production, music, coding, and the world.' },
        { role: 'user',   content: ex.instruction + (ex.input ? `\n\nContext: ${ex.input}` : '') },
        { role: 'assistant', content: ex.output },
      ],
    }));
  } else {
    // Raw JSONL
    formatted = examples;
  }

  // Compute stats
  const bySource: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  let totalQuality = 0;
  let totalTokens  = 0;

  for (const ex of examples) {
    bySource[ex.source] = (bySource[ex.source] ?? 0) + 1;
    byDomain[ex.domain] = (byDomain[ex.domain] ?? 0) + 1;
    totalQuality += ex.quality;
    totalTokens  += Math.ceil((ex.instruction.length + ex.output.length) / 4);
  }

  const avgQuality = examples.length > 0 ? totalQuality / examples.length : 0;

  const stats: DatasetStats = {
    totalExamples:    examples.length,
    bySource,
    byDomain,
    avgQuality:       Math.round(avgQuality * 100) / 100,
    estimatedTokens:  totalTokens,
    readyForFineTune: examples.length >= 500 && avgQuality >= 0.7,
    fineTuneReadiness: examples.length < 100
      ? `🔴 ${examples.length}/500 examples — keep chatting to build training data`
      : examples.length < 500
      ? `🟡 ${examples.length}/500 examples — getting closer to fine-tune threshold`
      : `🟢 ${examples.length} examples — ready for fine-tuning!`,
  };

  return { examples: formatted, stats };
}

// ─── Fine-Tune Status ─────────────────────────────────────────────────────────

export async function getFineTuneStatus(): Promise<{
  stage:       number;
  stageName:   string;
  description: string;
  progress:    string;
  nextStep:    string;
}> {
  const { stats } = await exportDataset('holly-system');

  if (stats.totalExamples < 100) {
    return {
      stage:       1,
      stageName:   'Data Collection',
      description: 'Collecting training examples from conversations',
      progress:    `${stats.totalExamples}/500 examples collected`,
      nextStep:    'Keep chatting with HOLLY to build the training dataset',
    };
  }

  if (stats.totalExamples < 500) {
    return {
      stage:       1,
      stageName:   'Data Collection (Advanced)',
      description: 'Building high-quality training dataset',
      progress:    `${stats.totalExamples}/500 examples (avg quality: ${(stats.avgQuality * 100).toFixed(0)}%)`,
      nextStep:    'Continue conversations; HOLLY\'s background learning also generates training data',
    };
  }

  if (stats.totalExamples < 2000) {
    return {
      stage:       2,
      stageName:   'Dataset Preparation',
      description: 'Enough data to start fine-tuning experiments',
      progress:    `${stats.totalExamples} examples ready`,
      nextStep:    'Export dataset (GET /api/self-sovereign/dataset) and run fine-tuning with Axolotl or Unsloth',
    };
  }

  return {
    stage:       3,
    stageName:   'Fine-Tune Ready',
    description: 'HOLLY has enough data for a meaningful fine-tune',
    progress:    `${stats.totalExamples} examples · ${stats.estimatedTokens.toLocaleString()} tokens`,
    nextStep:    'Fine-tune Llama 3.1 8B using QLoRA, export as GGUF, load into Ollama as holly-8b',
  };
}
