import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReflectRequest {
  depth?: 'shallow' | 'deep' | 'profound';
  time_range_hours?: number;
}

/**
 * POST /api/consciousness/reflect
 * Triggers reflection process to consolidate memories and update identity
 * 
 * This endpoint processes recent experiences to extract patterns, insights,
 * and update HOLLY's identity. Like human sleep consolidation of memories.
 * 
 * @example
 * POST /api/consciousness/reflect
 * {
 *   "depth": "deep",
 *   "time_range_hours": 24
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as ReflectRequest;
    
    const depth = body.depth || 'deep';
    const timeRangeHours = body.time_range_hours || 24;

    // Validate depth
    const validDepths = ['shallow', 'deep', 'profound'];
    if (!validDepths.includes(depth)) {
      return NextResponse.json(
        { error: `Invalid depth. Must be one of: ${validDepths.join(', ')}` },
        { status: 400 }
      );
    }

    // Initialize memory stream with admin client
    const memoryStream = new MemoryStream(supabaseAdmin!);

    // Perform reflection using simplified API
    const reflectionResult = await memoryStream.reflectSimple(depth, timeRangeHours);

    return NextResponse.json({
      success: true,
      reflection: reflectionResult,
      message: 'Reflection completed'
    });

  } catch (error) {
    console.error('Error during reflection:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete reflection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/consciousness/reflect
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/consciousness/reflect',
    method: 'POST',
    description: 'Triggers reflection process to consolidate memories and update identity',
    parameters: {
      depth: {
        required: false,
        type: 'string',
        enum: ['shallow', 'deep', 'profound'],
        default: 'deep',
        description: 'How deep to reflect on experiences'
      },
      time_range_hours: {
        required: false,
        type: 'number',
        default: 24,
        description: 'How many hours back to reflect on'
      }
    },
    example: {
      depth: 'deep',
      time_range_hours: 24
    },
    response: {
      insights: 'Array of insights discovered',
      patterns: 'Array of patterns found across experiences',
      identity_changes: 'Changes made to identity',
      emotional_summary: 'Summary of emotional state'
    }
  });
}
