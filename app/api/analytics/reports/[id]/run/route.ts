import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runReport } from '@/lib/analytics/report-generator';

export const runtime = 'nodejs';


// POST /api/analytics/reports/[id]/run - Execute report
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runReport(params.id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error running report:', error);
    return NextResponse.json(
      { error: 'Failed to run report' },
      { status: 500 }
    );
  }
}
