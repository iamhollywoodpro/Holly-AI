import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { checkImageSafety } from '@/lib/security/content-moderator';

export const runtime = 'nodejs';


// POST /api/moderation/image - Check image safety
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    const result = await checkImageSafety(body.imageUrl);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking image safety:', error);
    return NextResponse.json(
      { error: 'Failed to check image safety' },
      { status: 500 }
    );
  }
}
