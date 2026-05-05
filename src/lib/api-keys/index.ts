/**
 * HOLLY API Key utilities — Phase 7
 *
 * Key format:  holly_<32 random hex chars>
 * Storage:     keyHash = SHA-256(rawKey) stored in DB, prefix = first 10 chars
 * Validation:  hash incoming key, look up by hash, check active + expiry
 * Rate limits: sliding-window counters stored in ApiKeyUsage rows
 */

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import type { ApiKey } from '@prisma/client';

// ─── Key generation ───────────────────────────────────────────────────────────

/** Generate a new raw API key.  Returns the plaintext — only shown once. */
export function generateRawKey(): string {
  const rand = randomBytes(24).toString('hex'); // 48 hex chars
  return `holly_${rand}`;
}

/** SHA-256 hash a raw key for safe storage. */
export function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/** Extract the display prefix (first 12 chars, e.g. "holly_ab12cd"). */
export function keyPrefix(rawKey: string): string {
  return rawKey.slice(0, 12);
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type ValidatedKey = {
  apiKey:  ApiKey;
  userId:  string;
};

/**
 * Validate a raw Bearer token from an Authorization header.
 * Returns the ApiKey record + userId on success, null on failure.
 * Does NOT log usage — call `logUsage` separately after the request completes.
 */
export async function validateApiKey(rawKey: string): Promise<ValidatedKey | null> {
  if (!rawKey?.startsWith('holly_')) return null;

  const hash = hashKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
  });

  if (!apiKey)             return null;
  if (!apiKey.isActive)    return null;
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

  return { apiKey, userId: apiKey.userId };
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export type RateLimitResult =
  | { allowed: true;  remainingRpm: number; remainingRpd: number }
  | { allowed: false; reason: 'rpm' | 'rpd'; retryAfterMs: number };

/**
 * Sliding-window rate limit check using ApiKeyUsage rows.
 * rpm = requests in the last 60 seconds
 * rpd = requests in the last 24 hours
 */
export async function checkRateLimit(apiKey: ApiKey): Promise<RateLimitResult> {
  const now   = new Date();
  const oneMinAgo  = new Date(now.getTime() - 60_000);
  const oneDayAgo  = new Date(now.getTime() - 86_400_000);

  const [rpmCount, rpdCount] = await Promise.all([
    prisma.apiKeyUsage.count({
      where: { apiKeyId: apiKey.id, createdAt: { gte: oneMinAgo } },
    }),
    prisma.apiKeyUsage.count({
      where: { apiKeyId: apiKey.id, createdAt: { gte: oneDayAgo } },
    }),
  ]);

  if (rpmCount >= apiKey.rpmLimit) {
    // Find the oldest request in the window to tell client when to retry
    const oldest = await prisma.apiKeyUsage.findFirst({
      where: { apiKeyId: apiKey.id, createdAt: { gte: oneMinAgo } },
      orderBy: { createdAt: 'asc' },
    });
    const retryAfterMs = oldest
      ? 60_000 - (now.getTime() - oldest.createdAt.getTime())
      : 60_000;
    return { allowed: false, reason: 'rpm', retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  if (rpdCount >= apiKey.rpdLimit) {
    const oldest = await prisma.apiKeyUsage.findFirst({
      where: { apiKeyId: apiKey.id, createdAt: { gte: oneDayAgo } },
      orderBy: { createdAt: 'asc' },
    });
    const retryAfterMs = oldest
      ? 86_400_000 - (now.getTime() - oldest.createdAt.getTime())
      : 86_400_000;
    return { allowed: false, reason: 'rpd', retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  return {
    allowed:      true,
    remainingRpm: apiKey.rpmLimit - rpmCount - 1,
    remainingRpd: apiKey.rpdLimit - rpdCount - 1,
  };
}

// ─── Usage logging ────────────────────────────────────────────────────────────

export async function logUsage(
  apiKeyId:   string,
  endpoint:   string,
  method:     string,
  statusCode: number,
  durationMs: number,
  tokensIn  = 0,
  tokensOut = 0,
): Promise<void> {
  await Promise.all([
    prisma.apiKeyUsage.create({
      data: { apiKeyId, endpoint, method, statusCode, durationMs, tokensIn, tokensOut },
    }),
    prisma.apiKey.update({
      where: { id: apiKeyId },
      data:  { lastUsedAt: new Date() },
    }),
  ]);
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

export async function getKeyStats(apiKeyId: string) {
  const now       = new Date();
  const oneMinAgo = new Date(now.getTime() - 60_000);
  const oneDayAgo = new Date(now.getTime() - 86_400_000);

  const [total, last24h, lastMin] = await Promise.all([
    prisma.apiKeyUsage.count({ where: { apiKeyId } }),
    prisma.apiKeyUsage.count({ where: { apiKeyId, createdAt: { gte: oneDayAgo } } }),
    prisma.apiKeyUsage.count({ where: { apiKeyId, createdAt: { gte: oneMinAgo } } }),
  ]);

  return { total, last24h, lastMin };
}
