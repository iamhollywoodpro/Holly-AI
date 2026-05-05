/**
 * HOLLY Tool Hub — In-Process Rate Limiter
 *
 * Lightweight sliding-window rate limiter using an in-memory Map.
 * Limits:  20 RPM / 200 RPD for AURA  |  30 RPM / 300 RPD for Sentinel
 *
 * For production at scale, swap the Map for Redis/Upstash.
 */

interface WindowEntry {
  minute: { count: number; resetAt: number };
  day:    { count: number; resetAt: number };
}

const store = new Map<string, WindowEntry>();

function now(): number { return Date.now(); }

function getOrCreate(key: string): WindowEntry {
  const existing = store.get(key);
  const minute = existing?.minute ?? { count: 0, resetAt: now() + 60_000 };
  const day    = existing?.day    ?? { count: 0, resetAt: now() + 86_400_000 };

  // Reset windows if expired
  if (now() > minute.resetAt) { minute.count = 0; minute.resetAt = now() + 60_000; }
  if (now() > day.resetAt)    { day.count    = 0; day.resetAt    = now() + 86_400_000; }

  const entry = { minute, day };
  store.set(key, entry);
  return entry;
}

export interface RateLimitResult {
  ok:             boolean;
  remainingRpm:   number;
  remainingRpd:   number;
  resetInMs:      number;
  limitRpm:       number;
  limitRpd:       number;
}

/**
 * Check and increment rate limit counters.
 *
 * @param identifier  — unique key (e.g. userId or keyId)
 * @param tool        — 'aura' | 'sentinel' (determines limits)
 */
export function checkHubRateLimit(identifier: string, tool: string): RateLimitResult {
  const limitRpm = tool === 'sentinel' ? 30 : 20;
  const limitRpd = tool === 'sentinel' ? 300 : 200;

  // Dev / master keys get generous limits
  if (identifier === 'dev-user' || identifier === 'hub-master') {
    return { ok: true, remainingRpm: limitRpm, remainingRpd: limitRpd, resetInMs: 0, limitRpm, limitRpd };
  }

  const entry = getOrCreate(`${identifier}:${tool}`);

  const overRpm = entry.minute.count >= limitRpm;
  const overRpd = entry.day.count    >= limitRpd;

  if (overRpm || overRpd) {
    return {
      ok:           false,
      remainingRpm: Math.max(0, limitRpm - entry.minute.count),
      remainingRpd: Math.max(0, limitRpd - entry.day.count),
      resetInMs:    overRpm ? entry.minute.resetAt - now() : entry.day.resetAt - now(),
      limitRpm,
      limitRpd,
    };
  }

  entry.minute.count++;
  entry.day.count++;

  return {
    ok:           true,
    remainingRpm: Math.max(0, limitRpm - entry.minute.count),
    remainingRpd: Math.max(0, limitRpd - entry.day.count),
    resetInMs:    entry.minute.resetAt - now(),
    limitRpm,
    limitRpd,
  };
}

/** Clean up expired entries (call periodically if needed) */
export function pruneRateLimitStore(): number {
  let pruned = 0;
  const n = now();
  for (const [key, entry] of store.entries()) {
    if (n > entry.day.resetAt) { store.delete(key); pruned++; }
  }
  return pruned;
}
