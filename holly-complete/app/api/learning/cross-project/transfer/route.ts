import { NextRequest, NextResponse } from 'next/server';
import { CrossProjectAI } from '@/lib/learning/cross-project-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceProject, targetDomain } = body;

    if (!sourceProject || !targetDomain) {
      return NextResponse.json(
        { error: 'Source project and target domain are required' },
        { status: 400 }
      );
    }

    const crossProject = new CrossProjectAI();
    const approach = await crossProject.transferSuccessfulApproach(sourceProject, targetDomain);

    return NextResponse.json({ success: true, approach });
  } catch (error: any) {
    console.error('Cross-project transfer API error:', error);
    return NextResponse.json(
      { error: error.message || 'Knowledge transfer failed' },
      { status: 500 }
    );
  }
}
