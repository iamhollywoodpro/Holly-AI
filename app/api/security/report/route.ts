import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSecurityReport } from '@/lib/security/security-monitor';

// GET /api/security/report - Get security report
export async function GET(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity') || undefined;
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined;
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined;
    const limit = searchParams.get('limit') 
      ? parseInt(searchParams.get('limit')!) 
      : undefined;

    const report = await getSecurityReport({
      userId,
      severity,
      startDate,
      endDate,
      limit,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating security report:', error);
    return NextResponse.json(
      { error: 'Failed to generate security report' },
      { status: 500 }
    );
  }
}
