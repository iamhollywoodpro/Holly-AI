/**
 * HOLLY Fine-Tune Status API
 *
 * Shows Holly's self-training status — how much data she has,
 * when she last trained, and if she's ready for the next cycle.
 *
 * GET /api/fine-tune-status
 */

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Count positive feedback
    const positiveFeedback = await prisma.responseFeedback.count({
      where: { sentiment: 'positive' },
    });

    // Count good conversations
    const goodConversations = await prisma.conversation.count({
      where: { messageCount: { gte: 6 } },
    });

    // Total messages
    const totalMessages = await prisma.message.count();

    // Latest self-finetune event
    const lastFinetune = await prisma.learningEvent.findFirst({
      where: { type: 'self_finetune' },
      orderBy: { timestamp: 'desc' },
    });

    // All finetune history
    const finetuneHistory = await prisma.learningEvent.findMany({
      where: { type: 'self_finetune' },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    const estimatedExamples = positiveFeedback + goodConversations * 3;
    const readyToTrain = estimatedExamples >= 20;

    return NextResponse.json({
      status: 'ok',
      trainingData: {
        positiveFeedback,
        goodConversations,
        totalMessages,
        estimatedExamples,
        readyToTrain,
        minRequired: 20,
      },
      lastFinetune: lastFinetune
        ? {
            timestamp: lastFinetune.timestamp,
            result: lastFinetune.data,
          }
        : null,
      history: finetuneHistory.map(e => ({
        timestamp: e.timestamp,
        result: e.data,
      })),
      nextScheduledTrain: getNextTrainDate(),
      message: getStatusMessage(readyToTrain, positiveFeedback, lastFinetune),
    });
  } catch (error: any) {
    // If tables don't exist yet, return a helpful message
    if (error?.message?.includes('does not exist')) {
      return NextResponse.json({
        status: 'pending_migration',
        message: 'Tables not created yet. Run prisma db push or wait for next deploy.',
        hint: 'The startup.sh script runs prisma db push automatically on next deploy.',
      }, { status: 503 });
    }

    return NextResponse.json({
      status: 'error',
      message: error.message,
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

function getNextTrainDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 3, 0, 0); // 1st of next month, 3 AM UTC
  return next.toISOString();
}

function getStatusMessage(ready: boolean, feedback: number, lastTrain: any): string {
  if (!ready) {
    return `Holly needs more conversations before she can self-train. She has ${feedback} positive feedback examples and needs at least 20. Keep chatting with her!`;
  }

  if (!lastTrain) {
    return `Holly has enough data to train (${feedback} positive examples)! Her first self-training cycle runs on the 1st of next month, or you can trigger it manually with: modal run services/fine-tuning/autonomous_finetune.py`;
  }

  const data = lastTrain.data as any;
  if (data?.status === 'complete') {
    return `Holly last trained herself on ${lastTrain.timestamp.toISOString().split('T')[0]}. She trained on ${data.examples_trained || '?'} examples and is getting smarter every month.`;
  }

  if (data?.status === 'skipped') {
    return `Holly's last training was skipped: ${data.reason || 'not enough data'}. She'll try again next month.`;
  }

  return `Holly's self-training system is active. Next cycle: 1st of next month.`;
}