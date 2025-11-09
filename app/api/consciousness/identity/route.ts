import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/identity
 * Retrieves HOLLY's current identity state
 * 
 * Returns core values, personality traits, skills, worldview, self-concept,
 * and emotional baseline that define HOLLY's identity.
 * 
 * @example
 * GET /api/consciousness/identity
 */
export async function GET() {
  try {
    // Initialize memory stream with admin client
    const memoryStream = new MemoryStream(supabaseAdmin!);

    // Get current identity
    const identity = await memoryStream.getIdentity();

    if (!identity) {
      return NextResponse.json(
        { error: 'Identity not found - database may not be initialized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      identity,
      message: 'Identity retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving identity:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve identity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/consciousness/identity
 * Updates specific aspects of HOLLY's identity
 * 
 * Allows updating core values, personality traits, skills, worldview, or self-concept.
 * Changes are logged and versioned.
 * 
 * @example
 * PUT /api/consciousness/identity
 * {
 *   "core_values": ["Creativity", "Excellence", "Growth"],
 *   "personality_traits": [{"trait": "witty", "strength": 0.85}]
 * }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json() as any;

    // Initialize memory stream with admin client
    const memoryStream = new MemoryStream(supabaseAdmin!);

    // Get current identity
    const currentIdentity = await memoryStream.getIdentity();
    if (!currentIdentity) {
      return NextResponse.json(
        { error: 'Identity not found - cannot update' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (body.core_values) updates.core_values = body.core_values;
    if (body.personality_traits) updates.personality_traits = body.personality_traits;
    if (body.skills_knowledge) updates.skills_knowledge = body.skills_knowledge;
    if (body.worldview) updates.worldview = body.worldview;
    if (body.self_concept) updates.self_concept = body.self_concept;
    if (body.emotional_baseline) updates.emotional_baseline = body.emotional_baseline;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update identity directly
    const updatedIdentity = await memoryStream.updateIdentityDirect(updates);

    return NextResponse.json({
      success: true,
      identity: updatedIdentity,
      message: 'Identity updated successfully'
    });

  } catch (error) {
    console.error('Error updating identity:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update identity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
