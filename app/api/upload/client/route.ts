import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { r2Put, isR2Configured } from '@/lib/storage/r2-client';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isR2Configured()) {
      return NextResponse.json({ error: 'Cloudflare R2 is not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const extension = file.name.split('.').pop();
    const filename = `${folder}/${timestamp}_${randomString}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await r2Put(filename, buffer, file.type || 'application/octet-stream');

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.pathname,
      size: file.size,
    });
  } catch (error) {
    console.error('Client upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
