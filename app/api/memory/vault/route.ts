/**
 * POST /api/memory/vault — Memory Vault (2026-08-21)
 *
 * Downloads the user's full relationship with Holly as a human-readable
 * markdown document. Readable in any editor, no app or server required.
 * (The HPRF JSON export at /api/memory/export remains the restore format.)
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateMemoryVault } from '@/lib/memory/memory-vault';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await generateMemoryVault(clerkUserId);
    if (!result.success || !result.markdown) {
      return NextResponse.json(
        { error: result.error ?? 'Vault generation failed' },
        { status: 500 }
      );
    }

    const filename = `holly-memory-vault-${new Date().toISOString().split('T')[0]}.md`;

    return new NextResponse(result.markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[MemoryVault API] Error:', error);
    return NextResponse.json(
      { error: 'Vault generation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
