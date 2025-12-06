/**
 * POST /api/intelligence/learning/record
 * Record new learning insight
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { recordLearning } from '@/lib/intelligence/learning-engine';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { category, type, title, description, evidence, confidence, actionable, priority, impact, relatedFiles, relatedPatterns, tags } = body;

    if (!category || !type || !title || !description) {
      return NextResponse.json(
        { error: 'Category, type, title, and description are required' },
        { status: 400 }
      );
    }

    const result = await recordLearning({
      category,
      type,
      title,
      description,
      evidence,
      confidence,
      actionable,
      priority,
      impact,
      relatedFiles,
      relatedPatterns,
      tags
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to record learning' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id
    });
  } catch (error) {
    console.error('Error in learning record API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
