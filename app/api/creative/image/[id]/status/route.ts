import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { getImageStatus } from '@/lib/creative/image-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The 'id' parameter is the jobId for this endpoint
    const status = await getImageStatus(params.id);

    if (!status) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching image status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image status' },
      { status: 500 }
    );
  }
}
