import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAgentStatus } from '@/lib/orchestration/agent-coordinator';

export const runtime = 'nodejs';


// GET /api/orchestration/agents/[id] - Get agent status
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getAgentStatus(params.id);

    if (!status) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting agent status:', error);
    return NextResponse.json(
      { error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}
