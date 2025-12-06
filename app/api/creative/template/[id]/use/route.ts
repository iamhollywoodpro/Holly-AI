import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { useTemplate } from '@/lib/creative/template-manager';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // useTemplate only takes templateId (1 param)
    const result = await useTemplate(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error using template:', error);
    return NextResponse.json(
      { error: 'Failed to use template' },
      { status: 500 }
    );
  }
}
