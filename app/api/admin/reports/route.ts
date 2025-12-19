/**
 * CUSTOM REPORTS API - Phase 4F
 * Create, manage, and schedule custom analytics reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';


export const dynamic = 'force-dynamic';

/**
 * GET - List reports or get specific report
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
    const reportId = searchParams.get('id');
    const reportType = searchParams.get('type');

    // Get specific report
    if (reportId) {
      const report = await prisma.customReport.findUnique({
        where: { id: reportId },
        include: {
          metrics: {
            include: {
              metric: true
            },
            orderBy: { displayOrder: 'asc' }
          }
        }
      });

      if (!report) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }

      // Check access
      if (!report.isPublic && report.createdBy !== clerkUserId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json({ report });
    }

    // List user reports
    const where: any = {
      OR: [
        { createdBy: clerkUserId },
        { isPublic: true }
      ]
    };

    if (reportType) where.reportType = reportType;

    const reports = await prisma.customReport.findMany({
      where,
      orderBy: [
        { favorite: 'desc' },
        { updatedAt: 'desc' }
      ],
      include: {
        _count: {
          select: { metrics: true }
        }
      }
    });

    return NextResponse.json({ 
      reports,
      count: reports.length 
    });

  } catch (error) {
    console.error('❌ Reports GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new report or run report
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
    const { action, reportId, name, reportType, config, metricIds } = body;

    // Action: Run report
    if (action === 'run') {
      if (!reportId) {
        return NextResponse.json(
          { error: 'reportId is required' },
          { status: 400 }
        );
      }

      const report = await prisma.customReport.findUnique({
        where: { id: reportId },
        include: {
          metrics: {
            include: { metric: true }
          }
        }
      });

      if (!report) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        );
      }

      // Update run stats
      await prisma.customReport.update({
        where: { id: reportId },
        data: {
          lastRun: new Date(),
          runCount: report.runCount + 1
        }
      });

      // Generate report data
      const reportData = {
        name: report.name,
        type: report.reportType,
        generatedAt: new Date(),
        metrics: report.metrics.map(m => ({
          name: m.metric.displayName,
          value: m.metric.currentValue,
          unit: m.metric.unit,
          trend: m.metric.trend,
          changePercent: m.metric.changePercent
        }))
      };

      return NextResponse.json({
        success: true,
        report: reportData
      });
    }

    // Create new report
    if (!name || !reportType) {
      return NextResponse.json(
        { error: 'name and reportType are required' },
        { status: 400 }
      );
    }

    const report = await prisma.customReport.create({
      data: {
        name,
        description: body.description,
        reportType,
        config: config || {},
        filters: body.filters,
        groupBy: body.groupBy || [],
        sortBy: body.sortBy,
        isScheduled: body.isScheduled || false,
        schedule: body.schedule,
        recipients: body.recipients || [],
        isPublic: body.isPublic || false,
        createdBy: clerkUserId,
        tags: body.tags || []
      }
    });

    // Add metrics to report
    if (metricIds && Array.isArray(metricIds)) {
      for (let i = 0; i < metricIds.length; i++) {
        await prisma.reportMetric.create({
          data: {
            reportId: report.id,
            metricId: metricIds[i],
            displayOrder: i,
            chartType: body.chartTypes?.[i],
            color: body.colors?.[i]
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        name: report.name,
        reportType: report.reportType
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Reports POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update report
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
    const { reportId, ...updates } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: 'reportId is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.customReport.findUnique({
      where: { id: reportId }
    });

    if (!existing || existing.createdBy !== clerkUserId) {
      return NextResponse.json(
        { error: 'Report not found or access denied' },
        { status: 404 }
      );
    }

    // Remove fields that shouldn't be updated directly
    delete updates.reportId;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.runCount;

    const updated = await prisma.customReport.update({
      where: { id: reportId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      report: {
        id: updated.id,
        name: updated.name
      }
    });

  } catch (error) {
    console.error('❌ Reports PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete report
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
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.customReport.findUnique({
      where: { id: reportId }
    });

    if (!existing || existing.createdBy !== clerkUserId) {
      return NextResponse.json(
        { error: 'Report not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.customReport.delete({
      where: { id: reportId }
    });

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    console.error('❌ Reports DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    );
  }
}
