import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { improveCopy } from '@/lib/creative/content-creator';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, goal } = await req.json();
    
    if (!content || !goal) {
      return NextResponse.json(
        { error: 'Content and goal are required' },
        { status: 400 }
      );
    }

    // improveCopy takes (original, goal) - 2 params ONLY
    const result = await improveCopy(content, goal);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error improving copy:', error);
    return NextResponse.json(
      { error: 'Failed to improve copy' },
      { status: 500 }
    );
  }
}
