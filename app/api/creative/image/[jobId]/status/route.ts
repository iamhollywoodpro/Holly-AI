import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getImageStatus } from '@/lib/creative/image-generator';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const status = await getImageStatus(params.jobId);
    if (!status) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
