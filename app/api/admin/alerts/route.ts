/**
 * METRIC ALERTS API - Phase 4F
 * Configure and manage alerts for metric thresholds
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';


export const dynamic = 'force-dynamic';

/**
 * GET - List alerts or get alert details
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
    const status = searchParams.get('status');

    // Action: Get alert stats
    if (action === 'stats') {
      const totalAlerts = await prisma.metricAlert.count({
        where: { createdBy: clerkUserId }
      });

      const activeAlerts = await prisma.metricAlert.count({
        where: { 
          createdBy: clerkUserId,
          isActive: true 
        }
      });

      const triggeredAlerts = await prisma.metricAlert.count({
        where: {
          createdBy: clerkUserId,
          isTriggered: true
        }
      });

      const criticalAlerts = await prisma.metricAlert.count({
        where: {
          createdBy: clerkUserId,
          severity: 'critical',
          isTriggered: true
        }
      });

      return NextResponse.json({
        stats: {
          total: totalAlerts,
          active: activeAlerts,
          triggered: triggeredAlerts,
          critical: criticalAlerts
        }
      });
    }

    // List alerts
    const where: any = { createdBy: clerkUserId };
    
    if (status === 'active') where.isActive = true;
    if (status === 'triggered') where.isTriggered = true;

    const alerts = await prisma.metricAlert.findMany({
      where,
      include: {
        metric: {
          select: {
            name: true,
            displayName: true,
            currentValue: true,
            unit: true
          }
        }
      },
      orderBy: [
        { isTriggered: 'desc' },
        { severity: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    return NextResponse.json({ 
      alerts,
      count: alerts.length 
    });

  } catch (error) {
    console.error('❌ Alerts GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new alert
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
    const { 
      name, 
      metricId, 
      condition, 
      threshold,
      severity,
      channels,
      recipients
    } = body;

    // Validate required fields
    if (!name || !metricId || !condition || threshold === undefined) {
      return NextResponse.json(
        { error: 'name, metricId, condition, and threshold are required' },
        { status: 400 }
      );
    }

    // Verify metric exists
    const metric = await prisma.businessMetric.findUnique({
      where: { id: metricId }
    });

    if (!metric) {
      return NextResponse.json(
        { error: 'Metric not found' },
        { status: 404 }
      );
    }

    const alert = await prisma.metricAlert.create({
      data: {
        name,
        description: body.description,
        metricId,
        condition,
        threshold,
        duration: body.duration,
        severity: severity || 'warning',
        channels: channels || [],
        recipients: recipients || [],
        isActive: body.isActive !== undefined ? body.isActive : true,
        createdBy: clerkUserId
      }
    });

    return NextResponse.json({
      success: true,
      alert: {
        id: alert.id,
        name: alert.name,
        severity: alert.severity
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Alerts POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update alert or snooze
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
    const { alertId, action, ...updates } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.metricAlert.findUnique({
      where: { id: alertId }
    });

    if (!existing || existing.createdBy !== clerkUserId) {
      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      );
    }

    // Action: Snooze alert
    if (action === 'snooze') {
      const hours = body.hours || 1;
      const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

      await prisma.metricAlert.update({
        where: { id: alertId },
        data: {
          isSnoozed: true,
          snoozeUntil
        }
      });

      return NextResponse.json({
        success: true,
        message: `Alert snoozed for ${hours} hour(s)`
      });
    }

    // Action: Resolve alert
    if (action === 'resolve') {
      await prisma.metricAlert.update({
        where: { id: alertId },
        data: {
          isTriggered: false,
          resolvedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Alert resolved'
      });
    }

    // Regular update
    delete updates.alertId;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.triggerCount;

    const updated = await prisma.metricAlert.update({
      where: { id: alertId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      alert: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive
      }
    });

  } catch (error) {
    console.error('❌ Alerts PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete alert
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
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json(
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.metricAlert.findUnique({
      where: { id: alertId }
    });

    if (!existing || existing.createdBy !== clerkUserId) {
      return NextResponse.json(
        { error: 'Alert not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.metricAlert.delete({
      where: { id: alertId }
    });

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully'
    });

  } catch (error) {
    console.error('❌ Alerts DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}
