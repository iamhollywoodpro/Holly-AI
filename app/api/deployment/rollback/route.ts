/**
 * AUTOMATED ROLLBACK API
 * 
 * Handles deployment rollbacks
 * Can be triggered manually or automatically
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { RollbackSystem } from '@/lib/deployment/rollback-system';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * GET: Check if rollback is needed
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const system = new RollbackSystem();

    if (action === 'status') {
      // Check if rollback is needed
      const shouldRollback = await system.shouldRollback();
      return NextResponse.json({
        success: true,
        shouldRollback: shouldRollback.should,
        reason: shouldRollback.reason
      });
    } else if (action === 'history') {
      // Get rollback history
      const history = await system.getRollbackHistory();
      return NextResponse.json({
        success: true,
        history
      });
    } else {
      // Check health
      const health = await system.checkDeploymentHealth(10);
      return NextResponse.json({
        success: true,
        health
      });
    }
  } catch (error: any) {
    console.error('[Rollback API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Perform rollback or monitor deployment
 */
export async function POST(request: Request) {
  try {
    // Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, reason, commitHash, waitSeconds } = body;

    const system = new RollbackSystem();

    if (action === 'rollback') {
      // Manual rollback
      console.log('[Rollback API] Initiating manual rollback...');
      
      const result = await system.performRollback(
        reason || 'Manual rollback requested'
      );

      return NextResponse.json({
        success: result.success,
        rollback: result
      });
    } else if (action === 'monitor') {
      // Monitor deployment and auto-rollback if needed
      console.log('[Rollback API] Monitoring deployment...');

      if (!commitHash) {
        return NextResponse.json(
          { error: 'commitHash is required for monitoring' },
          { status: 400 }
        );
      }

      const result = await system.monitorAndRollback(
        commitHash,
        waitSeconds || 60
      );

      return NextResponse.json({
        success: true,
        result
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "rollback" or "monitor"' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Rollback API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
