/**
 * CI/CD Pipeline API - Phase 4D
 * Manage deployments, track status, handle rollbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';


const prisma = new PrismaClient();

// POST: Create deployment OR trigger rollback
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'rollback') {
      return await rollbackDeployment(userId, body.deploymentId);
    } else {
      // Create new deployment
      const {
        environment,
        platform,
        commitSha,
        branch,
        deployType,
        trigger,
        pullRequestId,
      } = body;

      if (!environment || !platform || !commitSha || !branch) {
        return NextResponse.json(
          { error: 'Missing required fields: environment, platform, commitSha, branch' },
          { status: 400 }
        );
      }

      const deploymentId = `${platform}-${environment}-${Date.now()}`;

      const deployment = await prisma.deploymentLog.create({
        data: {
          deploymentId,
          environment,
          platform,
          commitSha,
          branch,
          status: 'pending',
          deployType: deployType || 'standard',
          trigger: trigger || 'manual',
          triggeredBy: userId,
          pullRequestId: pullRequestId || null,
        },
      });

      // Simulate deployment process
      simulateDeployment(deployment.id);

      return NextResponse.json({ deployment }, { status: 201 });
    }
  } catch (error: any) {
    console.error('CI/CD API POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}

// GET: List deployments or get deployment status
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deploymentId = searchParams.get('deploymentId');
    const environment = searchParams.get('environment');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (deploymentId) {
      // Get specific deployment
      const deployment = await prisma.deploymentLog.findUnique({
        where: { deploymentId },
      });
      return NextResponse.json({ deployment }, { status: 200 });
    }

    // List deployments
    const where: any = {};
    if (environment) {
      where.environment = environment;
    }

    const deployments = await prisma.deploymentLog.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    // Calculate stats
    const stats = {
      total: deployments.length,
      successful: deployments.filter(d => d.status === 'success').length,
      failed: deployments.filter(d => d.status === 'failed').length,
      pending: deployments.filter(d => d.status === 'pending' || d.status === 'deploying').length,
    };

    return NextResponse.json({ deployments, stats }, { status: 200 });
  } catch (error: any) {
    console.error('CI/CD API GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deployments' },
      { status: 500 }
    );
  }
}

// PUT: Update deployment status
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deploymentId, status, deploymentUrl, healthCheckPassed, errorRate } = body;

    if (!deploymentId) {
      return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 });
    }

    const deployment = await prisma.deploymentLog.update({
      where: { deploymentId },
      data: {
        status: status || undefined,
        deploymentUrl: deploymentUrl || undefined,
        healthCheckPassed: healthCheckPassed !== undefined ? healthCheckPassed : undefined,
        errorRate: errorRate !== undefined ? errorRate : undefined,
        completedAt: status === 'success' || status === 'failed' ? new Date() : undefined,
      },
    });

    return NextResponse.json({ deployment }, { status: 200 });
  } catch (error: any) {
    console.error('CI/CD API PUT error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update deployment' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel deployment
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const deploymentId = searchParams.get('deploymentId');

    if (!deploymentId) {
      return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 });
    }

    await prisma.deploymentLog.delete({ where: { deploymentId } });

    return NextResponse.json({ message: 'Deployment cancelled' }, { status: 200 });
  } catch (error: any) {
    console.error('CI/CD API DELETE error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel deployment' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function rollbackDeployment(userId: string, deploymentId: string) {
  if (!deploymentId) {
    return NextResponse.json({ error: 'Deployment ID required' }, { status: 400 });
  }

  const currentDeployment = await prisma.deploymentLog.findUnique({
    where: { deploymentId },
  });

  if (!currentDeployment) {
    return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
  }

  if (!currentDeployment.canRollback) {
    return NextResponse.json({ error: 'Deployment cannot be rolled back' }, { status: 400 });
  }

  // Find previous successful deployment
  const previousDeployment = await prisma.deploymentLog.findFirst({
    where: {
      environment: currentDeployment.environment,
      status: 'success',
      startedAt: { lt: currentDeployment.startedAt },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (!previousDeployment) {
    return NextResponse.json({ error: 'No previous deployment to rollback to' }, { status: 404 });
  }

  // Mark current as rolled back
  await prisma.deploymentLog.update({
    where: { deploymentId },
    data: {
      rolledBack: true,
      rollbackReason: 'Manual rollback triggered',
    },
  });

  // Create rollback deployment
  const rollbackDeploymentId = `rollback-${Date.now()}`;
  const rollback = await prisma.deploymentLog.create({
    data: {
      deploymentId: rollbackDeploymentId,
      environment: currentDeployment.environment,
      platform: currentDeployment.platform,
      commitSha: previousDeployment.commitSha,
      branch: previousDeployment.branch,
      status: 'deploying',
      deployType: 'rollback',
      trigger: 'manual',
      triggeredBy: userId,
      rollbackTo: previousDeployment.deploymentId,
    },
  });

  // Simulate rollback
  simulateDeployment(rollback.id);

  return NextResponse.json({ rollback, message: 'Rollback initiated' }, { status: 201 });
}

function simulateDeployment(deploymentId: string) {
  setTimeout(async () => {
    try {
      const deployment = await prisma.deploymentLog.findUnique({
        where: { id: deploymentId },
      });

      if (!deployment) return;

      // Update to deploying
      await prisma.deploymentLog.update({
        where: { id: deploymentId },
        data: { status: 'deploying' },
      });

      // Simulate build time
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Random success/failure (95% success rate)
      const success = Math.random() > 0.05;
      const buildTime = Math.floor(Math.random() * 120) + 30; // 30-150 seconds
      const duration = Math.floor(Math.random() * 180) + 60; // 60-240 seconds

      await prisma.deploymentLog.update({
        where: { id: deploymentId },
        data: {
          status: success ? 'success' : 'failed',
          completedAt: new Date(),
          duration,
          buildTime,
          buildSize: parseFloat((Math.random() * 10 + 5).toFixed(2)), // 5-15 MB
          deploymentUrl: success ? `https://${deployment.environment}.example.com` : null,
          healthCheckPassed: success,
          errorRate: success ? parseFloat((Math.random() * 0.5).toFixed(2)) : 5.0,
          responseTime: success ? Math.floor(Math.random() * 200) + 50 : null,
          uptimePercent: success ? parseFloat((99 + Math.random()).toFixed(2)) : null,
        },
      });
    } catch (error) {
      console.error('Failed to simulate deployment:', error);
    }
  }, 1000);
}
