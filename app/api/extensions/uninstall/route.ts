/**
 * POST /api/extensions/uninstall
 *
 * Uninstall an extension for the current user. Returns 404 if not installed.
 *
 * Body: { extensionId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { uninstallExtension } from '@/lib/extensions/registry';

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
    const result = await uninstallExtension(extensionId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.status },
      );
    }
    return NextResponse.json({
      success: true,
      extension: result.extension,
      wasEnabled: result.wasEnabled,
    });
  } catch (err) {
    console.error('[extensions/uninstall] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Failed to uninstall extension', code: 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}
