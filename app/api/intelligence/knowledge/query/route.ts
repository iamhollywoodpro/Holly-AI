/**
 * GET /api/intelligence/knowledge/query
 * Query knowledge graph
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { queryKnowledge } from '@/lib/intelligence/knowledge-graph';

export const runtime = 'nodejs';


export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const entityType = searchParams.get('entityType') || undefined;
    const minConfidence = searchParams.get('minConfidence')
      ? parseFloat(searchParams.get('minConfidence')!)
      : undefined;
    const limit = searchParams.get('limit') 
      ? parseInt(searchParams.get('limit')!) 
      : undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const nodes = await queryKnowledge(query, {
      entityType,
      minConfidence,
      limit
    });

    return NextResponse.json({
      success: true,
      nodes,
      count: nodes.length
    });
  } catch (error) {
    console.error('Error in knowledge query API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
