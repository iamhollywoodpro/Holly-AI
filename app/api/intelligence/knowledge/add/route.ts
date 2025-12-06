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
    const { entityType, entityId, name, description, metadata, confidence } = body;

    if (!entityType || !name) {
      return NextResponse.json(
        { error: 'entityType and name are required' },
        { status: 400 }
      );
    }

    const nodeId = await addKnowledge({
      entityType,
      entityId,
      name,
      description,
      metadata,
      confidence
    });

    return NextResponse.json({
      success: true,
      nodeId
    });
  } catch (error) {
    console.error('Error in knowledge add API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
