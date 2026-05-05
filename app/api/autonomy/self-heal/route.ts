import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { monitorSystem } from '@/lib/autonomy/self-healing';
import { logger } from '@/lib/monitoring/logger';

export const runtime = 'nodejs';

/**
 * Self-Healing System API
 * Monitors HOLLY's health and proactively repairs detected anomalies
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    // Allow cron jobs or authenticated users
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!userId && (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Running autonomous self-healing check');

    // 1. Monitor system health & detect anomalies
    const healthCheck = await monitorSystem();
    const { issues: anomalies } = healthCheck;
    
    // 2. Phase 5: Trigger Autonomous Fixer (Neural Self-Genesis)
    let repairs = [];
    if (anomalies.length > 0) {
      const { triggerAutonomousRepair } = await import('@/lib/autonomy/autonomous-fixer');
      logger.warn('Anomalies detected, triggering autonomous repairs', { count: anomalies.length });
      
      for (const anomaly of anomalies) {
        if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
          const repair = await triggerAutonomousRepair(anomaly, userId || 'system');
          repairs.push(repair);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        health: healthCheck,
        anomalies,
        repairs,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Self-Healing API] Error:', error);
    logger.error('Self-healing system error', { error });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual health checks
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const healthMetrics = await monitorSystem();
    
    return NextResponse.json({
      success: true,
      data: {
        healthMetrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Self-Healing API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
