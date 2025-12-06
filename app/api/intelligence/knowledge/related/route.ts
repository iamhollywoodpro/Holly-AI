/**
 * GET /api/intelligence/knowledge/related
 * Get related knowledge nodes
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRelated } from '@/lib/intelligence/knowledge-graph';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const nodeId = searchParams.get('nodeId');
    const relationshipType = searchParams.get('relationshipType') || undefined;
    const minStrength = searchParams.get('minStrength')
      ? parseFloat(searchParams.get('minStrength')!)
      : undefined;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : undefined;

    if (!nodeId) {
      return NextResponse.json(
        { error: 'nodeId parameter is required' },
        { status: 400 }
      );
    }

    const related = await getRelated({
      nodeId,
      relationshipType,
      minStrength,
      limit
    });

    return NextResponse.json({
      success: true,
      related,
      count: related.length
    });
  } catch (error) {
    console.error('Error in knowledge related API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
