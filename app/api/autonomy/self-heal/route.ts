import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { monitorSystem, detectAnomalies, proposeImprovements } from '@/lib/autonomy/self-healing';
import { logger } from '@/lib/monitoring/logger';

export const runtime = 'nodejs';

/**
 * Self-Healing System API
 * Monitors HOLLY's health and proposes improvements
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

    logger.info('Running self-healing system check');

    // Monitor system health
    const healthMetrics = await monitorSystem();
    
    // Detect anomalies
    const anomalies = await detectAnomalies(healthMetrics);
    
    // Propose improvements if anomalies detected
    let improvements = [];
    if (anomalies.length > 0) {
      logger.warn('Anomalies detected', { count: anomalies.length, anomalies });
      improvements = await proposeImprovements(anomalies);
      
      // Log each proposed improvement
      for (const improvement of improvements) {
        logger.selfHealing({
          anomaly: improvement.triggerType,
          proposedFix: improvement.solution,
          priority: improvement.priority,
          autoFixable: improvement.autoFixable
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        healthMetrics,
        anomalies,
        improvements,
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
