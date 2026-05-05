import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/security/security-monitor';

export const runtime = 'nodejs';


// POST /api/security/rate-limit/check - Check rate limit
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

    const result = await checkRateLimit(userId, body.action);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return NextResponse.json(
      { error: 'Failed to check rate limit' },
      { status: 500 }
    );
  }
}
