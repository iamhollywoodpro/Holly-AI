import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getCodebaseStructure,
  readCodebaseFile,
  searchCodebase,
  getCapabilitySummary,
  getDeploymentInfo
} from '@/lib/tools/codebase-access';

export const runtime = 'nodejs';

/**
 * Codebase Access API
 * Allows HOLLY to read and understand her own codebase
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, path, pattern } = body;

    switch (action) {
      case 'structure':
        const structure = await getCodebaseStructure(path || '');
        return NextResponse.json({ success: true, data: structure });

      case 'read':
        if (!path) {
          return NextResponse.json({ error: 'Path required' }, { status: 400 });
        }
        const content = await readCodebaseFile(path);
        return NextResponse.json({ success: true, data: { path, content } });

      case 'search':
        if (!pattern) {
          return NextResponse.json({ error: 'Pattern required' }, { status: 400 });
        }
        const results = await searchCodebase(pattern, path);
        return NextResponse.json({ success: true, data: { results } });

      case 'capabilities':
        const capabilities = await getCapabilitySummary();
        return NextResponse.json({ success: true, data: capabilities });

      case 'deployment':
        const deployment = await getDeploymentInfo();
        return NextResponse.json({ success: true, data: deployment });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Codebase API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default: return capability summary
    const capabilities = await getCapabilitySummary();
    const deployment = await getDeploymentInfo();

    return NextResponse.json({
      success: true,
      data: {
        capabilities,
        deployment
      }
    });
  } catch (error) {
    console.error('[Codebase API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
