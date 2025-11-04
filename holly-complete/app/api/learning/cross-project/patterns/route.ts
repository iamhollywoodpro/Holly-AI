import { NextRequest, NextResponse } from 'next/server';
import { CrossProjectAI } from '@/lib/learning/cross-project-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { domain1, domain2 } = body;

    if (!domain1 || !domain2) {
      return NextResponse.json(
        { error: 'Two domains are required for cross-domain analysis' },
        { status: 400 }
      );
    }

    const crossProject = new CrossProjectAI();
    const patterns = await crossProject.findCrossDomainPatterns(domain1, domain2);

    return NextResponse.json({ success: true, patterns });
  } catch (error: any) {
    console.error('Cross-project patterns API error:', error);
    return NextResponse.json(
      { error: error.message || 'Cross-domain pattern detection failed' },
      { status: 500 }
    );
  }
}
