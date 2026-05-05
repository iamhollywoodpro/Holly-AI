import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { pauseWorkflow, resumeWorkflow, cancelWorkflow } from '@/lib/orchestration/workflow-engine';

export const runtime = 'nodejs';


// POST /api/orchestration/workflows/[id]/control - Control workflow (pause/resume/cancel)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.action) {
      return NextResponse.json(
        { error: 'action is required (pause, resume, cancel)' },
        { status: 400 }
      );
    }

    let result;
    switch (body.action) {
      case 'pause':
        result = await pauseWorkflow(params.id);
        break;
      case 'resume':
        result = await resumeWorkflow(params.id);
        break;
      case 'cancel':
        result = await cancelWorkflow(params.id);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: pause, resume, or cancel' },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error controlling workflow:', error);
    return NextResponse.json(
      { error: 'Failed to control workflow' },
      { status: 500 }
    );
  }
}
