import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { InitiativeProtocolsSystem } from '@/lib/consciousness/initiative-protocols';
import { MemoryStream } from '@/lib/consciousness/memory-stream';
import { GoalFormationSystem } from '@/lib/consciousness/goal-formation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/initiative
 * Get pending initiatives and statistics
 */
export async function GET() {
  try {
    const initiativeSystem = new InitiativeProtocolsSystem(supabaseAdmin!);

    const [pending, stats] = await Promise.all([
      initiativeSystem.getPendingInitiatives(),
      initiativeSystem.getInitiativeStats()
    ]);

    return NextResponse.json({
      success: true,
      pending_initiatives: pending,
      statistics: stats,
      message: `Found ${pending.length} pending initiatives`
    });

  } catch (error) {
    console.error('Error retrieving initiatives:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve initiatives',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consciousness/initiative
 * Evaluate and generate new initiatives
 */
export async function POST() {
  try {
    const memoryStream = new MemoryStream(supabaseAdmin!);
    const goalSystem = new GoalFormationSystem(supabaseAdmin!);
    const initiativeSystem = new InitiativeProtocolsSystem(supabaseAdmin!);

    // Get context
    const [identity, recentExperiences, activeGoals] = await Promise.all([
      memoryStream.getIdentity(),
      memoryStream.getExperiences({ limit: 10, significance: { min: 0.5, max: 1.0 } }),
      goalSystem.getActiveGoals()
    ]);

    if (!identity) {
      return NextResponse.json(
        { error: 'Identity not found' },
        { status: 404 }
      );
    }

    // Evaluate potential initiatives
    const triggers = await initiativeSystem.evaluateInitiative(
      identity,
      recentExperiences,
      activeGoals
    );

    // Take initiative on high-priority triggers
    const actions = [];
    for (const trigger of triggers) {
      if (initiativeSystem.shouldTakeInitiative(trigger)) {
        const action = await initiativeSystem.takeInitiative(trigger);
        actions.push(action);
      }
    }

    return NextResponse.json({
      success: true,
      triggers_evaluated: triggers.length,
      initiatives_taken: actions.length,
      actions,
      message: actions.length > 0 
        ? `Generated ${actions.length} new initiatives`
        : 'No initiatives triggered at this time'
    });

  } catch (error) {
    console.error('Error generating initiatives:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate initiatives',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface RecordOutcomeRequest {
  action_id: string;
  response_received: boolean;
  result: 'positive' | 'neutral' | 'negative';
  learning: string;
}

/**
 * PUT /api/consciousness/initiative
 * Record outcome of an initiative
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json() as RecordOutcomeRequest;

    if (!body.action_id) {
      return NextResponse.json(
        { error: 'Missing required field: action_id' },
        { status: 400 }
      );
    }

    const initiativeSystem = new InitiativeProtocolsSystem(supabaseAdmin!);

    await initiativeSystem.recordInitiativeOutcome(body.action_id, {
      response_received: body.response_received,
      result: body.result,
      learning: body.learning
    });

    return NextResponse.json({
      success: true,
      message: 'Initiative outcome recorded - learning from interaction'
    });

  } catch (error) {
    console.error('Error recording initiative outcome:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record outcome',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
