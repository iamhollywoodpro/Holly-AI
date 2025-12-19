/**
 * HOLLY VIDEO GENERATION API - PHASE 4C
 * 
 * Generate videos using AI models (Runway, Pika, Stable Video, etc.)
 * Endpoints: /api/admin/creative/video
 * 
 * Actions:
 * - generate: Generate new video
 * - list: List user's generated videos
 * - get: Get single video details
 * - delete: Delete video
 * - templates: Get video templates
 * - stats: Get generation stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

export const maxDuration = 300; // 5 minutes for video generation

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    // List videos
    if (action === 'list') {
      const category = searchParams.get('category');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');

      const where: any = {
        clerkUserId: userId,
        type: 'video'
      };

      if (category && category !== 'all') {
        where.category = category;
      }

      const videos = await prisma.creativeAsset.findMany({
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
        data: videos,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    }

    // Get single video
    if (action === 'get') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ success: false, error: 'Video ID required' }, { status: 400 });
      }

      const video = await prisma.creativeAsset.findFirst({
        where: {
          id,
          clerkUserId: userId
        },
        include: {
          generationJob: true
        }
      });

      if (!video) {
        return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: video });
    }

    // Get templates
    if (action === 'templates') {
      const templates = await prisma.creativeTemplate.findMany({
        where: {
          type: 'video',
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
      const totalVideos = await prisma.creativeAsset.count({
        where: { clerkUserId: userId, type: 'video' }
      });

      const pendingJobs = await prisma.generationJob.count({
        where: {
          clerkUserId: userId,
          type: 'video',
          status: { in: ['pending', 'processing'] }
        }
      });

      const categories = await prisma.creativeAsset.groupBy({
        by: ['category'],
        where: { clerkUserId: userId, type: 'video' },
        _count: true
      });

      const recentVideos = await prisma.creativeAsset.count({
        where: {
          clerkUserId: userId,
          type: 'video',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const totalDuration = await prisma.creativeAsset.aggregate({
        where: { clerkUserId: userId, type: 'video' },
        _sum: {
          duration: true
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          total: totalVideos,
          pending: pendingJobs,
          recent: recentVideos,
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
    console.error('Video Generation API Error:', error);
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

    // Generate video
    if (action === 'generate' || !action) {
      const {
        prompt,
        negativePrompt,
        model = 'runway-gen2',
        duration = 4,
        width = 1280,
        height = 720,
        fps = 24,
        category = 'animation',
        parameters = {}
      } = body;

      if (!prompt) {
        return NextResponse.json({ success: false, error: 'Prompt required' }, { status: 400 });
      }

      // Create generation job
      const job = await prisma.generationJob.create({
        data: {
          clerkUserId: userId,
          userId: userId, // Will need proper user lookup
          type: 'video',
          prompt,
          negativePrompt,
          model,
          parameters: {
            duration,
            width,
            height,
            fps,
            ...parameters
          },
          status: 'pending',
          estimatedTime: duration * 15 // Rough estimate: 15 seconds per video second
        }
      });

      // In a real implementation, you would:
      // 1. Queue the job to a background worker
      // 2. Call the AI provider API (Runway, Pika, Stable Video, etc.)
      // 3. Update job status and create CreativeAsset when complete
      
      // For now, return the job ID for polling
      return NextResponse.json({
        success: true,
        data: {
          jobId: job.id,
          status: 'pending',
          estimatedTime: job.estimatedTime,
          message: 'Video generation started. Poll /api/admin/creative/video?action=job&id=' + job.id + ' for status'
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
    console.error('Video Generation API Error:', error);
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
      return NextResponse.json({ success: false, error: 'Video ID required' }, { status: 400 });
    }

    // Delete video
    const deleted = await prisma.creativeAsset.deleteMany({
      where: {
        id,
        clerkUserId: userId
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Video deleted' });

  } catch (error: any) {
    console.error('Video Generation API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
