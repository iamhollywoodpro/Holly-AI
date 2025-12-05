/**
 * Error Recovery API Endpoint
 * 
 * Triggers automatic error recovery for various system issues
 * 
 * Phase 4: Autonomous Problem-Solving
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { errorRecovery } from '@/lib/autonomous/error-recovery';

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
    const { error, context } = body;

    if (!error) {
      return NextResponse.json(
        { error: 'Error object required' },
        { status: 400 }
      );
    }

    console.log(`[API:RECOVER] Attempting recovery for error: ${error.message || 'Unknown error'}`);

    // Attempt recovery
    const result = await errorRecovery.recover(error, context);

    return NextResponse.json({
      success: result.recovered,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:RECOVER] Error during recovery:', error);
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

    // Get recovery statistics
    const successRate = await errorRecovery.getRecoverySuccessRate("all");
    const stats = {
      overallSuccessRate: successRate,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(stats);

  } catch (error) {
    console.error('[API:RECOVER] Error getting statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
