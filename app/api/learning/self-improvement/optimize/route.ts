import { NextRequest, NextResponse } from 'next/server';
import { SelfImprovement } from '@/lib/learning/self-improvement';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const { workflowId } = body as any;

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    const improvement = new SelfImprovement();
    await improvement.optimizeWorkflow(workflowId);
    const optimizations = { message: 'Workflow optimized successfully' };

    return NextResponse.json({ success: true, optimizations });
  } catch (error: any) {
    console.error('Self-improvement optimization API error:', error);
    return NextResponse.json(
      { error: error.message || 'Workflow optimization failed' },
      { status: 500 }
    );
  }
}
