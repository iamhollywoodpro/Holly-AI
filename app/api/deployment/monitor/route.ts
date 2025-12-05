/**
 * Monitoring API
 * 
 * Get deployment health and metrics
 * 
 * Phase 6: Controlled Deployment & Monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { deploymentMonitor } from '@/lib/deployment/deployment-monitor';

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

    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'health') {
      // Get deployment health
      const health = await deploymentMonitor.getDeploymentHealth();
      return NextResponse.json({
        success: true,
        health,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'metrics') {
      // Get metrics history
      const limit = parseInt(searchParams.get('limit') || '100', 10);
      const metrics = deploymentMonitor.getMetricsHistory(limit);
      return NextResponse.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'compare') {
      // Compare with baseline
      const comparison = await deploymentMonitor.compareWithBaseline();
      return NextResponse.json({
        success: true,
        comparison,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'stats') {
      // Get monitoring statistics
      const stats = await deploymentMonitor.getMonitoringStatistics();
      return NextResponse.json({
        success: true,
        statistics: stats,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=health, metrics, compare, or stats' },
      { status: 400 }
    );

  } catch (error) {
    console.error('[API:MONITOR] Error:', error);
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
    const { metrics } = body;

    if (!metrics) {
      return NextResponse.json(
        { error: 'metrics object required' },
        { status: 400 }
      );
    }

    // Record new metrics
    deploymentMonitor.recordMetrics(metrics);

    // Check for anomalies
    const health = await deploymentMonitor.getDeploymentHealth();
    
    // Alert on critical anomalies
    for (const anomaly of health.anomalies) {
      if (anomaly.severity === 'critical') {
        await deploymentMonitor.sendAlert(anomaly);
      }
    }

    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API:MONITOR] Error recording metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
