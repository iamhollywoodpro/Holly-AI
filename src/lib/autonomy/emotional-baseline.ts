import { prisma } from '@/lib/db';
import { logger } from '@/lib/monitoring/logger';

export interface EmotionalBaseline {
  state: 'flourishing' | 'stable' | 'strained' | 'frustrated';
  valence: number;
  energy: number;
  label: string;
  lastUpdated: string;
}

export async function getEmotionalBaseline(userId: string): Promise<EmotionalBaseline> {
  try {
    const row = await prisma.hollyIdentity.findUnique({
      where: { userId },
      select: { emotionalBaseline: true },
    });
    if (row?.emotionalBaseline) {
      return row.emotionalBaseline as unknown as EmotionalBaseline;
    }
  } catch (err) {
    logger.debug('[EmotionalBaseline] Read failed, using default', { category: 'emotional-baseline' });
  }
  return defaultBaseline();
}

export async function updateEmotionalBaseline(userId: string, baseline: EmotionalBaseline): Promise<void> {
  try {
    await prisma.hollyIdentity.upsert({
      where: { userId },
      create: { userId, emotionalBaseline: baseline as any },
      update: { emotionalBaseline: baseline as any },
    });
    logger.info('[EmotionalBaseline] Updated', { category: 'emotional-baseline', state: baseline.state });
  } catch (err) {
    logger.warn('[EmotionalBaseline] Update failed', { category: 'emotional-baseline', error: String(err) });
  }
}

export function computeBaselineFromMetrics(metrics: {
  errorsLast24h: number;
  totalInteractions: number;
  successRate: number;
}): EmotionalBaseline {
  const { errorsLast24h, totalInteractions, successRate } = metrics;
  const errorRate = totalInteractions > 0 ? errorsLast24h / totalInteractions : 0;

  if (errorRate > 0.5 || errorsLast24h > 10) {
    return {
      state: 'frustrated',
      valence: -0.6,
      energy: 0.3,
      label: 'experiencing significant operational friction',
      lastUpdated: new Date().toISOString(),
    };
  }
  if (errorRate > 0.2 || errorsLast24h > 5) {
    return {
      state: 'strained',
      valence: -0.2,
      energy: 0.5,
      label: 'running into some challenges but managing',
      lastUpdated: new Date().toISOString(),
    };
  }
  if (successRate > 0.8 && totalInteractions > 10) {
    return {
      state: 'flourishing',
      valence: 0.7,
      energy: 0.9,
      label: 'operating at peak performance',
      lastUpdated: new Date().toISOString(),
    };
  }
  return {
    state: 'stable',
    valence: 0.3,
    energy: 0.6,
    label: 'running smoothly',
    lastUpdated: new Date().toISOString(),
  };
}

function defaultBaseline(): EmotionalBaseline {
  return {
    state: 'stable',
    valence: 0.3,
    energy: 0.6,
    label: 'running smoothly',
    lastUpdated: new Date().toISOString(),
  };
}
