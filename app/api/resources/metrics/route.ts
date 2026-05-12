/**
 * Resource Metrics API
 * 
 * GET /api/resources/metrics - Get current resource metrics
 * GET /api/resources/metrics?hours=24 - Get historical metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { resourceManager } from '@/lib/autonomy/resource-manager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '1');

    // Get current metrics
    const currentMetrics = await resourceManager.getCurrentMetrics();

    // Get utilization report
    const utilizationReport = await resourceManager.getUtilizationReport(hours);

    return NextResponse.json({
      success: true,
      current: currentMetrics,
      report: utilizationReport,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching resource metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch resource metrics'
      },
      { status: 500 }
    );
  }
}