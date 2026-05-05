/**
 * Web Agent Execute API
 * Execute web automation tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { taskExecutor } from '@/lib/web-agent/task-executor';

export interface ExecuteRequest {
  sessionId: string;
  task: {
    type: 'navigate' | 'extract' | 'interact' | 'screenshot' | 'custom';
    description: string;
    url?: string;
    selector?: string;
    action?: 'click' | 'fill';
    value?: string;
    script?: string;
    multiple?: boolean;
    fullPage?: boolean;
  };
}

/**
 * POST /api/web-agent/execute
 * Execute a web automation task
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ExecuteRequest = await req.json();
    const { sessionId, task } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    if (!task || !task.type) {
      return NextResponse.json(
        { error: 'task.type is required' },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    if (!sessionId.includes(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let result;

    switch (task.type) {
      case 'navigate':
        if (!task.url) {
          return NextResponse.json(
            { error: 'task.url is required for navigate' },
            { status: 400 }
          );
        }
        result = await taskExecutor.executeNavigate(
          sessionId,
          task.url,
          task.description
        );
        break;

      case 'extract':
        if (!task.selector) {
          return NextResponse.json(
            { error: 'task.selector is required for extract' },
            { status: 400 }
          );
        }
        result = await taskExecutor.executeExtract(
          sessionId,
          task.selector,
          task.description,
          task.multiple || false
        );
        break;

      case 'interact':
        if (!task.selector || !task.action) {
          return NextResponse.json(
            { error: 'task.selector and task.action are required for interact' },
            { status: 400 }
          );
        }
        result = await taskExecutor.executeInteract(
          sessionId,
          task.action,
          task.selector,
          task.value,
          task.description
        );
        break;

      case 'screenshot':
        result = await taskExecutor.executeScreenshot(
          sessionId,
          task.description,
          task.fullPage || false
        );
        break;

      case 'custom':
        if (!task.script) {
          return NextResponse.json(
            { error: 'task.script is required for custom' },
            { status: 400 }
          );
        }
        result = await taskExecutor.executeCustom(
          sessionId,
          task.script,
          task.description
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown task type: ${task.type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      data: result.data,
      screenshot: result.screenshot,
      error: result.error,
    });
  } catch (error: any) {
    console.error('[WebAgent] Task execution failed:', error);

    return NextResponse.json(
      { error: `Task execution failed: ${error.message}` },
      { status: 500 }
    );
  }
}
