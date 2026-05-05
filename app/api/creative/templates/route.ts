import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listTemplates } from '@/lib/creative/template-manager';

export const runtime = 'nodejs';


export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || undefined;
    const category = searchParams.get('category') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const isPublic = searchParams.get('isPublic') === 'true' ? true : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // listTemplates takes ONLY filters (NO userId)
    const templates = await listTemplates({
      type,
      category,
      tags,
      isPublic,
      limit
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}
