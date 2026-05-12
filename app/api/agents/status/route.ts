import { NextResponse } from 'next/server';
import { agentCoordinator } from '@/lib/autonomy/agent-coordinator';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [status, taskMetrics] = await Promise.all([
      agentCoordinator.getCoordinatorStatus(),
      agentCoordinator.getTaskMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      coordinator: status,
      tasks: taskMetrics,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get agent status' },
      { status: 500 }
    );
  }
}