import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { addTags } from '@/lib/creative/asset-manager';

export const runtime = 'nodejs';


export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tags } = await req.json();
    
    if (!Array.isArray(tags)) {
      return NextResponse.json(
        { error: 'Tags must be an array' },
        { status: 400 }
      );
    }

    // addTags takes (assetId, tags) - 2 params ONLY
    const result = await addTags(params.id, tags);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding tags:', error);
    return NextResponse.json(
      { error: 'Failed to add tags' },
      { status: 500 }
    );
  }
}
