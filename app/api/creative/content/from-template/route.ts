import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createFromTemplate } from '@/lib/creative/content-creator';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
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

    // createFromTemplate takes (templateId, variables) - 2 params ONLY
    // customization object is used as variables for template
    const result = await createFromTemplate(
      templateId,
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
