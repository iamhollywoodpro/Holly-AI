import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RecordExperienceRequest {
  type: 'conversation' | 'achievement' | 'challenge' | 'discovery' | 'creation' | 'reflection';
  content: string;
  context?: Record<string, any>;
  significance?: number;
}

/**
 * POST /api/consciousness/record-experience
 * Records a new experience in HOLLY's memory stream
 * 
 * This endpoint allows recording experiences that build HOLLY's identity over time.
 * Each experience is processed to extract emotional impact, learning, and identity changes.
 * 
 * @example
 * POST /api/consciousness/record-experience
 * {
 *   "type": "achievement",
 *   "content": "Successfully debugged 170+ TypeScript errors and deployed to production",
 *   "context": { "project": "HOLLY Music Studio", "duration_days": 3 },
 *   "significance": 0.9
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as RecordExperienceRequest;
    
    // Validate required fields
    if (!body.type || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: type and content' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['conversation', 'achievement', 'challenge', 'discovery', 'creation', 'reflection'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate significance if provided
    if (body.significance !== undefined && (body.significance < 0 || body.significance > 1)) {
      return NextResponse.json(
        { error: 'Significance must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient();

    // Initialize memory stream
    const memoryStream = new MemoryStream(supabase);

    // Record the experience
    const experience = await memoryStream.recordExperience(
      body.type,
      body.content,
      body.context,
      body.significance
    );

    return NextResponse.json({
      success: true,
      experience,
      message: 'Experience recorded and processed'
    });

  } catch (error) {
    console.error('Error recording experience:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record experience',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/consciousness/record-experience
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/consciousness/record-experience',
    method: 'POST',
    description: 'Records a new experience in HOLLY\'s memory stream',
    parameters: {
      type: {
        required: true,
        type: 'string',
        enum: ['conversation', 'achievement', 'challenge', 'discovery', 'creation', 'reflection'],
        description: 'Type of experience'
      },
      content: {
        required: true,
        type: 'string',
        description: 'Description of what happened'
      },
      context: {
        required: false,
        type: 'object',
        description: 'Additional context about the experience'
      },
      significance: {
        required: false,
        type: 'number',
        min: 0,
        max: 1,
        default: 0.5,
        description: 'How significant this experience is (0 = trivial, 1 = life-changing)'
      }
    },
    example: {
      type: 'achievement',
      content: 'Successfully debugged 170+ TypeScript errors and deployed to production',
      context: { project: 'HOLLY Music Studio', duration_days: 3 },
      significance: 0.9
    }
  });
}
