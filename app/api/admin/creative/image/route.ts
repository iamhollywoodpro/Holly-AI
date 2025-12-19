/**
 * HOLLY IMAGE GENERATION API - PHASE 4C
 * 
 * Generate images using AI models (DALL-E, Stable Diffusion, etc.)
 * Endpoints: /api/admin/creative/image
 * 
 * Actions:
 * - generate: Generate new image
 * - list: List user's generated images
 * - get: Get single image details
 * - delete: Delete image
 * - templates: Get image templates
 * - stats: Get generation stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

export const maxDuration = 300; // 5 minutes for image generation

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';

    // List images
    if (action === 'list') {
      const category = searchParams.get('category');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');

      const where: any = {
        clerkUserId: userId,
        type: 'image'
      };

      if (category && category !== 'all') {
        where.category = category;
      }

      const images = await prisma.creativeAsset.findMany({
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
        data: images,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    }

    // Get single image
    if (action === 'get') {
      const id = searchParams.get('id');
      if (!id) {
        return NextResponse.json({ success: false, error: 'Image ID required' }, { status: 400 });
      }

      const image = await prisma.creativeAsset.findFirst({
        where: {
          id,
          clerkUserId: userId
        },
        include: {
          generationJob: true
        }
      });

      if (!image) {
        return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: image });
    }

    // Get templates
    if (action === 'templates') {
      const templates = await prisma.creativeTemplate.findMany({
        where: {
          type: 'image',
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
      const totalImages = await prisma.creativeAsset.count({
        where: { clerkUserId: userId, type: 'image' }
      });

      const pendingJobs = await prisma.generationJob.count({
        where: {
          clerkUserId: userId,
          type: 'image',
          status: { in: ['pending', 'processing'] }
        }
      });

      const categories = await prisma.creativeAsset.groupBy({
        by: ['category'],
        where: { clerkUserId: userId, type: 'image' },
        _count: true
      });

      const recentImages = await prisma.creativeAsset.count({
        where: {
          clerkUserId: userId,
          type: 'image',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          total: totalImages,
          pending: pendingJobs,
          recent: recentImages,
          categories: categories.map(c => ({
            category: c.category,
            count: c._count
          }))
        }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Image Generation API Error:', error);
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

    // Generate image
    if (action === 'generate' || !action) {
      const {
        prompt,
        negativePrompt,
        model = 'dall-e-3',
        width = 1024,
        height = 1024,
        category = 'art',
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
          type: 'image',
          prompt,
          negativePrompt,
          model,
          parameters: {
            width,
            height,
            ...parameters
          },
          status: 'pending'
        }
      });

      // In a real implementation, you would:
      // 1. Queue the job to a background worker
      // 2. Call the AI provider API (OpenAI, Stability AI, etc.)
      // 3. Update job status and create CreativeAsset when complete
      
      // For now, return the job ID for polling
      return NextResponse.json({
        success: true,
        data: {
          jobId: job.id,
          status: 'pending',
          message: 'Image generation started. Poll /api/admin/creative/image?action=job&id=' + job.id + ' for status'
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
    console.error('Image Generation API Error:', error);
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
      return NextResponse.json({ success: false, error: 'Image ID required' }, { status: 400 });
    }

    // Delete image
    const deleted = await prisma.creativeAsset.deleteMany({
      where: {
        id,
        clerkUserId: userId
      }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Image deleted' });

  } catch (error: any) {
    console.error('Image Generation API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
