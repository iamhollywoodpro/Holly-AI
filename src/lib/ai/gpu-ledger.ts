/**
 * GPU BUDGET LEDGER + PER-USER QUOTAS (Steve, 2026-08-12).
 *
 * Protects the two $30/mo Modal credit wallets from burnout:
 *   • MONTHLY CAPS per category — when a paid lane hits its cap it
 *     degrades: images fall back to the free Cloudflare lane, video/TTS
 *     return an honest "monthly budget reached" error.
 *   • PER-USER DAILY QUOTAS — one user (or 100) can't drain the shared
 *     wallets; free lanes (cloudflare/groq/nvidia) are not counted against
 *     the shared GPU budget.
 *
 * All enforcement is fail-open on ledger DB errors: if the ledger can't be
 * read/written we allow the request (same philosophy as vision QA — the
 * ledger enhances, never breaks, the pipeline). Anonymous/system calls use
 * userId 'system'.
 */

import { prisma } from '@/lib/db';

export type GpuCategory =
  | 'image-klein'       // Modal A100, FLUX.2 Klein — Holly's body (paid)
  | 'image-modal'       // Modal generic image (paid)
  | 'image-cloudflare'  // Workers AI FLUX schnell (FREE)
  | 'video-h3'          // Modal MiniMax H3 I2V (paid — expensive)
  | 'tts'               // Modal Qwen3-TTS (paid; Magpie fallback is free)
  | 'vision-qa'         // Modal Qwen2.5-VL outbound QA (paid)
  | 'vision-describe';  // inbound describe (Modal paid / Groq free)

/** Estimated real cost in USD micros (1e-6 $) per single call. */
const ESTIMATED_COST_MICROS: Partial<Record<GpuCategory, number>> = {
  'image-klein': 25_000,        // ~$0.025 (A100 ~30s w/ cold start amortized)
  'image-modal': 200,           // ~$0.0002
  'image-cloudflare': 0,        // free lane
  'video-h3': 30_000,           // ~$0.03
  'tts': 3_000,                 // ~$0.003
  'vision-qa': 2_000,           // ~$0.002 warm A10G
  'vision-describe': 2_000,
};

/** Monthly cap in USD per PAID category. Env-overridable. */
function monthlyCapUsd(category: GpuCategory): number {
  const envKey = `GPU_MONTHLY_CAP_${category.replace(/-/g, '_').toUpperCase()}`;
  const fromEnv = Number(process.env[envKey]);
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  const defaults: Partial<Record<GpuCategory, number>> = {
    'image-klein': 15,   // ~600 Holly images/mo per $30 wallet share
    'image-modal': 3,
    'video-h3': 5,       // video is the most expensive per call
    'tts': 5,
    'vision-qa': 4,
    'vision-describe': 2,
  };
  return defaults[category] ?? 5;
}

/** Per-user daily call quotas. Counts EVERY call incl. free lanes (rate
 *  protection against a looping client), but free lanes never blocked by
 *  the monthly GPU cap. */
const DAILY_USER_QUOTA: Record<GpuCategory, number> = {
  'image-klein': 40,
  'image-modal': 40,
  'image-cloudflare': 100,
  'video-h3': 5,
  'tts': 200,
  'vision-qa': 60,
  'vision-describe': 60,
};

function dayStamp(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
function monthStamp(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function today(): Date {
  return new Date(`${dayStamp()}T00:00:00.000Z`);
}

export interface QuotaVerdict {
  allowed: boolean;
  reason?: string; // human-readable — surfaced to Holly so she can explain honestly
}

/**
 * Check BEFORE a paid/free generation. Two gates:
 *   1. per-user daily count for this category
 *   2. monthly USD spend for this category (paid categories only)
 */
export async function checkQuota(
  userId: string,
  category: GpuCategory,
): Promise<QuotaVerdict> {
  try {
    const dailyCount = await prisma.gpuUsageLedger.count({
      where: { userId, category, day: dayStamp() },
    });
    if (dailyCount >= DAILY_USER_QUOTA[category]) {
      return {
        allowed: false,
        reason: `Daily limit reached (${DAILY_USER_QUOTA[category]}/day for ${category}). Resets tomorrow.`,
      };
    }

    if (ESTIMATED_COST_MICROS[category]) { // paid category
      const spent = await prisma.gpuUsageLedger.aggregate({
        _sum: { costMicros: true },
        where: { category, month: monthStamp() },
      });
      const spentUsd = Number(spent._sum.costMicros ?? 0) / 1_000_000;
      if (spentUsd >= monthlyCapUsd(category)) {
        return {
          allowed: false,
          reason: `Monthly GPU budget for ${category} is exhausted (${spentUsd.toFixed(2)} USD). Free lanes still work.`,
        };
      }
    }
    return { allowed: true };
  } catch (e) {
    console.warn('[GpuLedger] quota check failed (fail-open):', (e as Error).message);
    return { allowed: true };
  }
}

/**
 * Record AFTER a call. provider examples: 'modal-iamdoregosteve',
 * 'cloudflare', 'groq'. lane: 'paid' | 'free'. Fire-and-forget safe.
 */
export async function recordUsage(params: {
  userId: string;
  category: GpuCategory;
  provider: string;
  lane?: 'paid' | 'free';
  costMicros?: number;
}): Promise<void> {
  const costMicros = params.costMicros ?? ESTIMATED_COST_MICROS[params.category] ?? 0;
  try {
    await prisma.gpuUsageLedger.create({
      data: {
        userId: params.userId || 'system',
        category: params.category,
        provider: params.provider,
        lane: params.lane ?? (costMicros > 0 ? 'paid' : 'free'),
        day: dayStamp(),
        month: monthStamp(),
        costMicros: BigInt(costMicros),
      },
    });
  } catch (e) {
    console.warn('[GpuLedger] record failed (non-fatal):', (e as Error).message);
  }
}

/** Map an ImageResult.provider to a ledger category. */
export function imageCategoryFor(provider: string): GpuCategory {
  if (provider.startsWith('modal-comfyui-klein')) return 'image-klein';
  if (provider === 'cloudflare') return 'image-cloudflare';
  return 'image-modal';
}

/** Dashboard summary: month-to-date spend per category. */
export async function monthSummary(): Promise<Array<{ category: string; lane: string; calls: number; spentUsd: number }>> {
  const rows = await prisma.gpuUsageLedger.groupBy({
    by: ['category', 'lane'],
    where: { month: monthStamp() },
    _count: { _all: true },
    _sum: { costMicros: true },
  });
  return rows.map((r) => ({
    category: r.category,
    lane: r.lane,
    calls: r._count._all,
    spentUsd: Number(r._sum.costMicros ?? 0) / 1_000_000,
  }));
}
