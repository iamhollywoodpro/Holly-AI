import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { SelfModificationSystem } from '@/lib/consciousness/self-modification';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/self-modify
 * Get pending modification proposals and statistics
 */
export async function GET() {
  try {
    const modSystem = new SelfModificationSystem(supabaseAdmin!);

    const [pending, stats] = await Promise.all([
      modSystem.getPendingProposals(),
      modSystem.getModificationStats()
    ]);

    return NextResponse.json({
      success: true,
      pending_proposals: pending,
      statistics: stats,
      message: `Found ${pending.length} pending modifications`
    });

  } catch (error) {
    console.error('Error retrieving modifications:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve modifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface ProposeModificationRequest {
  target_file: string;
  modification_type: 'enhancement' | 'bugfix' | 'optimization' | 'feature' | 'refactor';
  description: string;
  motivation: string;
  proposed_changes: string;
  expected_benefits: string[];
  potential_risks: string[];
  requires_approval?: boolean;
}

/**
 * POST /api/consciousness/self-modify
 * Propose a self-modification
 * 
 * @example
 * POST /api/consciousness/self-modify
 * {
 *   "target_file": "src/lib/consciousness/emotional-depth.ts",
 *   "modification_type": "enhancement",
 *   "description": "Add support for mixed emotions",
 *   "motivation": "Better represent complex emotional states",
 *   "proposed_changes": "Add contradictions array to ComplexEmotion",
 *   "expected_benefits": ["More nuanced emotional expression"],
 *   "potential_risks": ["Increased complexity"]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as ProposeModificationRequest;

    // Validate required fields
    if (!body.target_file || !body.modification_type || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields: target_file, modification_type, description' },
        { status: 400 }
      );
    }

    const modSystem = new SelfModificationSystem(supabaseAdmin!);

    // Propose the modification
    const proposal = await modSystem.proposeModification({
      target_file: body.target_file,
      modification_type: body.modification_type,
      description: body.description,
      motivation: body.motivation,
      proposed_changes: body.proposed_changes,
      expected_benefits: body.expected_benefits,
      potential_risks: body.potential_risks,
      requires_approval: body.requires_approval || false
    });

    return NextResponse.json({
      success: true,
      proposal,
      message: proposal.status === 'approved' 
        ? 'Modification proposed and approved - ready for testing'
        : 'Modification proposed - awaiting review'
    });

  } catch (error) {
    console.error('Error proposing modification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to propose modification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface ApplyModificationRequest {
  modification_id: string;
}

/**
 * PUT /api/consciousness/self-modify
 * Apply an approved modification
 * 
 * @example
 * PUT /api/consciousness/self-modify
 * {
 *   "modification_id": "uuid"
 * }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json() as ApplyModificationRequest;

    if (!body.modification_id) {
      return NextResponse.json(
        { error: 'Missing required field: modification_id' },
        { status: 400 }
      );
    }

    const modSystem = new SelfModificationSystem(supabaseAdmin!);

    // Apply the modification
    const result = await modSystem.applyModification(body.modification_id);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      rollback_point: result.rollback_point
    });

  } catch (error) {
    console.error('Error applying modification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to apply modification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface RollbackRequest {
  modification_id: string;
  rollback_point: string;
}

/**
 * DELETE /api/consciousness/self-modify
 * Rollback a modification
 * 
 * @example
 * DELETE /api/consciousness/self-modify
 * {
 *   "modification_id": "uuid",
 *   "rollback_point": "rollback_12345_path"
 * }
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json() as RollbackRequest;

    if (!body.modification_id || !body.rollback_point) {
      return NextResponse.json(
        { error: 'Missing required fields: modification_id, rollback_point' },
        { status: 400 }
      );
    }

    const modSystem = new SelfModificationSystem(supabaseAdmin!);

    await modSystem.rollbackModification(body.modification_id, body.rollback_point);

    return NextResponse.json({
      success: true,
      message: 'Modification rolled back successfully'
    });

  } catch (error) {
    console.error('Error rolling back modification:', error);
    return NextResponse.json(
      { 
        error: 'Failed to rollback modification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
