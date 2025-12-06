import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { regenerateImage } from '@/lib/creative/image-generator';

export async function POST(req: Request, { params }: { params: { assetId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const result = await regenerateImage(params.assetId, body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true, jobId: result.jobId });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
