import { NextResponse } from 'next/server';
import { monitoringEngine } from '@/lib/autonomy/monitoring-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = await monitoringEngine.runAllChecks();
    const activeAlerts = monitoringEngine.getActiveAlerts();
    const overallHealth = monitoringEngine.getOverallHealth();

    return NextResponse.json({
      status: overallHealth,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      metrics: {
        memory: metrics.memory.toFixed(1) + '%',
        avgResponseTime: Math.round(metrics.avgResponseTime) + 'ms',
        errorRate: (metrics.errorRate * 100).toFixed(1) + '%',
        subsystemsCount: Object.keys(metrics.subsystems).length,
      },
      subsystems: metrics.subsystems,
      activeAlerts: activeAlerts.length,
      alerts: activeAlerts.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}