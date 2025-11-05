import { NextRequest, NextResponse } from 'next/server';
import { CrossProjectAI } from '@/lib/learning/cross-project-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { projects } = body as any;

    if (!projects || !Array.isArray(projects)) {
      return NextResponse.json(
        { error: 'Array of projects is required for cross-domain analysis' },
        { status: 400 }
      );
    }

    const crossProject = new CrossProjectAI();
    const patterns = await crossProject.findCrossDomainPatterns(projects);

    return NextResponse.json({ success: true, patterns });
  } catch (error: any) {
    console.error('Cross-project patterns API error:', error);
    return NextResponse.json(
      { error: error.message || 'Cross-domain pattern detection failed' },
      { status: 500 }
    );
  }
}
