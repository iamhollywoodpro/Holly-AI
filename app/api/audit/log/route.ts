import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logAction } from '@/lib/security/audit-logger';

// POST /api/audit/log - Log audit action
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const result = await logAction({
      userId,
      action: body.action,
      details: body.details,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error logging audit action:', error);
    return NextResponse.json(
      { error: 'Failed to log audit action' },
      { status: 500 }
    );
  }
}
