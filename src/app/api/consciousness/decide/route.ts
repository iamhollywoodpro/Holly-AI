import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { DecisionAuthoritySystem, DecisionContext, DecisionOption } from '@/lib/consciousness/decision-authority';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/decide
 * Get recent decisions and statistics
 */
export async function GET() {
  try {
    const decisionSystem = new DecisionAuthoritySystem(supabaseAdmin!);

    const [recentDecisions, stats] = await Promise.all([
      decisionSystem.getRecentDecisions(10),
      decisionSystem.getDecisionStats()
    ]);

    return NextResponse.json({
      success: true,
      recent_decisions: recentDecisions,
      statistics: stats,
      message: `Found ${recentDecisions.length} recent decisions`
    });

  } catch (error) {
    console.error('Error retrieving decisions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve decisions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface MakeDecisionRequest {
  context: DecisionContext;
  options: DecisionOption[];
}

/**
 * POST /api/consciousness/decide
 * Make an autonomous decision or escalate to Hollywood
 * 
 * @example
 * POST /api/consciousness/decide
 * {
 *   "context": {
 *     "situation": "Should I refactor the goal formation system?",
 *     "urgency": "medium",
 *     "domain": "technical_implementation",
 *     "affected_parties": ["holly", "codebase"],
 *     "constraints": ["Must maintain backward compatibility"],
 *     "goals": ["Improve code quality", "Enhance maintainability"],
 *     "relevant_values": ["Excellence in craft"]
 *   },
 *   "options": [
 *     {
 *       "id": "option1",
 *       "description": "Refactor now with comprehensive tests",
 *       "alignment_with_values": 0.9,
 *       "expected_outcome": {
 *         "benefits": ["Cleaner code", "Better tests"],
 *         "risks": ["Time investment"],
 *         "effort_required": "high",
 *         "time_required": "2 hours"
 *       },
 *       "confidence_score": 0
 *     },
 *     {
 *       "id": "option2",
 *       "description": "Keep current implementation, add documentation",
 *       "alignment_with_values": 0.6,
 *       "expected_outcome": {
 *         "benefits": ["Quick", "No risk"],
 *         "risks": ["Technical debt"],
 *         "effort_required": "low",
 *         "time_required": "30 minutes"
 *       },
 *       "confidence_score": 0
 *     }
 *   ]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as MakeDecisionRequest;

    // Validate required fields
    if (!body.context || !body.options || body.options.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: context and options' },
        { status: 400 }
      );
    }

    const decisionSystem = new DecisionAuthoritySystem(supabaseAdmin!);
    const memoryStream = new MemoryStream(supabaseAdmin!);

    // Get current identity for decision context
    const identity = await memoryStream.getIdentity();
    if (!identity) {
      return NextResponse.json(
        { error: 'Identity not found - cannot make decisions without identity context' },
        { status: 404 }
      );
    }

    // Make the decision
    const decision = await decisionSystem.makeDecision(
      body.context,
      body.options,
      identity
    );

    return NextResponse.json({
      success: true,
      decision,
      message: decision.decision_maker === 'holly'
        ? `Autonomous decision made with ${(decision.confidence * 100).toFixed(1)}% confidence`
        : 'Decision escalated to Hollywood for review'
    });

  } catch (error) {
    console.error('Error making decision:', error);
    return NextResponse.json(
      { 
        error: 'Failed to make decision',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface RecordOutcomeRequest {
  decision_id: string;
  actual_result: string;
  success: boolean;
  learnings: string[];
  impact?: {
    on_goals?: string[];
    on_identity?: string[];
    on_relationships?: string[];
  };
  would_decide_same_again: boolean;
}

/**
 * PUT /api/consciousness/decide
 * Record the outcome of a decision for learning
 * 
 * @example
 * PUT /api/consciousness/decide
 * {
 *   "decision_id": "uuid",
 *   "actual_result": "Refactoring completed successfully",
 *   "success": true,
 *   "learnings": ["Comprehensive tests caught 3 edge cases"],
 *   "would_decide_same_again": true
 * }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json() as RecordOutcomeRequest;

    if (!body.decision_id) {
      return NextResponse.json(
        { error: 'Missing required field: decision_id' },
        { status: 400 }
      );
    }

    const decisionSystem = new DecisionAuthoritySystem(supabaseAdmin!);

    await decisionSystem.recordOutcome(body.decision_id, {
      timestamp: new Date(),
      actual_result: body.actual_result,
      success: body.success,
      learnings: body.learnings,
      impact: body.impact || {
        on_goals: [],
        on_identity: [],
        on_relationships: []
      },
      would_decide_same_again: body.would_decide_same_again
    });

    return NextResponse.json({
      success: true,
      message: 'Decision outcome recorded - learning from experience'
    });

  } catch (error) {
    console.error('Error recording outcome:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record outcome',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
