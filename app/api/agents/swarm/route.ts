/**
 * Multi-Agent Swarm API Endpoint
 * Phase 8.6.2 — Orchestrate complex tasks across specialized agents
 *
 * POST /api/agents/swarm — Submit a complex task for swarm processing
 * GET  /api/agents/swarm — Get swarm status and agent profiles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { swarmCoordinator } from '@/lib/agents/swarm-coordinator';

export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { task } = body;

    if (!task || typeof task !== 'string') {
      return NextResponse.json({ error: 'Missing required field: task' }, { status: 400 });
    }

    if (task.length > 5000) {
      return NextResponse.json({ error: 'Task description too long (max 5000 chars)' }, { status: 400 });
    }

    const plan = await swarmCoordinator.submitTask(task);

    return NextResponse.json({
      planId: plan.id,
      status: plan.status,
      taskCount: plan.tasks.length,
      tasks: plan.tasks.map(t => ({
        id: t.id,
        role: t.role,
        description: t.description,
        status: t.status,
        dependencies: t.dependencies,
      })),
      finalResult: plan.finalResult,
    });
  } catch (error) {
    console.error('[Swarm] Error:', error);
    return NextResponse.json({ error: 'Swarm processing failed' }, { status: 500 });
  }
}

export async function GET() {
  const agents = swarmCoordinator.getAgentProfiles();
  const activePlans = swarmCoordinator.getActivePlans();

  return NextResponse.json({
    agents: agents.map(a => ({
      role: a.role,
      name: a.name,
      capabilities: a.capabilities,
    })),
    activePlans: activePlans.length,
    plans: activePlans.map(p => ({
      id: p.id,
      status: p.status,
      taskCount: p.tasks.length,
      originalTask: p.originalTask.substring(0, 100),
    })),
  });
}
