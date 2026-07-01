/**
 * GET /api/extensions/installed
 *
 * Returns the extensions the current user has installed, with full manifest
 * data + per-user config and install metadata.
 */

import { NextResponse } from 'next/server';
import { listInstalledExtensions } from '@/lib/extensions/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await listInstalledExtensions();

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
