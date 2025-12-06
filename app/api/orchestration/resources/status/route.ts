import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getResourceUtilization } from '@/lib/orchestration/resource-allocator';

// GET /api/orchestration/resources/status - Get resource utilization
export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const utilization = await getResourceUtilization();

    return NextResponse.json(utilization);
  } catch (error) {
    console.error('Error getting resource utilization:', error);
    return NextResponse.json(
      { error: 'Failed to get resource utilization' },
      { status: 500 }
    );
  }
}
