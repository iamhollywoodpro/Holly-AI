import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { moderateContent } from '@/lib/security/content-moderator';

export const runtime = 'nodejs';


// POST /api/moderation/check - Moderate content
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.content || !body.type) {
      return NextResponse.json(
        { error: 'content and type are required' },
        { status: 400 }
      );
    }

    const result = await moderateContent(body.content, body.type);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error moderating content:', error);
    return NextResponse.json(
      { error: 'Failed to moderate content' },
      { status: 500 }
    );
  }
}
