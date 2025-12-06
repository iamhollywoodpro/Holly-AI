import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateContent } from '@/lib/creative/content-creator';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, topic, parameters } = await req.json();
    
    if (!type || !topic) {
      return NextResponse.json(
        { error: 'Type and topic are required' },
        { status: 400 }
      );
    }

    // generateContent takes (userId, type, prompt, options)
    const result = await generateContent(userId, type, topic, parameters || {});

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
