/**
 * Professional Email Pitch Generator
 * 
 * Generates personalized pitch emails for:
 * - Sync licensing opportunities
 * - Playlist curator submissions
 * - Follow-up emails
 * - Thank you notes
 * 
 * Endpoint: POST /api/music-manager/email
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateSyncPitchEmail,
  generatePlaylistPitchEmail,
  generateFollowUpEmail,
  generateBatchSyncPitches,
  generateBatchPlaylistPitches,
  type EmailTemplate,
  type SyncOpportunity,
  type PlaylistCurator,
  type AudioFeatures,
} from '@/lib/music/email-templates';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;

    const {
      type,
      artistName,
      trackTitle,
      features,
      opportunity,
      curator,
      opportunities,
      curators,
      streamingLinks,
      spotifyUri,
      releaseDate,
      additionalContext,
      followUpContext,
    } = body;

    console.log('📧 Generating email pitch...');
    console.log('📝 Type:', type);
    console.log('🎤 Artist:', artistName);
    console.log('🎵 Track:', trackTitle);

    let result: EmailTemplate | EmailTemplate[] | null = null;

    switch (type) {
      // Single sync pitch
      case 'sync':
        if (!opportunity || !features) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: opportunity, features' },
            { status: 400 }
          );
        }
        result = generateSyncPitchEmail(
          opportunity as SyncOpportunity,
          artistName,
          trackTitle,
          features as AudioFeatures
        );
        break;

      // Single playlist pitch
      case 'playlist':
        if (!curator || !features) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: curator, features' },
            { status: 400 }
          );
        }
        result = generatePlaylistPitchEmail(
          curator as PlaylistCurator,
          artistName,
          trackTitle,
          features as AudioFeatures
        );
        break;

      // Follow-up email
      case 'follow-up':
        if (!followUpContext) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: followUpContext' },
            { status: 400 }
          );
        }
        result = generateFollowUpEmail(
          followUpContext.originalEmail,
          followUpContext.daysSinceSent || 7
        );
        break;

      // Batch sync pitches
      case 'batch-sync':
        if (!opportunities || !features) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: opportunities, features' },
            { status: 400 }
          );
        }
        result = generateBatchSyncPitches(
          opportunities as SyncOpportunity[],
          artistName,
          trackTitle,
          features as AudioFeatures
        );
        break;

      // Batch playlist pitches
      case 'batch-playlist':
        if (!curators || !features) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: curators, features' },
            { status: 400 }
          );
        }
        result = generateBatchPlaylistPitches(
          curators as PlaylistCurator[],
          artistName,
          trackTitle,
          features as AudioFeatures
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Invalid email type: ${type}` },
          { status: 400 }
        );
    }

    if (!result) {
      throw new Error('Failed to generate email');
    }

    const isBatch = Array.isArray(result);
    const emailCount = isBatch ? result.length : 1;

    console.log(`✅ Generated ${emailCount} email${emailCount > 1 ? 's' : ''}`);

    return NextResponse.json({
      success: true,
      emails: isBatch ? result : [result],
      count: emailCount,
      type,
    });

  } catch (error) {
    console.error('❌ Error generating email:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get email templates (for reference)
 * Endpoint: GET /api/music-manager/email
 */
export async function GET(request: NextRequest) {
  const templates = {
    types: [
      'sync',
      'playlist',
      'follow-up',
      'batch-sync',
      'batch-playlist',
    ],
    examples: {
      sync: {
        description: 'Professional sync licensing pitch to music supervisors',
        requiredFields: ['opportunity', 'artistName', 'trackTitle', 'features'],
        optionalFields: ['streamingLinks', 'additionalContext'],
      },
      playlist: {
        description: 'Personalized playlist curator submission',
        requiredFields: ['curator', 'artistName', 'trackTitle', 'features'],
        optionalFields: ['releaseDate', 'spotifyUri', 'additionalContext'],
      },
      'follow-up': {
        description: 'Professional follow-up email (7-14 days after submission)',
        requiredFields: ['followUpContext'],
        optionalFields: [],
      },
      'batch-sync': {
        description: 'Generate multiple sync pitches at once',
        requiredFields: ['opportunities', 'artistName', 'trackTitle', 'features'],
        optionalFields: ['streamingLinks'],
      },
      'batch-playlist': {
        description: 'Generate multiple playlist pitches at once',
        requiredFields: ['curators', 'artistName', 'trackTitle', 'features'],
        optionalFields: ['releaseDate', 'spotifyUri'],
      },
    },
  };

  return NextResponse.json({
    success: true,
    templates,
  });
}
