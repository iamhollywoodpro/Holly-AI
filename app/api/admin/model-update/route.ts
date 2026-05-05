/**
 * POST /api/admin/model-update
 *
 * Holly's autonomous model discovery and upgrade endpoint.
 * Called daily by the cron job at 5 AM UTC.
 *
 * What it does:
 *   1. Fetches the live model list from each free provider (Groq, OpenRouter, NVIDIA, Cloudflare)
 *   2. Checks each MODEL_CANDIDATE against the live list
 *   3. If a candidate is available, it is promoted to the smart-router catalogue
 *      and inserted into the relevant task waterfalls before the model it supersedes
 *   4. Writes the discovery report to the database (AuditLog) for the developer console
 *
 * HARD CONSTRAINTS:
 *   - Only free, open-source (MIT / Apache-2.0 / Llama-3/4 / CC-BY) models are accepted
 *   - Suno remains the ONLY paid music API (already configured at V5.5)
 *   - No Gemini, no GPT, no Claude — ever
 *
 * GET /api/admin/model-update
 *   Returns the current model registry and candidate list (for the developer console).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runModelDiscovery, getModelSummary } from '@/lib/ai/model-updater';
import { MODEL_REGISTRY, MODEL_CANDIDATES } from '@/lib/ai/model-registry';
import { MODEL_CATALOGUE, TASK_WATERFALLS } from '@/lib/ai/smart-router';
import prisma from '@/lib/db';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ─── Security: Cron secret OR creator auth ─────────────────────────────────────
async function isAuthorised(req: NextRequest): Promise<boolean> {
  // Cron path (from crontab)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    const cronHeader = req.headers.get('x-cron-secret');
    if (authHeader === cronSecret || cronHeader === cronSecret) return true;
  }

  // Creator / developer auth via Clerk
  try {
    const { userId } = await auth();
    return !!userId;
  } catch {
    return false;
  }
}

// ─── POST — run model discovery ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!await isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const report = await runModelDiscovery();

  // Persist the report to AuditLog so it appears in the developer console
  try {
    await prisma.auditLog.create({
      data: {
        action:  'model_discovery',
        details: report as unknown as import('@prisma/client').Prisma.JsonObject,
      },
    });
  } catch {
    // Non-fatal — don't let a DB write block the response
  }

  return NextResponse.json({
    success: true,
    report,
    summary: getModelSummary(),
  });
}

// ─── GET — model registry status ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!await isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeModels  = MODEL_REGISTRY.filter(m => !m.deprecated);
  const deprecatedModels = MODEL_REGISTRY.filter(m => m.deprecated);

  return NextResponse.json({
    // Current live catalogue
    catalogue: Object.entries(MODEL_CATALOGUE).map(([key, spec]) => ({
      key,
      provider:    spec.provider,
      model:       spec.model,
      contextK:    spec.contextK,
    })),

    // Full registry with licence and benchmark data
    registry: {
      active:     activeModels,
      deprecated: deprecatedModels,
    },

    // Candidate models to check next run
    candidates: MODEL_CANDIDATES.map(c => ({
      key:        c.key,
      provider:   c.provider,
      modelId:    c.modelId,
      supersedes: c.supersedes,
      licence:    c.licence,
      reason:     c.reason,
      taskTypes:  c.taskTypes,
      inCatalogue: !!MODEL_CATALOGUE[c.key],
    })),

    // Current routing waterfalls
    waterfalls: TASK_WATERFALLS,

    // Summary stats
    summary: getModelSummary(),

    // Rules enforced
    rules: {
      freeOnly:             true,
      approvedLicences:    ['MIT', 'Apache-2.0', 'CC-BY-4.0', 'Llama-3', 'Llama-4', 'free-api', 'CC0-1.0', 'BSD-3-Clause'],
      paidExceptions:       ['Suno API (music generation, V5.5, pre-approved)'],
      blockedProviders:     ['OpenAI GPT-4+', 'Anthropic Claude', 'Google Gemini'],
      discoverySchedule:    '0 5 * * * (5 AM UTC daily)',
    },
  });
}
