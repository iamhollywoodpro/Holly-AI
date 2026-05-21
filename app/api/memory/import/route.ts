/**
 * POST /api/memory/import — Phase 16: Memory Portability
 *
 * Imports a Holly Portable Relationship Format (HPRF) v1.0 file.
 * Supports merge strategies: replace, merge, append.
 * Optional dryRun mode to validate without writing.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { importFullRelationship } from '@/lib/memory/memory-portability';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const authResult = await auth();
    const clerkUserId = authResult.userId;
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { data, options } = body as {
      data: unknown;
      options?: {
        skipExisting?: boolean;
        mergeStrategy?: 'replace' | 'merge' | 'append';
        maxImport?: number;
        dryRun?: boolean;
      };
    };

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { error: 'Invalid import data — expected HPRF v1.0 JSON object' },
        { status: 400 }
      );
    }

    // Validate it looks like a HPRF file
    const hprf = data as Record<string, unknown>;
    if (hprf.version !== '1.0' || !hprf.data) {
      return NextResponse.json(
        { error: 'Not a valid HPRF v1.0 file — missing version or data fields' },
        { status: 400 }
      );
    }

    const result = await importFullRelationship(
      clerkUserId,
      data as Parameters<typeof importFullRelationship>[1],
      options
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('[MemoryImport API] Error:', error);
    return NextResponse.json(
      { error: 'Import failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
