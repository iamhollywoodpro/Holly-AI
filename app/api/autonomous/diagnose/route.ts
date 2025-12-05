/**
 * Self-Diagnosis API Endpoint
 * 
 * Runs comprehensive system diagnostics and returns health status
 * 
 * Phase 4: Autonomous Problem-Solving
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { selfDiagnosis } from '@/lib/autonomous/self-diagnosis';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication (admin only)
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get diagnostic target from query params
    const searchParams = req.nextUrl.searchParams;
    const target = searchParams.get('target') as 'all' | 'typescript' | 'api' | 'database' | 'streaming' | undefined;

    console.log(`[API:DIAGNOSE] Running diagnostics${target ? ` for ${target}` : ' (all systems)'}...`);

    // Run diagnostics
    const result = await selfDiagnosis.runDiagnostics(target);

    return NextResponse.json({
      success: true,
      diagnostics: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:DIAGNOSE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

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
    const { component, includeHistory } = body;

    console.log(`[API:DIAGNOSE] Running focused diagnostic for ${component}...`);

    // Run targeted diagnostic
    const result = await selfDiagnosis.runDiagnostics(component);

    // Optionally include historical issues
    let history = null;
    if (includeHistory) {
      history = await selfDiagnosis.getIssueHistory(component);
    }

    return NextResponse.json({
      success: true,
      diagnostics: result,
      history,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:DIAGNOSE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
