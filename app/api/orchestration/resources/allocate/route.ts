import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { allocateResources } from '@/lib/orchestration/resource-allocator';

export const runtime = 'nodejs';


// POST /api/orchestration/resources/allocate - Allocate resources
export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.resourceType || typeof body.amount !== 'number') {
      return NextResponse.json(
        { error: 'resourceType and amount are required' },
        { status: 400 }
      );
    }

    const result = await allocateResources(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error allocating resources:', error);
    return NextResponse.json(
      { error: 'Failed to allocate resources' },
      { status: 500 }
    );
  }
}
