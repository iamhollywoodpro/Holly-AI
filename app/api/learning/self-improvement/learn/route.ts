import { NextRequest, NextResponse } from 'next/server';
import { SelfImprovement } from '@/lib/learning/self-improvement';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { skillArea } = body as any;

    if (!skillArea) {
      return NextResponse.json(
        { error: 'Skill area is required' },
        { status: 400 }
      );
    }

    const improvement = new SelfImprovement();
    const result = await improvement.learnNewSkill(skillArea);

    return NextResponse.json({ success: true, learning: result });
  } catch (error: any) {
    console.error('Self-improvement learning API error:', error);
    return NextResponse.json(
      { error: error.message || 'Skill learning failed' },
      { status: 500 }
    );
  }
}
