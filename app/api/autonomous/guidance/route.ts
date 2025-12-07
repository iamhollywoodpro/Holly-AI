import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      issue,
      uncertaintyReason,
      attemptedSolutions = [],
      priority = 'MEDIUM'
    } = await req.json();

    if (!issue) {
      return NextResponse.json({ 
        error: 'Missing issue description' 
      }, { status: 400 });
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      // Create a guidance request notification
      const guidanceRequest = await prisma.notification.create({
        data: {
          userId,
          type: 'GUIDANCE_REQUEST',
          title: 'HOLLY Needs Your Guidance',
          message: issue,
          metadata: {
            uncertaintyReason,
            attemptedSolutions,
            priority,
            requestedAt: new Date().toISOString(),
            status: 'PENDING'
          }
        }
      });

      // Record the experience of requesting guidance
      await prisma.hollyExperience.create({
        data: {
          userId,
          experienceType: 'GUIDANCE_REQUESTED',
          context: {
            issue,
            uncertaintyReason,
            attemptedSolutions,
            notificationId: guidanceRequest.id
          },
          outcome: 'AWAITING_RESPONSE',
          learnings: [
            'Recognized need for human guidance',
            `Uncertainty: ${uncertaintyReason}`
          ]
        }
      });

      return NextResponse.json({
        success: true,
        guidanceRequest: {
          id: guidanceRequest.id,
          issue,
          status: 'PENDING',
          priority,
          createdAt: guidanceRequest.createdAt,
          message: 'Guidance request sent to user. Awaiting response.'
        }
      });

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Guidance request error:', error);
    return NextResponse.json({
      error: 'Guidance request failed',
      details: error.message
    }, { status: 500 });}
}

// GET endpoint to check guidance status
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    try {
      if (requestId) {
        // Get specific request
        const request = await prisma.notification.findFirst({
          where: { 
            id: requestId,
            userId,
            type: 'GUIDANCE_REQUEST'
          }
        });

        return NextResponse.json({
          success: true,
          request: request ? {
            id: request.id,
            issue: request.message,
            status: (request.metadata as any)?.status || 'PENDING',
            response: (request.metadata as any)?.response,
            createdAt: request.createdAt
          } : null
        });
      } else {
        // Get all pending requests
        const requests = await prisma.notification.findMany({
          where: { 
            userId,
            type: 'GUIDANCE_REQUEST'
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        });

        return NextResponse.json({
          success: true,
          requests: requests.map(r => ({
            id: r.id,
            issue: r.message,
            status: (r.metadata as any)?.status || 'PENDING',
            priority: (r.metadata as any)?.priority,
            createdAt: r.createdAt
          }))
        });
      }

    } finally {
      await prisma.$disconnect();
    }

  } catch (error: any) {
    console.error('Guidance status error:', error);
    return NextResponse.json({
      error: 'Failed to check guidance status',
      details: error.message
    }, { status: 500 });
  }
}
