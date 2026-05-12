/**
 * Resource Costs API
 * 
 * GET /api/resources/costs - Get cost report
 */

import { NextRequest, NextResponse } from 'next/server';
import { resourceManager } from '@/lib/autonomy/resource-manager';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '24');

    // Get cost report
    const costReport = await resourceManager.getCostReport(hours);

    return NextResponse.json({
      success: true,
      report: costReport,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching cost report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch cost report'
      },
      { status: 500 }
    );
  }
}