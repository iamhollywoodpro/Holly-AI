import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { ContextualIntelligence } from '@/lib/learning/contextual-intelligence';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { projectName, projectType, technologies, metadata } = await req.json();
    const contextual = new ContextualIntelligence(userId);
    const project = await contextual.trackProject({ projectName, projectType, technologies, metadata });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
