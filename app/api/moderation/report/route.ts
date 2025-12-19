import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { reportContent } from '@/lib/security/content-moderator';

export const runtime = 'nodejs';


// POST /api/moderation/report - Report content
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.contentId || !body.reason) {
      return NextResponse.json(
        { error: 'contentId and reason are required' },
        { status: 400 }
      );
    }

    const result = await reportContent(body.contentId, body.reason, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reporting content:', error);
    return NextResponse.json(
      { error: 'Failed to report content' },
      { status: 500 }
    );
  }
}
