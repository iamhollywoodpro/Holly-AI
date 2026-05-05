/**
 * POST /api/intelligence/learning/apply
 * Apply learned knowledge to current situation
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { applyLearning } from '@/lib/intelligence/learning-engine';

export const runtime = 'nodejs';


export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { category, context, similarityThreshold } = body;

    if (!category || !context) {
      return NextResponse.json(
        { error: 'Category and context are required' },
        { status: 400 }
      );
    }

    const result = await applyLearning({
      category,
      context,
      similarityThreshold: similarityThreshold || 0.7
    });

    return NextResponse.json({
      success: result.success,
      adapted: result.adapted,
      changes: result.changes,
      confidence: result.confidence,
      reasoning: result.reasoning
    });
  } catch (error) {
    console.error('Error in learning apply API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
