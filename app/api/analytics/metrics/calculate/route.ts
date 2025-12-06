import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { calculateMetric } from '@/lib/analytics/metrics-aggregator';

// POST /api/analytics/metrics/calculate - Calculate metric value
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.metricName || typeof body.newValue !== 'number') {
      return NextResponse.json(
        { error: 'metricName and newValue are required' },
        { status: 400 }
      );
    }

    const result = await calculateMetric(body.metricName, body.newValue);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error calculating metric:', error);
    return NextResponse.json(
      { error: 'Failed to calculate metric' },
      { status: 500 }
    );
  }
}
