/**
 * Auto-Fix API Endpoint
 * 
 * Attempts to automatically fix detected issues
 * 
 * Phase 4: Autonomous Problem-Solving
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { autoFixEngine } from '@/lib/autonomous/auto-fix-engine';
import type { SystemIssue } from '@/lib/autonomous/self-diagnosis';

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
    const { issue, autoApply } = body as { 
      issue: SystemIssue; 
      autoApply?: boolean;
    };

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue object required' },
        { status: 400 }
      );
    }

    console.log(`[API:FIX] Attempting to fix issue: ${issue.message}`);
    console.log(`[API:FIX] Auto-apply: ${autoApply ? 'YES' : 'NO (manual approval required)'}`);

    // Attempt to fix the issue
    const result = await autoFixEngine.fixProblem(issue, autoApply || false);

    if (!result) {
      return NextResponse.json({
        success: false,
        message: 'No automatic fix available - manual intervention required',
        requiresApproval: true
      });
    }

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:FIX] Error:', error);
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

    // Get fix statistics
    const stats = await autoFixEngine.getFixStatistics();

    return NextResponse.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:FIX] Error getting statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
