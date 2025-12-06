import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAuditSummary } from '@/lib/security/audit-logger';

// GET /api/audit/summary - Get audit summary
export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filterUserId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined;

    const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
    const summary = await getAuditSummary(filterUserId, dateRange);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit summary' },
      { status: 500 }
    );
  }
}
