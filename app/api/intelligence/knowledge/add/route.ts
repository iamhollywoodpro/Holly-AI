/**
 * POST /api/intelligence/knowledge/add
 * Add new knowledge node
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { addKnowledge } from '@/lib/intelligence/knowledge-graph';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, content, tags, metadata } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Type and content are required' },
        { status: 400 }
      );
    }

    const result = await addKnowledge({
      type,
      content,
      tags: tags || [],
      metadata: metadata || {}
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to add knowledge' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      nodeId: result.nodeId,
      node: result.node
    });
  } catch (error) {
    console.error('Error in knowledge add API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
