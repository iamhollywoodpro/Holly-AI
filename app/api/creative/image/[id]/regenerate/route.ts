import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { regenerateImage } from '@/lib/creative/image-generator';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modifications = await req.json();

    // The 'id' parameter is the assetId for this endpoint
    const result = await regenerateImage(params.id, modifications);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to regenerate image' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error regenerating image:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate image' },
      { status: 500 }
    );
  }
}
