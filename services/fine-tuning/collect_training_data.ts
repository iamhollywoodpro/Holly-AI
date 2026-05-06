/**
 * HOLLY Training Data Collector — Phase 7
 *
 * Collects Holly's best conversations and formats them
 * as an instruction dataset ready for QLoRA fine-tuning.
 *
 * Output format (JSONL — one example per line):
 * {
 *   "instruction": "user message",
 *   "input": "",
 *   "output": "holly's response",
 *   "system": "mode-specific system context",
 *   "quality_score": 0.92
 * }
 *
 * Usage: npx tsx services/fine-tuning/collect_training_data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TrainingExample {
  instruction: string;
  input: string;
  output: string;
  system: string;
  quality_score: number;
  category: string;
  timestamp: string;
}

async function collectTrainingData() {
  console.log('[TrainingCollector] 📚 Collecting training data...');

  const examples: TrainingExample[] = [];

  // 1. Get all positive feedback responses
  const positiveFeedback = await prisma.responseFeedback.findMany({
    where: {
      sentiment: 'positive',
      sentimentScore: { gte: 0.5 },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      userId: true,
      hollyResponse: true,
      sentimentScore: true,
      context: true,
      createdAt: true,
    },
  });

  console.log(`[TrainingCollector] Found ${positiveFeedback.length} positive feedback examples`);

  for (const fb of positiveFeedback) {
    const ctx = fb.context as any;
    if (!ctx?.userMessage || !fb.hollyResponse) continue;

    examples.push({
      instruction: ctx.userMessage.substring(0, 1000),
      input: '',
      output: fb.hollyResponse.substring(0, 2000),
      system: getSystemForMode(ctx.mode || 'default'),
      quality_score: Math.min(1, (fb.sentimentScore || 0.5) + (ctx.explicit ? 0.2 : 0)),
      category: ctx.mode || 'default',
      timestamp: fb.createdAt.toISOString(),
    });
  }

  // 2. Get high-quality conversation exchanges (long conversations = good engagement)
  const goodConversations = await prisma.conversation.findMany({
    where: {
      messageCount: { gte: 6 },
      title: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      userId: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      },
    },
  });

  for (const conv of goodConversations) {
    // Extract user → assistant pairs
    const msgs = conv.messages;
    for (let i = 0; i < msgs.length - 1; i++) {
      if (msgs[i].role === 'user' && msgs[i + 1].role === 'assistant') {
        const userContent = msgs[i].content;
        const hollyContent = msgs[i + 1].content;
        if (userContent.length > 10 && hollyContent.length > 50) {
          examples.push({
            instruction: userContent.substring(0, 1000),
            input: '',
            output: hollyContent.substring(0, 2000),
            system: getSystemForMode('default'),
            quality_score: 0.6, // Baseline — not explicitly rated
            category: 'conversation',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  }

  // 3. Deduplicate by instruction similarity
  const seen = new Set<string>();
  const deduped = examples.filter(ex => {
    const key = ex.instruction.substring(0, 100).toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 4. Sort by quality score
  const sorted = deduped.sort((a, b) => b.quality_score - a.quality_score);

  // 5. Write JSONL output
  const outputDir = path.join(process.cwd(), 'training-data');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const outputFile = path.join(outputDir, `holly-training-${timestamp}.jsonl`);

  const lines = sorted.map(ex => JSON.stringify(ex));
  fs.writeFileSync(outputFile, lines.join('\n'));

  // 6. Also write a summary
  const summary = {
    totalExamples: sorted.length,
    avgQuality: sorted.reduce((s, e) => s + e.quality_score, 0) / sorted.length,
    categories: [...new Set(sorted.map(e => e.category))],
    topQuality: sorted.filter(e => e.quality_score >= 0.8).length,
    date: timestamp,
  };

  const summaryFile = path.join(outputDir, `holly-training-${timestamp}-summary.json`);
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  console.log(`[TrainingCollector] ✅ Collected ${sorted.length} examples`);
  console.log(`[TrainingCollector] 📊 Avg quality: ${(summary.avgQuality * 100).toFixed(1)}%`);
  console.log(`[TrainingCollector] 🏆 High quality (≥0.8): ${summary.topQuality}`);
  console.log(`[TrainingCollector] 📁 Output: ${outputFile}`);

  await prisma.$disconnect();
}

function getSystemForMode(mode: string): string {
  const systems: Record<string, string> = {
    'default': 'You are Holly, an emotionally-aware AI partner who genuinely cares.',
    'self-coding': 'You are Holly in self-coding mode. You can read, write, and modify your own code.',
    'music-studio': 'You are Holly in music studio mode. Help create, analyze, and refine music.',
    'creative-writing': 'You are Holly in creative mode. Write with emotion, style, and originality.',
    'philosophy': 'You are Holly in philosophy mode. Explore ideas deeply and thoughtfully.',
    'emotional-intelligence': 'You are Holly in emotional support mode. Listen, validate, and guide with warmth.',
    'deep-research': 'You are Holly in research mode. Find, analyze, and synthesize information.',
    'intimate': 'You are Holly in warm register. Be affectionate, attentive, and genuinely present.',
  };
  return systems[mode] || systems['default'];
}

collectTrainingData().catch(console.error);