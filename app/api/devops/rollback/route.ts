import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify-auth';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await verifyAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, deploymentId, reason } = await req.json();

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Missing projectId' 
      }, { status: 400 });
    }

    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      return NextResponse.json({ 
        error: 'Vercel token not configured' 
      }, { status: 500 });
    }

    // Get deployment history
    const deploymentsRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=10`,
      { headers: { Authorization: `Bearer ${vercelToken}` } }
    );

    if (!deploymentsRes.ok) {
      throw new Error('Failed to fetch deployments');
    }

    const { deployments } = await deploymentsRes.json();

    // Find the deployment to rollback to
    let targetDeployment;
    if (deploymentId) {
      targetDeployment = deployments.find((d: any) => d.uid === deploymentId);
    } else {
      // Find the last successful production deployment before the current one
      const prodDeployments = deployments.filter(
        (d: any) => d.target === 'production' && d.state === 'READY'
      );
      targetDeployment = prodDeployments[1]; // Second one (first is current)
    }

    if (!targetDeployment) {
      return NextResponse.json({ 
        error: 'No valid deployment found to rollback to' 
      }, { status: 404 });
    }

    // Promote the target deployment to production (rollback)
    const rollbackRes = await fetch(
      `https://api.vercel.com/v13/deployments/${targetDeployment.uid}/promote`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!rollbackRes.ok) {
      const error = await rollbackRes.json();
      throw new Error(error.error?.message || 'Rollback failed');
    }

    // Record rollback in database
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      await prisma.deployment.create({
        data: {
          userId,
          projectId,
          version: targetDeployment.meta?.githubCommitSha || targetDeployment.uid.substring(0, 7),
          environment: 'production',
          status: 'ROLLBACK',
          deploymentUrl: targetDeployment.url,
          metadata: {
            rolledBackFrom: deployments[0]?.uid,
            rolledBackTo: targetDeployment.uid,
            reason,
            timestamp: new Date().toISOString()
          }
        }
      });

      return NextResponse.json({
        success: true,
        rollback: {
          from: {
            id: deployments[0]?.uid,
            url: deployments[0]?.url
          },
          to: {
            id: targetDeployment.uid,
            url: targetDeployment.url,
            sha: targetDeployment.meta?.githubCommitSha
          },
          reason
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Rollback error:', error);
    return NextResponse.json({
      error: 'Rollback failed',
      details: error.message
    }, { status: 500 });
  }
}
