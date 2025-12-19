/**
 * HOLLY AUDIO GENERATION API - PHASE 4C
 * 
 * Generate audio using AI models (ElevenLabs, MusicGen, Bark, etc.)
 * Endpoints: /api/admin/creative/audio
 * 
 * Actions:
 * - generate: Generate new audio (music, voiceover, sfx)
 * - list: List user's generated audio
 * - get: Get single audio details
 * - delete: Delete audio
 * - templates: Get audio templates
 * - stats: Get generation stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

export const maxDuration = 300; // 5 minutes for audio generation

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    // List audio
    if (action === 'list') {
      const category = searchParams.get('category');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');

      const where: any = {
        clerkUserId: userId,
        type: 'audio'
      };

      if (category && category !== 'all') {
        where.category = category;
      }

      const audio = await prisma.creativeAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          generationJob: {
            select: {
              status: true,
              progress: true
            }
          }
        }
      });

      const total = await prisma.creativeAsset.count({ where });

      return NextResponse.json({
        success: true,
        data: audio,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    }

    // Get single audio
    if (action === 'get') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ success: false, error: 'Audio ID required' }, { status: 400 });
      }

      const audio = await prisma.creativeAsset.findFirst({
        where: {
          id,
          clerkUserId: userId
        },
        include: {
          generationJob: true
        }
      });

      if (!audio) {
        return NextResponse.json({ success: false, error: 'Audio not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: audio });
    }

    // Get templates
    if (action === 'templates') {
      const templates = await prisma.creativeTemplate.findMany({
        where: {
          type: 'audio',
          OR: [
            { isPublic: true },
            { clerkUserId: userId }
          ]
        },
        orderBy: [
          { isDefault: 'desc' },
          { usageCount: 'desc' }
        ],
        take: 50
      });

      return NextResponse.json({ success: true, data: templates });
    }

    // Get stats
    if (action === 'stats') {
      const totalAudio = await prisma.creativeAsset.count({
        where: { clerkUserId: userId, type: 'audio' }
      });

      const pendingJobs = await prisma.generationJob.count({
        where: {
          clerkUserId: userId,
          type: 'audio',
          status: { in: ['pending', 'processing'] }
        }
      });

      const categories = await prisma.creativeAsset.groupBy({
        by: ['category'],
        where: { clerkUserId: userId, type: 'audio' },
        _count: true
      });

      const recentAudio = await prisma.creativeAsset.count({
        where: {
          clerkUserId: userId,
          type: 'audio',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const totalDuration = await prisma.creativeAsset.aggregate({
        where: { clerkUserId: userId, type: 'audio' },
        _sum: {
          duration: true
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          total: totalAudio,
          pending: pendingJobs,
          recent: recentAudio,
          totalDuration: totalDuration._sum.duration || 0,
          categories: categories.map(c => ({
            category: c.category,
            count: c._count
          }))
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Audio Generation API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Generate audio
    if (action === 'generate' || !action) {
      const {
        prompt,
        model = 'musicgen',
        duration = 30,
        category = 'music',
        parameters = {}
      } = body;

      if (!prompt) {
        return NextResponse.json({ success: false, error: 'Prompt required' }, { status: 400 });
      }

      // Validate category-specific requirements
      if (category === 'voiceover') {
        parameters.voice = parameters.voice || 'default';
      }

      // Create generation job
      const job = await prisma.generationJob.create({
        data: {
          clerkUserId: userId,
          userId: userId, // Will need proper user lookup
          type: 'audio',
          prompt,
          model,
          parameters: {
            duration,
            category,
            ...parameters
          },
          status: 'pending',
          estimatedTime: Math.ceil(duration / 2) // Rough estimate: half the audio duration
        }
      });

      // In a real implementation, you would:
      // 1. Queue the job to a background worker
      // 2. Call the AI provider API (ElevenLabs, MusicGen, Bark, etc.)
      // 3. Update job status and create CreativeAsset when complete
      
      // For now, return the job ID for polling
      return NextResponse.json({
        success: true,
        data: {
          jobId: job.id,
          status: 'pending',
          estimatedTime: job.estimatedTime,
          message: 'Audio generation started. Poll /api/admin/creative/audio?action=job&id=' + job.id + ' for status'
        }
      });
    }

    // Get job status
    if (action === 'job') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Job ID required' }, { status: 400 });
      }

      const job = await prisma.generationJob.findFirst({
        where: {
          id,
          clerkUserId: userId
        },
        include: {
          assets: true
        }
      });

      if (!job) {
        return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: job });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Audio Generation API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Audio ID required' }, { status: 400 });
    }

    // Delete audio
    const deleted = await prisma.creativeAsset.deleteMany({
      where: {
        id,
        clerkUserId: userId
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: 'Audio not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Audio deleted' });

  } catch (error: any) {
    console.error('Audio Generation API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
