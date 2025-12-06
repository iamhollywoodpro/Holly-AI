import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listUserImages } from '@/lib/creative/image-generator';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const images = await listUserImages(userId, {
      category: searchParams.get('category') || undefined,
      isFavorite: searchParams.get('isFavorite') === 'true',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    });
    return NextResponse.json({ success: true, images, count: images.length });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
