import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createFromTemplate } from '@/lib/creative/content-creator';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId, customization } = await req.json();
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const result = await createFromTemplate(
      templateId,
      userId,
      customization || {}
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating from template:', error);
    return NextResponse.json(
      { error: 'Failed to create from template' },
      { status: 500 }
    );
  }
}
