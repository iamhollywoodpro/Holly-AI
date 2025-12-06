import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateIdeas } from '@/lib/creative/content-creator';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { topic, count } = await req.json();
    
    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    // generateIdeas takes (topic, count) - 2 params ONLY
    const result = await generateIdeas(topic, count || 5);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating ideas:', error);
    return NextResponse.json(
      { error: 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}
