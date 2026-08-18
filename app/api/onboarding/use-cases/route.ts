import { NextRequest, NextResponse } from 'next/server';
import { authenticateAndLoadUser } from '@/lib/chat/auth';
import { installExtension } from '@/lib/extensions/registry';
import { starterExtensionsFor, USE_CASES } from '@/lib/onboarding/use-cases';

export const dynamic = 'force-dynamic';

export const GET = async () =>
  NextResponse.json({
    useCases: USE_CASES.map(({ id, label, description, icon, starterExtensions }) => ({
      id,
      label,
      description,
      icon,
      starterExtensionCount: starterExtensions.length,
    })),
  });

/**
 * POST { useCases: string[] }
 * Auto-installs the curated starter extensions for each selected use case.
 * Idempotent — re-submitting the same selections installs nothing new.
 */
export const POST = async (req: NextRequest) => {
  try {
    const auth = await authenticateAndLoadUser();
    if (!auth?.userId || !auth.dbUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const useCaseIds: unknown = body?.useCases;
    if (!Array.isArray(useCaseIds) || useCaseIds.length === 0) {
      return NextResponse.json({ error: 'useCases must be a non-empty array' }, { status: 400 });
    }
    if (useCaseIds.length > USE_CASES.length || useCaseIds.some(id => typeof id !== 'string')) {
      return NextResponse.json({ error: 'Invalid use case selection' }, { status: 400 });
    }

    const extensionIds = starterExtensionsFor(useCaseIds as string[]);
    const installed: string[] = [];
    const failed: { extensionId: string; reason: string }[] = [];

    for (const extensionId of extensionIds) {
      const result = await installExtension(extensionId, { autoInstalled: true });
      if (result.ok) {
        installed.push(extensionId);
      } else {
        failed.push({ extensionId, reason: result.message });
      }
    }

    return NextResponse.json({
      success: failed.length === 0,
      installed,
      failed,
    });
  } catch (err) {
    console.error('[ONBOARDING][USE-CASES] Failed:', err);
    return NextResponse.json({ error: 'Failed to save use cases' }, { status: 500 });
  }
};
