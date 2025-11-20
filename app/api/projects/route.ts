import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/projects - List all projects
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build where clause
    const where: any = { userId };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (category && category !== 'all') {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        milestones: {
          orderBy: { targetDate: 'asc' },
        },
        activities: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            milestones: true,
            activities: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // active first
        { startDate: 'desc' }, // newest first
      ],
    });

    return NextResponse.json({
      success: true,
      projects,
      total: projects.length,
    });

  } catch (error: any) {
    console.error('[Projects GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/projects - Create new project
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      description,
      category,
      technologies,
      color,
      icon,
      targetEndDate,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        userId,
        name,
        description,
        category,
        technologies: technologies || [],
        color: color || '#a855f7',
        icon,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        status: 'active',
        progress: 0,
      },
      include: {
        milestones: true,
        activities: true,
      },
    });

    // Log project creation activity
    await prisma.projectActivity.create({
      data: {
        projectId: project.id,
        activityType: 'update',
        description: 'Project created',
      },
    });

    return NextResponse.json({
      success: true,
      project,
    });

  } catch (error: any) {
    console.error('[Projects POST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH /api/projects - Update project
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      name,
      description,
      status,
      progress,
      category,
      technologies,
      color,
      conversationIds,
      fileUrls,
      targetEndDate,
      actualEndDate,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (category !== undefined) updateData.category = category;
    if (technologies !== undefined) updateData.technologies = technologies;
    if (color !== undefined) updateData.color = color;
    if (conversationIds !== undefined) updateData.conversationIds = conversationIds;
    if (fileUrls !== undefined) updateData.fileUrls = fileUrls;
    if (targetEndDate !== undefined) updateData.targetEndDate = targetEndDate ? new Date(targetEndDate) : null;
    if (actualEndDate !== undefined) updateData.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        milestones: true,
        activities: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    return NextResponse.json({
      success: true,
      project,
    });

  } catch (error: any) {
    console.error('[Projects PATCH] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
