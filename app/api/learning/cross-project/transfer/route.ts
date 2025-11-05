import { NextRequest, NextResponse } from 'next/server';
import { CrossProjectAI } from '@/lib/learning/cross-project-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { fromProject, toProject } = body as any;

    if (!fromProject || !toProject) {
      return NextResponse.json(
        { error: 'Source and target projects are required' },
        { status: 400 }
      );
    }

    const crossProject = new CrossProjectAI();
    const approach = await crossProject.applyLearning(fromProject, toProject);

    return NextResponse.json({ success: true, approach });
  } catch (error: any) {
    console.error('Cross-project transfer API error:', error);
    return NextResponse.json(
      { error: error.message || 'Knowledge transfer failed' },
      { status: 500 }
    );
  }
}
