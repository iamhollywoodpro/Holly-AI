/**
 * GET /api/extensions/list
 *
 * Returns the full extension catalog with the current user's install state
 * overlaid. Optional `?suite=music` to filter by suite.
 *
 * Public-ish: any signed-in user can browse. NSFW extensions are included
 * in the list regardless of age verification — install is gated separately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { listAvailableExtensions } from '@/lib/extensions/registry';
import { ALL_SUITES, type ExtensionSuite } from '@/lib/extensions/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const suiteParam = searchParams.get('suite') as ExtensionSuite | null;

  if (suiteParam && !ALL_SUITES.includes(suiteParam)) {
    return NextResponse.json(
      { error: `Invalid suite. Valid suites: ${ALL_SUITES.join(', ')}` },
      { status: 400 },
    );
  }

  const result = await listAvailableExtensions(suiteParam ?? undefined);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.status },
    );
  }

  return NextResponse.json({
    extensions: result.extensions,
    count: result.extensions.length,
  });
}
