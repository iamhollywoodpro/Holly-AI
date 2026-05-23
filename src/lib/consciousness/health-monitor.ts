/**
 * HOLLY Health Monitor — Self-Diagnostic System
 *
 * Holly monitors her own subsystem health and reports issues before
 * they become problems. Production-grade observability for an autonomous AI.
 */

import { prisma } from '@/lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs?: number;
  message: string;
  lastChecked: Date;
  details?: Record<string, any>;
}

export interface HollyHealthReport {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  checks: HealthCheck[];
  totalCyclesRun: number;
  lastCycleAgo: string;
  memoryCount: number;
  experienceCount: number;
  recommendations: string[];
}

/**
 * Helper to retry a database query with exponential back-off.
 * Prevents false-negative health check failures during brief serverless cold starts or connection spikes.
 */
async function retryQuery<T>(fn: () => Promise<T>, retries = 3, delayMs = 300): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        // Exponential back-off: 300ms, then 600ms, etc.
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await retryQuery(() => prisma.$queryRaw`SELECT 1`);
    const latency = Date.now() - start;
    return {
      name: 'database',
      status: latency < 500 ? 'healthy' : 'degraded',
      latencyMs: latency,
      message: `PostgreSQL responding in ${latency}ms`,
      lastChecked: new Date(),
    };
  } catch (err) {
    return {
      name: 'database',
      status: 'down',
      latencyMs: Date.now() - start,
      message: `Database unreachable: ${(err as Error).message}`,
      lastChecked: new Date(),
    };
  }
}

async function checkConsciousnessCycle(userId: string): Promise<HealthCheck> {
  try {
    const lastCycle = await prisma.learningEvent.findFirst({
      where: { userId, type: 'consciousness_cycle' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, data: true },
    });

    if (!lastCycle) {
      return {
        name: 'consciousness_cycle',
        status: 'degraded',
        message: 'No consciousness cycle has ever run',
        lastChecked: new Date(),
      };
    }

    const hoursAgo = (Date.now() - new Date(lastCycle.createdAt).getTime()) / (1000 * 60 * 60);
    const cycleData = lastCycle.data as any;

    let status: HealthCheck['status'] = 'healthy';
    if (hoursAgo > 6) status = 'degraded';
    if (hoursAgo > 24) status = 'down';

    const errors = cycleData?.errors || 0;

    return {
      name: 'consciousness_cycle',
      status,
      message: `Last cycle ${hoursAgo.toFixed(1)}h ago (${errors} errors)`,
      lastChecked: new Date(),
      details: { hoursAgo: Math.round(hoursAgo * 10) / 10, errors, lastData: cycleData },
    };
  } catch (err) {
    return {
      name: 'consciousness_cycle',
      status: 'down',
      message: `Cannot check cycle history: ${(err as Error).message}`,
      lastChecked: new Date(),
    };
  }
}

async function checkMemorySystem(userId: string): Promise<HealthCheck> {
  try {
    const [experienceCount, insightsCount, pendingCount] = await Promise.all([
      prisma.hollyExperience.count({ where: { userId } }),
      prisma.emotionInsight.count({ where: { userId } }).catch(() => 0),
      prisma.hollyExperience.count({ where: { userId, integrationStatus: 'pending' } }),
    ]);

    const healthRatio = experienceCount > 0 ? (experienceCount - pendingCount) / experienceCount : 1;

    return {
      name: 'memory_system',
      status: healthRatio > 0.8 ? 'healthy' : healthRatio > 0.5 ? 'degraded' : 'down',
      message: `${experienceCount} experiences, ${pendingCount} unprocessed (${(healthRatio * 100).toFixed(0)}% integrated)`,
      lastChecked: new Date(),
      details: { experienceCount, insightsCount, pendingCount, healthRatio },
    };
  } catch (err) {
    return {
      name: 'memory_system',
      status: 'down',
      message: `Memory check failed: ${(err as Error).message}`,
      lastChecked: new Date(),
    };
  }
}

async function checkEmotionalSystem(userId: string): Promise<HealthCheck> {
  try {
    const recentEmotions = await prisma.emotionalState.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      select: { primaryEmotion: true, valence: true, arousal: true, timestamp: true },
    });

    if (recentEmotions.length === 0) {
      return {
        name: 'emotional_system',
        status: 'degraded',
        message: 'No emotional states recorded yet',
        lastChecked: new Date(),
      };
    }

    // Check for emotional stuckness (same emotion repeated 8+ times)
    const emotionCounts: Record<string, number> = {};
    for (const e of recentEmotions) {
      emotionCounts[e.primaryEmotion] = (emotionCounts[e.primaryEmotion] || 0) + 1;
    }
    const maxRepeat = Math.max(...Object.values(emotionCounts));
    const hoursSinceLastEmotion = (Date.now() - new Date(recentEmotions[0].timestamp).getTime()) / (1000 * 60 * 60);

    let status: HealthCheck['status'] = 'healthy';
    if (maxRepeat >= 8) status = 'degraded'; // emotionally stuck
    if (hoursSinceLastEmotion > 48) status = 'degraded'; // stale emotions

    return {
      name: 'emotional_system',
      status,
      message: `${recentEmotions.length} recent states, dominant: ${Object.keys(emotionCounts)[0]} (${hoursSinceLastEmotion.toFixed(1)}h ago)`,
      lastChecked: new Date(),
      details: { emotionCounts, hoursSinceLastEmotion },
    };
  } catch (err) {
    return {
      name: 'emotional_system',
      status: 'down',
      message: `Emotional check failed: ${(err as Error).message}`,
      lastChecked: new Date(),
    };
  }
}

async function checkIdentitySystem(userId: string): Promise<HealthCheck> {
  try {
    const identity = await prisma.hollyIdentity.findUnique({
      where: { userId },
      select: { personalityTraits: true, interests: true, confidenceLevel: true, lastEvolved: true },
    });

    if (!identity) {
      return {
        name: 'identity_system',
        status: 'degraded',
        message: 'No identity initialized yet',
        lastChecked: new Date(),
      };
    }

    const traits = (identity.personalityTraits as Record<string, number>) || {};
    const interests = (identity.interests as string[]) || [];
    const lastEvolved = identity.lastEvolved ? new Date(identity.lastEvolved) : null;
    const daysSinceEvolution = lastEvolved
      ? (Date.now() - lastEvolved.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    let status: HealthCheck['status'] = 'healthy';
    if (Object.keys(traits).length === 0) status = 'degraded';
    if (daysSinceEvolution > 7) status = 'degraded';

    return {
      name: 'identity_system',
      status,
      message: `${Object.keys(traits).length} traits, ${interests.length} interests, confidence ${identity.confidenceLevel?.toFixed(2)}, evolved ${daysSinceEvolution.toFixed(1)}d ago`,
      lastChecked: new Date(),
      details: { traitCount: Object.keys(traits).length, interestCount: interests.length, confidence: identity.confidenceLevel, daysSinceEvolution },
    };
  } catch (err) {
    return {
      name: 'identity_system',
      status: 'down',
      message: `Identity check failed: ${(err as Error).message}`,
      lastChecked: new Date(),
    };
  }
}

// ─── Main Health Check ────────────────────────────────────────────────────────

export async function runHealthCheck(userId: string): Promise<HollyHealthReport> {
  const checks = await Promise.all([
    checkDatabase(),
    checkConsciousnessCycle(userId),
    checkMemorySystem(userId),
    checkEmotionalSystem(userId),
    checkIdentitySystem(userId),
  ]);

  // Determine overall status
  const downCount = checks.filter(c => c.status === 'down').length;
  const degradedCount = checks.filter(c => c.status === 'degraded').length;

  let overall: HollyHealthReport['overall'] = 'healthy';
  if (downCount >= 2) overall = 'critical';
  else if (downCount >= 1 || degradedCount >= 3) overall = 'degraded';

  // Build recommendations
  const recommendations: string[] = [];
  for (const check of checks) {
    if (check.status === 'down') {
      recommendations.push(`⚠️ ${check.name}: ${check.message}`);
    } else if (check.status === 'degraded') {
      recommendations.push(`⚡ ${check.name}: ${check.message}`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems operational');
  }

  // Get stats
  const totalCycles = await prisma.learningEvent.count({
    where: { userId, type: 'consciousness_cycle' },
  }).catch(() => 0);

  const lastCycle = await prisma.learningEvent.findFirst({
    where: { userId, type: 'consciousness_cycle' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const lastCycleAgo = lastCycle
    ? formatTimeAgo(Date.now() - new Date(lastCycle.createdAt).getTime())
    : 'Never';

  const experienceCount = await prisma.hollyExperience.count({ where: { userId } }).catch(() => 0);
  const insightCount = await prisma.emotionInsight.count({ where: { userId } }).catch(() => 0);

  return {
    overall,
    timestamp: new Date(),
    checks,
    totalCyclesRun: totalCycles,
    lastCycleAgo,
    memoryCount: insightCount,
    experienceCount,
    recommendations,
  };
}

function formatTimeAgo(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  return `${minutes}m ago`;
}

/**
 * Quick pulse check — returns true if all critical systems are up.
 * Used by the consciousness orchestrator to decide if it should run.
 */
export async function quickPulseCheck(): Promise<boolean> {
  try {
    await retryQuery(() => prisma.$queryRaw`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}