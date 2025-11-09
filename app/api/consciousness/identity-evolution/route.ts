import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/database/supabase-config';
import { IdentityDevelopmentSystem } from '@/lib/consciousness/identity-development';
import { MemoryStream } from '@/lib/consciousness/memory-stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/consciousness/identity-evolution
 * Get crystallized identity and evolution statistics
 */
export async function GET() {
  try {
    const identitySystem = new IdentityDevelopmentSystem(supabaseAdmin!);

    const [crystallized, stats, recentChanges, fluidity] = await Promise.all([
      Promise.resolve(identitySystem.getCrystallizedIdentity()),
      Promise.resolve(identitySystem.getEvolutionStats()),
      Promise.resolve(identitySystem.getRecentChanges(10)),
      Promise.resolve(identitySystem.getIdentityFluidity())
    ]);

    return NextResponse.json({
      success: true,
      crystallized_identity: crystallized,
      statistics: stats,
      recent_changes: recentChanges,
      fluidity_score: fluidity,
      message: `Identity has ${crystallized.stable_aspects} crystallized aspects`
    });

  } catch (error) {
    console.error('Error retrieving identity evolution:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve identity evolution',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consciousness/identity-evolution
 * Process recent experiences to evolve identity
 */
export async function POST() {
  try {
    const memoryStream = new MemoryStream(supabaseAdmin!);
    const identitySystem = new IdentityDevelopmentSystem(supabaseAdmin!);

    // Get context
    const [identity, recentExperiences] = await Promise.all([
      memoryStream.getIdentity(),
      memoryStream.getExperiences({ limit: 20, significance: { min: 0.5, max: 1.0 } })
    ]);

    if (!identity) {
      return NextResponse.json(
        { error: 'Identity not found' },
        { status: 404 }
      );
    }

    // Process identity evolution
    const evolutionRecords = await identitySystem.processIdentityEvolution(
      recentExperiences,
      identity
    );

    return NextResponse.json({
      success: true,
      evolution_records: evolutionRecords,
      message: `Processed ${evolutionRecords.length} identity changes`
    });

  } catch (error) {
    console.error('Error processing identity evolution:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process identity evolution',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
