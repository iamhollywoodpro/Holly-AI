import { NextRequest, NextResponse } from 'next/server';
import { SelfImprovement } from '@/lib/learning/self-improvement';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { timeRange = '30d' } = body as any;

    const improvement = new SelfImprovement();
    const analysis = await improvement.analyzePerformance(timeRange);

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error('Self-improvement analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'Performance analysis failed' },
      { status: 500 }
    );
  }
}
