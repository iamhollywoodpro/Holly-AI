import { NextRequest, NextResponse } from 'next/server';
import { SelfImprovement } from '@/lib/learning/self-improvement';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { userId } = body as any;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const improvement = new SelfImprovement();
    const analysis = await improvement.analyzePerformance(userId);

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Self-improvement analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Performance analysis failed' },
      { status: 500 }
    );
  }
}
