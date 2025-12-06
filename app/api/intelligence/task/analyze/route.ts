/**
 * POST /api/intelligence/task/analyze
 * Analyze a task
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeTask } from '@/lib/intelligence/task-intelligence';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { taskDescription, category, context } = body;

    if (!taskDescription || !category) {
      return NextResponse.json(
        { error: 'taskDescription and category are required' },
        { status: 400 }
      );
    }

    const result = await analyzeTask({
      taskDescription,
      category,
      context: context || {}
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to analyze task' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: result.analysis
    });
  } catch (error) {
    console.error('Error in task analyze API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
