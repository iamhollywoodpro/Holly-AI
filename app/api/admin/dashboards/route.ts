/**
 * ANALYTICS DASHBOARDS API - Phase 4F
 * Create and manage custom analytics dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';


export const dynamic = 'force-dynamic';

/**
 * GET - List dashboards or get specific dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('id');
    const dashboardType = searchParams.get('type');

    // Get specific dashboard
    if (dashboardId) {
      const dashboard = await prisma.analyticsDashboard.findUnique({
        where: { id: dashboardId }
      });

      if (!dashboard) {
        return NextResponse.json(
          { error: 'Dashboard not found' },
          { status: 404 }
        );
      }

      // Check access
      if (!dashboard.isPublic && dashboard.createdBy !== clerkUserId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      // Update view count
      await prisma.analyticsDashboard.update({
        where: { id: dashboardId },
        data: {
          viewCount: dashboard.viewCount + 1,
          lastViewed: new Date()
        }
      });

      return NextResponse.json({ dashboard });
    }

    // List dashboards
    const where: any = {
      OR: [
        { createdBy: clerkUserId },
        { isPublic: true }
      ]
    };

    if (dashboardType) where.dashboardType = dashboardType;

    const dashboards = await prisma.analyticsDashboard.findMany({
      where,
      orderBy: [
        { favorite: 'desc' },
        { isDefault: 'desc' },
        { lastViewed: 'desc' }
      ]
    });

    return NextResponse.json({ 
      dashboards,
      count: dashboards.length 
    });

  } catch (error) {
    console.error('❌ Dashboards GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new dashboard
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, dashboardType, layout, widgets } = body;

    // Validate required fields
    if (!name || !dashboardType) {
      return NextResponse.json(
        { error: 'name and dashboardType are required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults for this user
    if (body.isDefault) {
      await prisma.analyticsDashboard.updateMany({
        where: {
          createdBy: clerkUserId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const dashboard = await prisma.analyticsDashboard.create({
      data: {
        name,
        description: body.description,
        dashboardType,
        layout: layout || {},
        widgets: widgets || [],
        refreshInterval: body.refreshInterval || 300,
        timeRange: body.timeRange || '24h',
        isPublic: body.isPublic || false,
        isDefault: body.isDefault || false,
        createdBy: clerkUserId,
        tags: body.tags || []
      }
    });

    return NextResponse.json({
      success: true,
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        dashboardType: dashboard.dashboardType
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Dashboards POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update dashboard
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { dashboardId, ...updates } = body;

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'dashboardId is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.analyticsDashboard.findUnique({
      where: { id: dashboardId }
    });

    if (!existing || existing.createdBy !== clerkUserId) {
      return NextResponse.json(
        { error: 'Dashboard not found or access denied' },
        { status: 404 }
      );
    }

    // If setting as default, unset other defaults
    if (updates.isDefault) {
      await prisma.analyticsDashboard.updateMany({
        where: {
          createdBy: clerkUserId,
          isDefault: true,
          id: { not: dashboardId }
        },
        data: {
          isDefault: false
        }
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.dashboardId;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.viewCount;

    const updated = await prisma.analyticsDashboard.update({
      where: { id: dashboardId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      dashboard: {
        id: updated.id,
        name: updated.name
      }
    });

  } catch (error) {
    console.error('❌ Dashboards PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete dashboard
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dashboardId = searchParams.get('id');

    if (!dashboardId) {
      return NextResponse.json(
        { error: 'Dashboard ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.analyticsDashboard.findUnique({
      where: { id: dashboardId }
    });

    if (!existing || existing.createdBy !== clerkUserId) {
      return NextResponse.json(
        { error: 'Dashboard not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.analyticsDashboard.delete({
      where: { id: dashboardId }
    });

    return NextResponse.json({
      success: true,
      message: 'Dashboard deleted successfully'
    });

  } catch (error) {
    console.error('❌ Dashboards DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}
