import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { generateIdeas } from '@/lib/creative/content-creator';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category, context, count } = await req.json();
    
    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const result = await generateIdeas(
      category,
      context || {},
      userId,
      count || 5
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating ideas:', error);
    return NextResponse.json(
      { error: 'Failed to generate ideas' },
      { status: 500 }
    );
  }
}
