import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createTasteEngine } from '@/lib/taste/taste-engine';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    const tasteEngine = createTasteEngine(userId);

    switch (action) {
      case 'assess':
        {
          const { input, category, context } = params;
          if (!input || !category) {
            return NextResponse.json({ error: 'Missing input or category' }, { status: 400 });
          }
          const result = await tasteEngine.assess(input, category, context);
          return NextResponse.json({ success: true, assessment: result });
        }

      case 'assess_code':
        {
          const { code, context } = params;
          if (!code) {
            return NextResponse.json({ error: 'Missing code' }, { status: 400 });
          }
          const result = await tasteEngine.assessCode(code, context);
          return NextResponse.json({ success: true, assessment: result });
        }

      case 'assess_design':
        {
          const { design, context } = params;
          if (!design) {
            return NextResponse.json({ error: 'Missing design' }, { status: 400 });
          }
          const result = await tasteEngine.assessDesign(design, context);
          return NextResponse.json({ success: true, assessment: result });
        }

      case 'assess_content':
        {
          const { content, context } = params;
          if (!content) {
            return NextResponse.json({ error: 'Missing content' }, { status: 400 });
          }
          const result = await tasteEngine.assessContent(content, context);
          return NextResponse.json({ success: true, assessment: result });
        }

      case 'record_feedback':
        {
          const { subject, feedback, category, details } = params;
          if (!subject || !feedback || !category) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
          }
          await tasteEngine.recordFeedback(subject, feedback, category, details);
          return NextResponse.json({ success: true });
        }

      case 'get_profile':
        {
          const profile = await tasteEngine.getTasteProfile();
          return NextResponse.json({ success: true, profile });
        }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Taste API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}