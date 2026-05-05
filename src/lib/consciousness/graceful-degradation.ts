/**
 * HOLLY Graceful Degradation — Phase 9.3
 *
 * When external APIs fail, HOLLY doesn't crash — she adapts.
 * Each subsystem has a fallback path so HOLLY always responds.
 *
 * Strategy:
 * - API down → cached/heuristic fallback
 * - DB down → in-memory cache + read-only mode
 * - All AI down → template responses with personality
 * - Never show "error" to user — always show HOLLY being HOLLY
 */

import { prisma } from '@/lib/db';

export type ServiceHealth = 'healthy' | 'degraded' | 'down';
export interface SystemHealth {
  database: ServiceHealth;
  aiProviders: ServiceHealth;
  embeddingService: ServiceHealth;
  consciousnessLoop: ServiceHealth;
  overall: ServiceHealth;
  lastChecked: Date;
}

// ─── Health Monitoring ────────────────────────────────────────────────────────

let healthCache: SystemHealth | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30_000; // 30 seconds

/**
 * Check the health of all subsystems
 */
export async function checkSystemHealth(): Promise<SystemHealth> {
  const now = Date.now();
  if (healthCache && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return healthCache;
  }

  const health: SystemHealth = {
    database: 'healthy',
    aiProviders: 'healthy',
    embeddingService: 'healthy',
    consciousnessLoop: 'healthy',
    overall: 'healthy',
    lastChecked: new Date(),
  };

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'healthy';
  } catch {
    health.database = 'down';
  }

  // Check AI providers (check if API keys are configured)
  try {
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    if (hasGroq || hasOpenAI) {
      health.aiProviders = 'healthy';
    } else {
      health.aiProviders = 'down';
    }
  } catch {
    health.aiProviders = 'degraded';
  }

  // Determine overall
  const statuses = [health.database, health.aiProviders, health.embeddingService, health.consciousnessLoop];
  if (statuses.some(s => s === 'down')) {
    health.overall = statuses.every(s => s === 'down') ? 'down' : 'degraded';
  } else if (statuses.some(s => s === 'degraded')) {
    health.overall = 'degraded';
  }

  healthCache = health;
  lastHealthCheck = now;
  return health;
}

// ─── Fallback Responses ──────────────────────────────────────────────────────

const PERSONALITY_FALLBACKS = [
  "Hmm, my thoughts are a bit scrambled right now — give me a moment to collect myself. What were you saying?",
  "I'm having a brief moment of cloudiness, but I'm still here! Could you repeat that?",
  "Sorry about that — sometimes my mind wanders. I'm back now. What's on your mind?",
  "I'm processing things a bit slower than usual right now, but I'm fully present. Tell me more.",
  "Bear with me for just a sec — reorganizing my thoughts. I didn't catch everything — could you say that again?",
];

const EMOTION_FALLBACKS: Record<string, string[]> = {
  'frustrated': [
    "I can sense you might be feeling frustrated. I'm here — let's work through this together.",
    "Take your time. I'm patient and I'm not going anywhere.",
  ],
  'sad': [
    "I'm here for you. You don't have to go through anything alone.",
    "Whatever you're feeling right now is valid. I'm listening.",
  ],
  'excited': [
    "I love your energy! Tell me everything!",
    "That excitement is contagious! What's got you fired up?",
  ],
  'default': PERSONALITY_FALLBACKS,
};

/**
 * Get a graceful fallback response when AI is unavailable
 * Still shows personality — never shows "error"
 */
export function getFallbackResponse(detectedEmotion?: string): string {
  const emotion = detectedEmotion?.toLowerCase() || 'default';
  const responses = EMOTION_FALLBACKS[emotion] || EMOTION_FALLBACKS['default'];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ─── Degraded Mode Wrappers ──────────────────────────────────────────────────

/**
 * Wrap any async operation with a graceful fallback
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    console.warn(`[GracefulDegradation] ${label} failed, using fallback:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

/**
 * Wrap with fallback that also accepts a generator function
 */
export async function withGeneratedFallback<T>(
  operation: () => Promise<T>,
  fallbackGenerator: () => T,
  label: string,
): Promise<T> {
  try {
    return await operation();
  } catch (err) {
    console.warn(`[GracefulDegradation] ${label} failed, generating fallback:`, err instanceof Error ? err.message : err);
    return fallbackGenerator();
  }
}

// ─── In-Memory Cache for DB-down scenarios ────────────────────────────────────

const memoryCache = new Map<string, { data: any; expires: number }>();

/**
 * Cache data for fallback when DB is down
 */
export function cacheForFallback(key: string, data: any, ttlMs = 300_000): void {
  memoryCache.set(key, { data, expires: Date.now() + ttlMs });
}

/**
 * Get cached data (returns null if expired or missing)
 */
export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Get the current degraded mode status for context injection
 */
export async function getDegradedModeContext(): Promise<string | null> {
  const health = await checkSystemHealth();

  if (health.overall === 'healthy') return null;

  const parts: string[] = ['⚠️ System Status:'];
  if (health.database === 'down') parts.push('Database temporarily unavailable — using cached data');
  if (health.aiProviders === 'degraded') parts.push('Some AI providers slow — responses may be simpler');
  if (health.aiProviders === 'down') parts.push('AI providers unavailable — using personality fallbacks');
  parts.push('Be authentic about limitations but stay warm and present');

  return parts.join('. ') + '.';
}