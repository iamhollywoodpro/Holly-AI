/**
 * GET /api/intelligence/knowledge/query
 * Query knowledge graph
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { queryKnowledge } from '@/lib/intelligence/knowledge-graph';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const type = searchParams.get('type') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const limit = searchParams.get('limit') 
      ? parseInt(searchParams.get('limit')!) 
      : undefined;

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const nodes = await queryKnowledge({
      query,
      type,
      tags,
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
