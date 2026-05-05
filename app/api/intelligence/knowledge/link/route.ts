/**
 * POST /api/intelligence/knowledge/link
 * Create link between knowledge nodes
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { linkKnowledge } from '@/lib/intelligence/knowledge-graph';

export const runtime = 'nodejs';


export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fromId, toId, type, strength, metadata } = body;

    if (!fromId || !toId || !type) {
      return NextResponse.json(
        { error: 'fromId, toId, and type are required' },
        { status: 400 }
      );
    }

    const linkId = await linkKnowledge(fromId, toId, {
      type,
      strength,
      metadata
    });

    return NextResponse.json({
      success: true,
      linkId
    });
  } catch (error) {
    console.error('Error in knowledge link API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
