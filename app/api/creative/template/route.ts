import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createTemplate } from '@/lib/creative/template-manager';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templateData = await req.json();
    
    if (!templateData.name || !templateData.type) {
      return NextResponse.json(
        { error: 'Template name and type are required' },
        { status: 400 }
      );
    }

    const result = await createTemplate(templateData, userId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
