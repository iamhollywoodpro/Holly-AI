import { NextRequest, NextResponse } from 'next/server';
import { SelfImprovement } from '@/lib/learning/self-improvement';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workflowName, performanceData } = body;

    if (!workflowName) {
      return NextResponse.json(
        { error: 'Workflow name is required' },
        { status: 400 }
      );
    }

    const improvement = new SelfImprovement();
    const optimizations = await improvement.optimizeWorkflows(workflowName, performanceData);

    return NextResponse.json({ success: true, optimizations });
  } catch (error: any) {
    console.error('Self-improvement optimization API error:', error);
    return NextResponse.json(
      { error: error.message || 'Workflow optimization failed' },
      { status: 500 }
    );
  }
}
