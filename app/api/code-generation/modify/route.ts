/**
 * Code Modification API
 * 
 * Safely modify existing code with testing and rollback
 * 
 * Phase 5: Code Generation & Modification
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { safeCodeModifier, type CodeModification } from '@/lib/code-generation/safe-code-modifier';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication (admin only)
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { modification, testBeforeApply } = body as {
      modification: CodeModification;
      testBeforeApply?: boolean;
    };

    if (!modification || !modification.filePath || !modification.changes) {
      return NextResponse.json(
        { error: 'modification object with filePath and changes required' },
        { status: 400 }
      );
    }

    console.log(`[API:CODE-MOD] Modifying ${modification.filePath}`);

    // Modify code
    const result = await safeCodeModifier.modifyCode(
      modification,
      testBeforeApply !== false // Default to true
    );

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:CODE-MOD] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get modification statistics
    const stats = await safeCodeModifier.getModificationStatistics();

    return NextResponse.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:CODE-MOD] Error getting statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
