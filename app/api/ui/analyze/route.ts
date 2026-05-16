// ─────────────────────────────────────────────────────────────────────────────
// UI Analyze API — AI-powered UI/UX analysis of Holly's interface
// Phase 2: Visual Awareness
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeUI, selfVisualCheck } from '@/lib/ui/ui-analyzer';

export async function POST(req: NextRequest) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const result = await analyzeUI({
      url: body.url,
      path: body.path,
      focus: body.focus || 'all',
    });

    return NextResponse.json({
      success: result.screenshot.success,
      url: result.url,
      score: result.score,
      analysis: result.analysis,
      improvements: result.improvements,
      screenshotMethod: result.screenshot.method,
      screenshotSize: result.screenshot.buffer?.length ?? 0,
      image: result.screenshot.base64 ? `data:image/png;base64,${result.screenshot.base64}` : null,
      error: result.screenshot.error,
      timestamp: result.timestamp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'UI analysis failed', details: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Quick self-check — can Holly see her own UI?
  const result = await selfVisualCheck();
  return NextResponse.json(result);
}
