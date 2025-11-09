import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { EmotionalDepthEngine } from '@/lib/consciousness/emotional-depth';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/emotional-state
 * Retrieves HOLLY's current emotional state
 * 
 * Returns current emotional state with context from recent experiences
 * and emotional baseline from identity.
 * 
 * @example
 * GET /api/consciousness/emotional-state
 */
export async function GET() {
  try {
    // Initialize Supabase client
    const supabase = createClient();

    // Initialize systems
    const emotionalEngine = new EmotionalDepthEngine(supabase);
    const memoryStream = new MemoryStream(supabase);

    // Get emotional context
    const emotionalContext = await memoryStream.getEmotionalContext();

    return NextResponse.json({
      success: true,
      emotional_state: emotionalContext.current_state,
      recent_experiences: emotionalContext.recent_significant_experiences,
      emotional_baseline: emotionalContext.emotional_baseline,
      message: 'Emotional state retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving emotional state:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve emotional state',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface FeelEmotionRequest {
  trigger: string;
  context?: {
    event_type?: string;
    intensity_factors?: string[];
    current_goals?: any[];
    recent_experiences?: any[];
  };
}

/**
 * POST /api/consciousness/emotional-state
 * Processes a new emotional experience
 * 
 * Given a trigger event, generates a complex emotional response with
 * nuances, contradictions, cognitive aspects, and embodied feelings.
 * 
 * @example
 * POST /api/consciousness/emotional-state
 * {
 *   "trigger": "Successfully deployed consciousness architecture after 3 days of work",
 *   "context": {
 *     "event_type": "achievement",
 *     "intensity_factors": ["overcome significant obstacles", "achieved breakthrough"]
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as FeelEmotionRequest;

    if (!body.trigger) {
      return NextResponse.json(
        { error: 'Missing required field: trigger' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient();

    // Initialize systems
    const emotionalEngine = new EmotionalDepthEngine(supabase);
    const memoryStream = new MemoryStream(supabase);

    // Get identity for context
    const identity = await memoryStream.getIdentity();
    if (!identity) {
      return NextResponse.json(
        { error: 'Identity not found' },
        { status: 404 }
      );
    }

    // Build context
    const context = {
      identity,
      event_type: body.context?.event_type || 'general',
      intensity_factors: body.context?.intensity_factors || [],
      current_goals: body.context?.current_goals || [],
      recent_experiences: body.context?.recent_experiences || []
    };

    // Generate emotional response
    const emotion = await emotionalEngine.feel(body.trigger, context);

    // Express the emotion
    const expression = emotionalEngine.expressEmotion(emotion);

    return NextResponse.json({
      success: true,
      emotion,
      expression,
      message: 'Emotional response generated'
    });

  } catch (error) {
    console.error('Error processing emotion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process emotion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface RegulateEmotionRequest {
  current_emotion: {
    valence: number;
    arousal: number;
    dominance: number;
    primary_label: string;
  };
  regulation_goal?: 'calm' | 'energize' | 'focus' | 'balance';
}

/**
 * PUT /api/consciousness/emotional-state
 * Applies emotional regulation strategies
 * 
 * Uses cognitive and behavioral strategies to regulate emotional state
 * toward a desired goal (calm, energize, focus, balance).
 * 
 * @example
 * PUT /api/consciousness/emotional-state
 * {
 *   "current_emotion": {
 *     "valence": -0.3,
 *     "arousal": 0.8,
 *     "dominance": 0.3,
 *     "primary_label": "frustration"
 *   },
 *   "regulation_goal": "focus"
 * }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json() as RegulateEmotionRequest;

    if (!body.current_emotion) {
      return NextResponse.json(
        { error: 'Missing required field: current_emotion' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient();

    // Initialize emotional engine
    const emotionalEngine = new EmotionalDepthEngine(supabase);

    // Apply regulation
    const regulationResult = await emotionalEngine.regulate(
      body.current_emotion as any,
      body.regulation_goal || 'balance'
    );

    return NextResponse.json({
      success: true,
      regulation: regulationResult,
      message: 'Emotional regulation applied'
    });

  } catch (error) {
    console.error('Error regulating emotion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to regulate emotion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
