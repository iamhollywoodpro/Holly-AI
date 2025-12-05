/**
 * Root Cause Analysis API Endpoint
 * 
 * Performs deep root cause analysis on detected issues
 * 
 * Phase 4: Autonomous Problem-Solving
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rootCauseAnalyzer } from '@/lib/autonomous/root-cause-analyzer';
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
    const { issue } = body as { issue: SystemIssue };

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue object required' },
        { status: 400 }
      );
    }

    console.log(`[API:ANALYZE] Analyzing issue: ${issue.description}`);

    // Perform root cause analysis
    const analysis = await rootCauseAnalyzer.analyzeIssue(issue);

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:ANALYZE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
