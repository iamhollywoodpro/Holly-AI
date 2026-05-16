// ─────────────────────────────────────────────────────────────────────────────
// UI Screenshot API — Holly can capture screenshots of any URL or her own UI
// Phase 2: Visual Awareness
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { takeScreenshot, screenshotSelfPage, getHollyBaseUrl } from '@/lib/ui/screenshot-service';

export async function POST(req: NextRequest) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const url = body.url as string | undefined;
    const path = body.path as string | undefined;
    const fullPage = body.fullPage ?? true;
    const width = body.width as number | undefined;
    const height = body.height as number | undefined;

    let result;

    if (url) {
      // Screenshot arbitrary URL
      result = await takeScreenshot({ url, fullPage, width, height });
    } else {
      // Screenshot Holly's own page
      result = await screenshotSelfPage(path || '/');
    }

    // Return base64 image data (not raw buffer — JSON-safe)
    return NextResponse.json({
      success: result.success,
      url: result.url,
      method: result.method,
      image: result.base64 ? `data:image/png;base64,${result.base64}` : null,
      size: result.buffer?.length ?? 0,
      error: result.error,
      timestamp: result.timestamp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Screenshot failed', details: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Quick status check — can Holly take screenshots?
  const baseUrl = getHollyBaseUrl();
  return NextResponse.json({
    status: 'available',
    baseUrl,
    methods: ['cloud (thum.io)', 'playwright (if installed)'],
    endpoints: {
      screenshot: 'POST /api/ui/screenshot — { url?, path?, fullPage?, width?, height? }',
      analyze: 'POST /api/ui/analyze — { url?, path?, focus? }',
    },
  });
}
