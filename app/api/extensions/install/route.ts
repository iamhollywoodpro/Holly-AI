/**
 * POST /api/extensions/install
 *
 * Install an extension for the current user. Idempotent — if already
 * installed, returns 200 with `alreadyInstalled: true`.
 *
 * Body: { extensionId: string }
 *
 * Gates:
 *   - Must be authenticated
 *   - NSFW extensions require requireAdult() (creator bypasses)
 *   - Premium extensions currently a no-op (everything free per Steve's directive)
 */

import { NextRequest, NextResponse } from 'next/server';
import { installExtension } from '@/lib/extensions/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { extensionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const { extensionId } = body;
  if (typeof extensionId !== 'string' || !extensionId.trim()) {
    return NextResponse.json(
      { error: 'extensionId is required', code: 'MISSING_EXTENSION_ID' },
      { status: 400 },
    );
  }

  try {
    const result = await installExtension(extensionId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.status },
      );
    }
    return NextResponse.json({
      success: true,
      extension: result.extension,
      alreadyInstalled: result.alreadyInstalled,
    });
  } catch (err) {
    console.error('[extensions/install] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to install extension', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
