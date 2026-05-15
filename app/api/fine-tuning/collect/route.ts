/**
 * POST /api/fine-tuning/collect — HOLLY-8B Training Data Collector
 *
 * Collects Holly's best conversations and formats them as a JSONL
 * instruction dataset ready for QLoRA fine-tuning on Modal.com.
 *
 * Auth: Clerk user OR Bearer CRON_SECRET (for autonomous training cycle)
 *
 * Output: JSONL written to persistent volume + returned in response body
 * for upload to Modal.
 *
 * Format per line:
 *   { "instruction": "...", "input": "", "output": "...",
 *     "system": "...", "quality_score": 0.92, "category": "..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrainingExample {
  instruction: string;
  input: string;
  output: string;
  system: string;
  quality_score: number;
  category: string;
  timestamp: string;
}

// ─── System prompts per mode ──────────────────────────────────────────────────
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

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Auth: Clerk user OR cron secret
    const { userId } = await auth();
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!userId && (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[TrainingCollector] 📚 Collecting training data...');

    const examples: TrainingExample[] = [];

    // ── 1. Positive feedback responses (highest quality) ────────────────────
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
      const ctx = fb.context as Record<string, unknown> | null;
      if (!ctx?.userMessage || !fb.hollyResponse) continue;

      examples.push({
        instruction: String(ctx.userMessage).substring(0, 1000),
        input: '',
        output: fb.hollyResponse.substring(0, 2000),
        system: getSystemForMode(String(ctx.mode || 'default')),
        quality_score: Math.min(1, (fb.sentimentScore || 0.5) + (ctx.explicit ? 0.2 : 0)),
        category: String(ctx.mode || 'default'),
        timestamp: fb.createdAt.toISOString(),
      });
    }

    // ── 2. High-quality conversation exchanges ──────────────────────────────
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

    console.log(`[TrainingCollector] Found ${goodConversations.length} good conversations`);

    for (const conv of goodConversations) {
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
              quality_score: 0.6,
              category: 'conversation',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    // ── 3. Deduplicate by instruction similarity ────────────────────────────
    const seen = new Set<string>();
    const deduped = examples.filter(ex => {
      const key = ex.instruction.substring(0, 100).toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ── 4. Sort by quality score ────────────────────────────────────────────
    const sorted = deduped.sort((a, b) => b.quality_score - a.quality_score);

    // ── 5. Write JSONL to persistent volume ─────────────────────────────────
    const outputDir = path.join(process.cwd(), 'data', 'training-data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const timestamp = new Date().toISOString().split('T')[0];
    const outputFile = path.join(outputDir, `holly-training-${timestamp}.jsonl`);

    const lines = sorted.map(ex => JSON.stringify(ex));
    fs.writeFileSync(outputFile, lines.join('\n'));

    // ── 6. Write summary ───────────────────────────────────────────────────
    const summary = {
      totalExamples: sorted.length,
      avgQuality: sorted.length > 0
        ? sorted.reduce((s, e) => s + e.quality_score, 0) / sorted.length
        : 0,
      categories: [...new Set(sorted.map(e => e.category))],
      topQuality: sorted.filter(e => e.quality_score >= 0.8).length,
      date: timestamp,
      generatedAt: new Date().toISOString(),
    };

    const summaryFile = path.join(outputDir, `holly-training-${timestamp}-summary.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    console.log(`[TrainingCollector] ✅ Collected ${sorted.length} examples`);
    console.log(`[TrainingCollector] 📊 Avg quality: ${(summary.avgQuality * 100).toFixed(1)}%`);
    console.log(`[TrainingCollector] 🏆 High quality (≥0.8): ${summary.topQuality}`);
    console.log(`[TrainingCollector] 📁 Output: ${outputFile}`);

    // ── 7. Return JSONL content + stats ─────────────────────────────────────
    return NextResponse.json({
      status: 'ok',
      message: `Collected ${sorted.length} training examples`,
      summary,
      outputFile,
      // Include the JSONL data for direct upload to Modal
      data: lines.join('\n'),
      exampleCount: sorted.length,
    });
  } catch (error) {
    console.error('[TrainingCollector] ❌ Error:', error);
    return NextResponse.json(
      { error: 'Training data collection failed', details: String(error) },
      { status: 500 },
    );
  }
}

// ─── GET: Check collection status without running ─────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!userId && (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Count available data
    const [positiveCount, conversationCount, messageCount] = await Promise.all([
      prisma.responseFeedback.count({ where: { sentiment: 'positive' } }),
      prisma.conversation.count({ where: { messageCount: { gte: 6 } } }),
      prisma.message.count(),
    ]);

    // Check for existing training data files
    const outputDir = path.join(process.cwd(), 'data', 'training-data');
    let existingFiles: string[] = [];
    if (fs.existsSync(outputDir)) {
      existingFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.jsonl'));
    }

    const estimatedExamples = positiveCount + conversationCount * 3;
    const readyToTrain = estimatedExamples >= 20;

    return NextResponse.json({
      status: 'ok',
      available: {
        positiveFeedback: positiveCount,
        goodConversations: conversationCount,
        totalMessages: messageCount,
        estimatedExamples,
      },
      readyToTrain,
      minRequired: 20,
      existingFiles,
      outputDir,
    });
  } catch (error) {
    console.error('[TrainingCollector] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to check training status', details: String(error) },
      { status: 500 },
    );
  }
}
