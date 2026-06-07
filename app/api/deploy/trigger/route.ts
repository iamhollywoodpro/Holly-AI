// ─────────────────────────────────────────────────────────────────────────────
// Deploy Trigger API — Holly can trigger her own redeployment
// Phase 4: Autonomous Deploy Pipeline
//
// After Holly makes self-code changes and pushes to GitHub,
// she calls this endpoint to trigger Coolify to pull the new image.
//
// Flow: self-code → git push → GHCR build → POST /api/deploy/trigger → Coolify webhook
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const COOLIFY_WEBHOOK_URL = process.env.COOLIFY_WEBHOOK_URL || '';
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'iamhollywoodpro/Holly-AI';

export async function POST(req: NextRequest) {
  // Auth: Clerk user OR internal secret (x-internal-token OR Authorization: Bearer)
  const { userId } = await auth();
  const authHeader = req.headers.get('authorization');
  const internalSecret = process.env.INTERNAL_API_SECRET;
  const xInternalToken = req.headers.get('x-internal-token');
  const isInternalToken = !!(internalSecret && xInternalToken && xInternalToken === internalSecret);
  const isBearerValid = !!(authHeader && internalSecret && authHeader === `Bearer ${internalSecret}`);

  if (!userId && !isInternalToken && !isBearerValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!COOLIFY_WEBHOOK_URL) {
    return NextResponse.json({
      error: 'COOLIFY_WEBHOOK_URL not configured',
      hint: 'In Coolify: Application → Deployment → Copy Webhook URL. Then add as env var.',
      status: 'not_configured',
    }, { status: 503 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Manual trigger';
    const commit = body.commit || 'latest';

    // Trigger Coolify webhook (pull-based deployment)
    // Coolify deploy webhooks accept GET with UUID in query string
    const res = await fetch(COOLIFY_WEBHOOK_URL, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown');
      return NextResponse.json({
        success: false,
        error: `Coolify webhook returned ${res.status}`,
        details: text,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      message: `Deployment triggered: ${reason}`,
      commit,
      note: 'Coolify will pull the latest GHCR image and redeploy. This takes 2-5 minutes.',
      githubActions: `https://github.com/${GITHUB_REPO}/actions`,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Deploy trigger failed: ${err.message}`,
    }, { status: 500 });
  }
}

export async function GET() {
  // Status check — is the deploy pipeline configured?
  return NextResponse.json({
    configured: !!COOLIFY_WEBHOOK_URL,
    webhookUrl: COOLIFY_WEBHOOK_URL ? `${COOLIFY_WEBHOOK_URL.substring(0, 30)}...` : null,
    githubRepo: GITHUB_REPO,
    pipeline: {
      step1: 'Holly pushes code to GitHub (self-code engine)',
      step2: 'GitHub Actions builds ARM64 Docker image → pushes to GHCR',
      step3: 'POST /api/deploy/trigger → Coolify webhook',
      step4: 'Coolify pulls latest image → redeploys container',
      step5: 'Health check confirms new version is live',
    },
    setup: !COOLIFY_WEBHOOK_URL
      ? 'In Coolify: Application → Configuration → Deployment → Copy Webhook URL → Add as COOLIFY_WEBHOOK_URL env var'
      : 'Ready to deploy!',
  });
}
