import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const suggestions = ["Tell me about your latest project ideas","Help me debug a coding issue","Design a user interface for my app","Explain a technical concept","Review my code architecture"];
    return NextResponse.json({ suggestions });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to generate suggestions', message: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'online', version: 'Static Suggestions v1.0' });
}
