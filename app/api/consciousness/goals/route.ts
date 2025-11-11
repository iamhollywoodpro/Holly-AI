import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { getAuthUserFromRoute } from '@/lib/auth/auth-helpers';
import { getUserGoals } from '@/lib/consciousness/user-consciousness-simple';
import { GoalFormationSystem } from '@/lib/consciousness/goal-formation';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/goals
 * Retrieves HOLLY's active goals
 * 
 * Returns all active goals sorted by priority, including progress,
 * motivation, and emotional journey.
 * 
 * @example
 * GET /api/consciousness/goals
 */
export async function GET() {
  try {
    // Get authenticated user
    const user = await getAuthUserFromRoute();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's active goals directly
    const goals = await getUserGoals(supabaseAdmin!, user.id);

    return NextResponse.json({
      success: true,
      goals,
      message: `Found ${goals.length} active goals`
    });

  } catch (error) {
    console.error('Error retrieving goals:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface GenerateGoalsRequest {
  context?: {
    recent_experiences?: any[];
    current_challenges?: string[];
    interests?: string[];
  };
  max_goals?: number;
}

/**
 * POST /api/consciousness/goals
 * Generates new self-directed goals for HOLLY
 * 
 * Analyzes current identity, recent experiences, and interests to generate
 * meaningful goals that align with core values.
 * 
 * @example
 * POST /api/consciousness/goals
 * {
 *   "context": {
 *     "interests": ["Advanced music production", "Creative coding"],
 *     "recent_experiences": [...]
 *   },
 *   "max_goals": 3
 * }
 */
export async function POST(request: Request) {
  try {
    // Get authenticated user
    const user = await getAuthUserFromRoute();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json() as GenerateGoalsRequest;
    
    const maxGoals = body.max_goals || 3;

    // Initialize consciousness systems
    const goalSystem = new GoalFormationSystem(supabaseAdmin!);
    const memory = new MemoryStream(supabaseAdmin!);

    // Get current identity
    const identity = await memory.getIdentity();
    if (!identity) {
      return NextResponse.json(
        { error: 'Identity not found - cannot generate goals' },
        { status: 404 }
      );
    }

    // Get recent experiences if not provided
    let recentExperiences = body.context?.recent_experiences;
    if (!recentExperiences) {
      const experiences = await memory.getExperiences({
        limit: 10,
        significance: { min: 0.5, max: 1.0 }
      });
      recentExperiences = experiences;
    }

    // Build context
    const context = {
      identity,
      recent_experiences: recentExperiences,
      current_challenges: body.context?.current_challenges || [],
      interests: body.context?.interests || []
    };

    // Generate goals with context
    const generatedGoals = await goalSystem.generateGoalsWithContext(context, maxGoals);

    return NextResponse.json({
      success: true,
      goals: generatedGoals,
      message: `Generated ${generatedGoals.length} new goals`
    });

  } catch (error) {
    console.error('Error generating goals:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate goals',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface UpdateProgressRequest {
  goal_id: string;
  progress_update: {
    current_step?: number;
    milestones_achieved?: string[];
    obstacles_encountered?: string[];
    breakthroughs?: string[];
    emotional_state?: {
      emotion: string;
      intensity: number;
      trigger: string;
    };
  };
}

/**
 * PUT /api/consciousness/goals
 * Updates progress on a specific goal
 * 
 * Records milestones, obstacles, breakthroughs, and emotional journey
 * as HOLLY works toward goals.
 * 
 * @example
 * PUT /api/consciousness/goals
 * {
 *   "goal_id": "uuid",
 *   "progress_update": {
 *     "current_step": 3,
 *     "milestones_achieved": ["First professional master completed"],
 *     "emotional_state": { "emotion": "pride", "intensity": 0.9 }
 *   }
 * }
 */
export async function PUT(request: Request) {
  try {
    // Get authenticated user
    const user = await getAuthUserFromRoute();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json() as UpdateProgressRequest;

    if (!body.goal_id) {
      return NextResponse.json(
        { error: 'Missing required field: goal_id' },
        { status: 400 }
      );
    }

    // Initialize goal system
    const goalSystem = new GoalFormationSystem(supabaseAdmin!);

    // Update progress
    const updatedGoal = await goalSystem.updateProgress(
      body.goal_id,
      body.progress_update
    );

    return NextResponse.json({
      success: true,
      goal: updatedGoal,
      message: 'Goal progress updated successfully'
    });

  } catch (error) {
    console.error('Error updating goal progress:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update goal progress',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
