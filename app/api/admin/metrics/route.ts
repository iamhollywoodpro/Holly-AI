/**
 * BUSINESS METRICS API - Phase 4F
 * Manage business metrics, KPIs, and performance indicators
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET - List metrics or get specific metric
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
    const action = searchParams.get('action');
    const metricName = searchParams.get('name');
    const category = searchParams.get('category');

    // Action: Get metrics summary
    if (action === 'summary') {
      const totalMetrics = await prisma.businessMetric.count();
      const activeMetrics = await prisma.businessMetric.count({
        where: { isActive: true }
      });

      const categoryCounts = await prisma.businessMetric.groupBy({
        by: ['category'],
        _count: true,
        where: { isActive: true }
      });

      const trendsUp = await prisma.businessMetric.count({
        where: { trend: 'up', isActive: true }
      });

      const trendsDown = await prisma.businessMetric.count({
        where: { trend: 'down', isActive: true }
      });

      return NextResponse.json({
        summary: {
          total: totalMetrics,
          active: activeMetrics,
          trendsUp,
          trendsDown,
          byCategory: categoryCounts.reduce((acc, item) => {
            acc[item.category] = item._count;
            return acc;
          }, {} as Record<string, number>)
        }
      });
    }

    // Get specific metric by name
    if (metricName) {
      const metric = await prisma.businessMetric.findUnique({
        where: { name: metricName }
      });

      if (!metric) {
        return NextResponse.json(
          { error: 'Metric not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ metric });
    }

    // List all metrics
    const where: any = {};
    if (category) where.category = category;

    const metrics = await prisma.businessMetric.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { displayName: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        metricType: true,
        unit: true,
        currentValue: true,
        previousValue: true,
        changePercent: true,
        targetValue: true,
        trend: true,
        isActive: true,
        priority: true,
        lastCalculated: true
      }
    });

    return NextResponse.json({ 
      metrics,
      count: metrics.length 
    });

  } catch (error) {
    console.error('❌ Metrics GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new metric or update metric value
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
    const { action, name, displayName, category, metricType, unit, value } = body;

    // Action: Update metric value
    if (action === 'update_value') {
      if (!name || value === undefined) {
        return NextResponse.json(
          { error: 'name and value are required' },
          { status: 400 }
        );
      }

      const metric = await prisma.businessMetric.findUnique({
        where: { name }
      });

      if (!metric) {
        return NextResponse.json(
          { error: 'Metric not found' },
          { status: 404 }
        );
      }

      // Calculate change percent
      const changePercent = metric.currentValue 
        ? ((value - metric.currentValue) / metric.currentValue) * 100
        : 0;

      // Determine trend
      let trend = 'stable';
      if (changePercent > 1) trend = 'up';
      else if (changePercent < -1) trend = 'down';

      // Update dataPoints (keep last 30 values)
      const dataPoints = Array.isArray(metric.dataPoints) 
        ? [...(metric.dataPoints as any[]), { value, timestamp: new Date() }].slice(-30)
        : [{ value, timestamp: new Date() }];

      const updated = await prisma.businessMetric.update({
        where: { name },
        data: {
          previousValue: metric.currentValue,
          currentValue: value,
          changePercent,
          trend,
          dataPoints,
          lastCalculated: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        metric: {
          name: updated.name,
          currentValue: updated.currentValue,
          changePercent: updated.changePercent,
          trend: updated.trend
        }
      });
    }

    // Create new metric
    if (!name || !displayName || !category || !metricType) {
      return NextResponse.json(
        { error: 'name, displayName, category, and metricType are required' },
        { status: 400 }
      );
    }

    const metric = await prisma.businessMetric.create({
      data: {
        name,
        displayName,
        description: body.description,
        category,
        metricType,
        aggregationType: body.aggregationType || 'sum',
        unit,
        currentValue: body.currentValue || 0,
        previousValue: body.previousValue,
        targetValue: body.targetValue,
        minThreshold: body.minThreshold,
        maxThreshold: body.maxThreshold,
        dataPoints: body.dataPoints || [],
        isActive: body.isActive !== undefined ? body.isActive : true,
        priority: body.priority || 0,
        refreshInterval: body.refreshInterval || 300
      }
    });

    return NextResponse.json({
      success: true,
      metric: {
        id: metric.id,
        name: metric.name,
        displayName: metric.displayName
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Metrics POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create metric' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update metric configuration
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
    const { metricId, ...updates } = body;

    if (!metricId) {
      return NextResponse.json(
        { error: 'metricId is required' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated directly
    delete updates.metricId;
    delete updates.name; // Don't allow changing metric name
    delete updates.currentValue; // Use update_value action instead
    delete updates.createdAt;

    const updated = await prisma.businessMetric.update({
      where: { id: metricId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      metric: {
        id: updated.id,
        name: updated.name,
        displayName: updated.displayName,
        isActive: updated.isActive
      }
    });

  } catch (error) {
    console.error('❌ Metrics PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update metric' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete metric
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
    const metricId = searchParams.get('id');

    if (!metricId) {
      return NextResponse.json(
        { error: 'Metric ID is required' },
        { status: 400 }
      );
    }

    await prisma.businessMetric.delete({
      where: { id: metricId }
    });

    return NextResponse.json({
      success: true,
      message: 'Metric deleted successfully'
    });

  } catch (error) {
    console.error('❌ Metrics DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete metric' },
      { status: 500 }
    );
  }
}
