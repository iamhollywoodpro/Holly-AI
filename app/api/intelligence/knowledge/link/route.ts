/**
 * POST /api/intelligence/knowledge/link
 * Create link between knowledge nodes
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { linkKnowledge } from '@/lib/intelligence/knowledge-graph';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fromNodeId, toNodeId, relationshipType, strength } = body;

    if (!fromNodeId || !toNodeId || !relationshipType) {
      return NextResponse.json(
        { error: 'fromNodeId, toNodeId, and relationshipType are required' },
        { status: 400 }
      );
    }

    const result = await linkKnowledge({
      fromNodeId,
      toNodeId,
      relationshipType,
      strength: strength || 1.0
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      linkId: result.linkId
    });
  } catch (error) {
    console.error('Error in knowledge link API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
