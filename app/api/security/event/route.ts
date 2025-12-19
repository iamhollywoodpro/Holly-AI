import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logSecurityEvent } from '@/lib/security/security-monitor';

export const runtime = 'nodejs';


// POST /api/security/event - Log security event
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.eventType || !body.severity) {
      return NextResponse.json(
        { error: 'eventType and severity are required' },
        { status: 400 }
      );
    }

    const result = await logSecurityEvent({
      userId,
      eventType: body.eventType,
      severity: body.severity,
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
    console.error('Error logging security event:', error);
    return NextResponse.json(
      { error: 'Failed to log security event' },
      { status: 500 }
    );
  }
}
