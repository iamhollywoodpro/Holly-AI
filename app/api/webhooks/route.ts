/**
 * WEBHOOK HANDLER API - Phase 4E
 * Receive and process incoming webhooks from external services
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';


export const dynamic = 'force-dynamic';

/**
 * GET - List webhook logs with filtering
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
    const integrationId = searchParams.get('integrationId');
    const service = searchParams.get('service');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Action: Get webhook stats
    if (action === 'stats') {
      const totalWebhooks = await prisma.webhookLog.count();

      const successCount = await prisma.webhookLog.count({
        where: { status: 'success' }
      });

      const failedCount = await prisma.webhookLog.count({
        where: { status: 'failed' }
      });

      const todayCount = await prisma.webhookLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      const avgResponseTime = await prisma.webhookLog.aggregate({
        _avg: { responseTime: true },
        where: { responseTime: { not: null } }
      });

      return NextResponse.json({
        stats: {
          total: totalWebhooks,
          success: successCount,
          failed: failedCount,
          today: todayCount,
          avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0)
        }
      });
    }

    // Default: List webhook logs
    const where: any = {};
    
    if (integrationId) where.integrationId = integrationId;
    if (service) where.service = service;
    if (status) where.status = status;

    const webhookLogs = await prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        service: true,
        event: true,
        method: true,
        url: true,
        status: true,
        statusCode: true,
        responseTime: true,
        processed: true,
        processedAt: true,
        error: true,
        retryCount: true,
        receivedAt: true,
        createdAt: true,
        integration: {
          select: {
            serviceName: true,
            serviceIcon: true
          }
        }
      }
    });

    const totalCount = await prisma.webhookLog.count({ where });

    return NextResponse.json({ 
      webhookLogs,
      count: webhookLogs.length,
      total: totalCount,
      hasMore: offset + limit < totalCount
    });

  } catch (error) {
    console.error('❌ Webhook GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook logs' },
      { status: 500 }
    );
  }
}

/**
 * POST - Receive incoming webhook
 * This is the public endpoint that external services call
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get webhook details from request
    const url = request.url;
    const method = request.method;
    const headers = Object.fromEntries(request.headers.entries());
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(url);
    const query = Object.fromEntries(searchParams.entries());

    // Extract service identifier from URL or headers
    const service = query.service || headers['x-service'] || 'unknown';
    const event = query.event || headers['x-event'] || body.event || 'unknown';
    const integrationId = query.integrationId || headers['x-integration-id'];

    // Verify webhook signature if integration exists
    let signatureValid = null;
    let integration = null;

    if (integrationId) {
      integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      });

      if (integration && integration.webhookSecret) {
        const signature = headers['x-webhook-signature'] || headers['x-hub-signature'];
        if (signature) {
          signatureValid = verifyWebhookSignature(
            JSON.stringify(body),
            signature,
            integration.webhookSecret
          );
        }
      }
    }

    // Log the webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        integrationId,
        service,
        event,
        method,
        url,
        headers,
        body,
        query,
        status: 'pending',
        processed: false,
        signatureValid,
        ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'],
        userAgent: headers['user-agent']
      }
    });

    // Process webhook asynchronously (don't block response)
    processWebhook(webhookLog.id, body, integration).catch(error => {
      console.error('❌ Webhook processing error:', error);
    });

    const responseTime = Date.now() - startTime;

    // Update response time
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        responseTime,
        statusCode: 200
      }
    });

    return NextResponse.json({
      success: true,
      webhookId: webhookLog.id,
      message: 'Webhook received and processing'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Webhook POST error:', error);
    
    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT - Retry failed webhook
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
    const { webhookLogId } = body;

    if (!webhookLogId) {
      return NextResponse.json(
        { error: 'webhookLogId is required' },
        { status: 400 }
      );
    }

    const webhookLog = await prisma.webhookLog.findUnique({
      where: { id: webhookLogId },
      include: { integration: true }
    });

    if (!webhookLog) {
      return NextResponse.json(
        { error: 'Webhook log not found' },
        { status: 404 }
      );
    }

    if (webhookLog.retryCount >= webhookLog.maxRetries) {
      return NextResponse.json(
        { error: 'Max retries exceeded' },
        { status: 400 }
      );
    }

    // Update retry count and status
    await prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: {
        status: 'retrying',
        retryCount: webhookLog.retryCount + 1,
        nextRetryAt: new Date(Date.now() + 60000) // Retry in 1 minute
      }
    });

    // Process webhook again
    processWebhook(webhookLogId, webhookLog.body as any, webhookLog.integration).catch(error => {
      console.error('❌ Webhook retry error:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook retry initiated'
    });

  } catch (error) {
    console.error('❌ Webhook PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to retry webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete webhook log
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
    const webhookLogId = searchParams.get('id');
    const action = searchParams.get('action');

    // Delete old webhook logs
    if (action === 'clear_old') {
      const daysOld = parseInt(searchParams.get('days') || '30');
      const result = await prisma.webhookLog.deleteMany({
        where: {
          createdAt: {
            lt: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)
          }
        }
      });

      return NextResponse.json({
        success: true,
        deleted: result.count
      });
    }

    if (!webhookLogId) {
      return NextResponse.json(
        { error: 'Webhook log ID is required' },
        { status: 400 }
      );
    }

    await prisma.webhookLog.delete({
      where: { id: webhookLogId }
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook log deleted successfully'
    });

  } catch (error) {
    console.error('❌ Webhook DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook log' },
      { status: 500 }
    );
  }
}

/**
 * Process webhook payload (async)
 */
async function processWebhook(
  webhookLogId: string,
  body: any,
  integration: any
): Promise<void> {
  const startTime = Date.now();
  
  try {
    // TODO: Implement actual webhook processing based on service type
    // For now, just mark as processed
    
    await prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: {
        status: 'success',
        processed: true,
        processedAt: new Date(),
        processingTime: Date.now() - startTime
      }
    });

    console.log(`✅ Webhook ${webhookLogId} processed successfully`);

  } catch (error) {
    console.error(`❌ Failed to process webhook ${webhookLogId}:`, error);
    
    await prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        processingTime: Date.now() - startTime
      }
    });
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}
