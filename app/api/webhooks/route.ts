// Phase 4E - Webhook Handler API
// Hollywood Phase 4E: Handle incoming webhooks from external services

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const hmac = crypto.createHmac(algorithm, secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

// POST - Receive webhook
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let webhookLog: any = null;

  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    const integrationId = searchParams.get('integration');

    if (!service) {
      return NextResponse.json({ error: 'Service parameter required' }, { status: 400 });
    }

    // Get request details
    const body = await req.text();
    const headers = Object.fromEntries(req.headers);
    const method = req.method;
    const url = req.url;

    // Parse body
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      parsedBody = { raw: body };
    }

    // Get integration for signature verification
    let integration = null;
    let signatureValid = null;

    if (integrationId) {
      integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      });

      // Verify signature if integration has webhook secret
      if (integration?.webhookSecret) {
        const signature = headers['x-hub-signature'] || 
                         headers['x-webhook-signature'] || 
                         headers['x-signature'];
        
        if (signature) {
          signatureValid = verifyWebhookSignature(
            body,
            signature,
            integration.webhookSecret
          );
        }
      }
    }

    // Create webhook log
    webhookLog = await prisma.webhookLog.create({
      data: {
        integrationId: integration?.id,
        service,
        event: parsedBody.event || parsedBody.type || 'unknown',
        method,
        url,
        headers,
        body: parsedBody,
        status: 'pending',
        signatureValid,
        ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'],
        userAgent: headers['user-agent']
      }
    });

    // Process webhook based on service
    let processed = false;
    let responseData: any = { success: true };

    try {
      switch (service.toLowerCase()) {
        case 'slack':
          responseData = await processSlackWebhook(parsedBody, integration);
          processed = true;
          break;

        case 'jira':
          responseData = await processJiraWebhook(parsedBody, integration);
          processed = true;
          break;

        case 'github':
          responseData = await processGitHubWebhook(parsedBody, integration);
          processed = true;
          break;

        case 'discord':
          responseData = await processDiscordWebhook(parsedBody, integration);
          processed = true;
          break;

        default:
          responseData = { 
            success: true, 
            message: 'Webhook received but no handler configured' 
          };
      }

      // Update webhook log
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: 'success',
          processed,
          processedAt: new Date(),
          processingTime: Date.now() - startTime,
          responseBody: responseData
        }
      });

      // Update integration stats
      if (integration) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            lastSyncAt: new Date(),
            requestCount: { increment: 1 },
            lastRequestAt: new Date()
          }
        });
      }

      return NextResponse.json(responseData);

    } catch (processingError: any) {
      // Update webhook log with error
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: 'failed',
          processed: false,
          error: processingError.message,
          errorStack: processingError.stack,
          processingTime: Date.now() - startTime
        }
      });

      return NextResponse.json({ 
        success: false, 
        error: processingError.message 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Webhook API error:', error);

    // Try to log error if webhook log was created
    if (webhookLog) {
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: 'failed',
          error: error.message,
          errorStack: error.stack,
          processingTime: Date.now() - startTime
        }
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// Slack webhook processor
async function processSlackWebhook(body: any, integration: any) {
  // Handle Slack URL verification
  if (body.type === 'url_verification') {
    return { challenge: body.challenge };
  }

  // Handle Slack events
  if (body.event) {
    const event = body.event;

    // Create notification for relevant events
    if (event.type === 'message' && !event.bot_id) {
      await prisma.notification.create({
        data: {
          type: 'mention',
          title: `New Slack message`,
          message: event.text || 'New message received',
          category: 'integration',
          priority: 'normal',
          channels: ['web'],
          userId: integration?.createdBy || 'system',
          clerkUserId: integration?.createdBy || 'system',
          integrationId: integration?.id,
          sourceService: 'slack',
          externalId: event.client_msg_id,
          metadata: { event }
        }
      });
    }
  }

  return { success: true, processed: true };
}

// Jira webhook processor
async function processJiraWebhook(body: any, integration: any) {
  const webhookEvent = body.webhookEvent;
  
  // Handle issue events
  if (webhookEvent && webhookEvent.includes('issue')) {
    const issue = body.issue;
    
    await prisma.notification.create({
      data: {
        type: 'task',
        title: `Jira: ${issue?.fields?.summary || 'Issue updated'}`,
        message: `${webhookEvent}: ${issue?.key}`,
        category: 'integration',
        priority: issue?.fields?.priority?.name === 'High' ? 'high' : 'normal',
        channels: ['web'],
        userId: integration?.createdBy || 'system',
        clerkUserId: integration?.createdBy || 'system',
        integrationId: integration?.id,
        sourceService: 'jira',
        externalId: issue?.id,
        actionUrl: issue?.self,
        metadata: { issue }
      }
    });
  }

  return { success: true, processed: true };
}

// GitHub webhook processor
async function processGitHubWebhook(body: any, integration: any) {
  const event = body.action;
  
  // Handle pull request events
  if (body.pull_request) {
    const pr = body.pull_request;
    
    await prisma.notification.create({
      data: {
        type: 'code_review',
        title: `GitHub PR: ${pr.title}`,
        message: `${event}: ${pr.html_url}`,
        category: 'integration',
        priority: pr.state === 'open' ? 'high' : 'normal',
        channels: ['web'],
        userId: integration?.createdBy || 'system',
        clerkUserId: integration?.createdBy || 'system',
        integrationId: integration?.id,
        sourceService: 'github',
        externalId: pr.id.toString(),
        actionUrl: pr.html_url,
        metadata: { pull_request: pr }
      }
    });
  }

  // Handle push events
  if (body.commits) {
    await prisma.notification.create({
      data: {
        type: 'deployment',
        title: `GitHub: New commits pushed`,
        message: `${body.commits.length} commits to ${body.ref}`,
        category: 'integration',
        priority: 'normal',
        channels: ['web'],
        userId: integration?.createdBy || 'system',
        clerkUserId: integration?.createdBy || 'system',
        integrationId: integration?.id,
        sourceService: 'github',
        metadata: { commits: body.commits }
      }
    });
  }

  return { success: true, processed: true };
}

// Discord webhook processor
async function processDiscordWebhook(body: any, integration: any) {
  // Handle Discord messages
  if (body.content) {
    await prisma.notification.create({
      data: {
        type: 'mention',
        title: `Discord message`,
        message: body.content,
        category: 'integration',
        priority: 'normal',
        channels: ['web'],
        userId: integration?.createdBy || 'system',
        clerkUserId: integration?.createdBy || 'system',
        integrationId: integration?.id,
        sourceService: 'discord',
        externalId: body.id,
        metadata: body
      }
    });
  }

  return { success: true, processed: true };
}

// GET - Retrieve webhook logs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    const status = searchParams.get('status');
    const integrationId = searchParams.get('integration');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (service) where.service = service;
    if (status) where.status = status;
    if (integrationId) where.integrationId = integrationId;

    const webhookLogs = await prisma.webhookLog.findMany({
      where,
      include: {
        integration: {
          select: {
            id: true,
            service: true,
            serviceName: true,
            serviceIcon: true
          }
        }
      },
      orderBy: { receivedAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ webhookLogs });

  } catch (error: any) {
    console.error('Webhook GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
