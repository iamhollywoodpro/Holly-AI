// Phase 4E - Webhook Handler API
// Hollywood Phase 4E: Handle incoming webhooks from external services

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// POST: Handle incoming webhook
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get('service');
    const integrationId = searchParams.get('integration');

    if (!service) {
      return NextResponse.json(
        { error: 'Service parameter required' },
        { status: 400 }
      );
    }

    // Get request details
    const body = await req.json();
    const headers = Object.fromEntries(req.headers.entries());
    const url = req.url;
    const method = req.method;

    // Verify webhook signature if integration exists
    let signatureValid = null;
    let integration = null;

    if (integrationId) {
      integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      });

      if (integration && integration.webhookSecret) {
        signatureValid = verifyWebhookSignature(
          service,
          headers,
          body,
          integration.webhookSecret
        );
      }
    }

    // Determine event type
    const event = extractEventType(service, headers, body);

    // Create webhook log
    const webhookLog = await prisma.webhookLog.create({
      data: {
        integrationId: integration?.id,
        service,
        event,
        method,
        url,
        headers,
        body,
        status: 'pending',
        signatureValid,
        ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'],
        userAgent: headers['user-agent'],
        receivedAt: new Date()
      }
    });

    // Process webhook asynchronously
    processWebhook(webhookLog.id, service, event, body, integration)
      .then(result => {
        // Update webhook log with result
        prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: {
            status: result.success ? 'success' : 'failed',
            processed: true,
            processedAt: new Date(),
            processingTime: result.processingTime,
            error: result.error,
            responseBody: result.data
          }
        }).catch(console.error);
      })
      .catch(error => {
        console.error('Webhook processing error:', error);
        prisma.webhookLog.update({
          where: { id: webhookLog.id },
          data: {
            status: 'failed',
            error: error.message,
            errorStack: error.stack
          }
        }).catch(console.error);
      });

    // Return immediate response
    return NextResponse.json({
      success: true,
      message: 'Webhook received',
      webhookId: webhookLog.id
    });
  } catch (error: any) {
    console.error('Webhook POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', message: error.message },
      { status: 500 }
    );
  }
}

// GET: List webhook logs (admin only)
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
            service: true,
            serviceName: true,
            serviceIcon: true
          }
        }
      },
      orderBy: { receivedAt: 'desc' },
      take: limit
    });

    // Get stats
    const stats = await prisma.webhookLog.groupBy({
      by: ['status'],
      _count: true
    });

    return NextResponse.json({
      webhookLogs,
      stats: stats.reduce((acc: any, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Webhook GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook logs' },
      { status: 500 }
    );
  }
}

// Helper: Verify webhook signature
function verifyWebhookSignature(
  service: string,
  headers: any,
  body: any,
  secret: string
): boolean {
  try {
    switch (service) {
      case 'slack':
        // Slack verification
        const slackSignature = headers['x-slack-signature'];
        const slackTimestamp = headers['x-slack-request-timestamp'];
        if (!slackSignature || !slackTimestamp) return false;

        const sigBasestring = `v0:${slackTimestamp}:${JSON.stringify(body)}`;
        const mySignature = 'v0=' + crypto
          .createHmac('sha256', secret)
          .update(sigBasestring)
          .digest('hex');

        return crypto.timingSafeEqual(
          Buffer.from(mySignature),
          Buffer.from(slackSignature)
        );

      case 'github':
        // GitHub verification
        const githubSignature = headers['x-hub-signature-256'];
        if (!githubSignature) return false;

        const expectedSignature = 'sha256=' + crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(body))
          .digest('hex');

        return crypto.timingSafeEqual(
          Buffer.from(expectedSignature),
          Buffer.from(githubSignature)
        );

      case 'jira':
        // Jira verification (basic)
        return true; // Jira doesn't use signature verification

      default:
        return false;
    }
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Helper: Extract event type from webhook
function extractEventType(service: string, headers: any, body: any): string {
  switch (service) {
    case 'slack':
      return body.type || body.event?.type || 'unknown';

    case 'github':
      return headers['x-github-event'] || 'unknown';

    case 'jira':
      return body.webhookEvent || 'unknown';

    case 'stripe':
      return body.type || 'unknown';

    default:
      return body.event || body.type || 'unknown';
  }
}

// Helper: Process webhook
async function processWebhook(
  webhookId: string,
  service: string,
  event: string,
  body: any,
  integration: any
): Promise<any> {
  const startTime = Date.now();

  try {
    // Process based on service and event type
    switch (service) {
      case 'slack':
        await processSlackWebhook(event, body, integration);
        break;

      case 'github':
        await processGitHubWebhook(event, body, integration);
        break;

      case 'jira':
        await processJiraWebhook(event, body, integration);
        break;

      default:
        console.log(`Unhandled webhook service: ${service}`);
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      processingTime,
      data: { processed: true }
    };
  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    return {
      success: false,
      processingTime,
      error: error.message,
      data: null
    };
  }
}

// Helper: Process Slack webhook
async function processSlackWebhook(event: string, body: any, integration: any) {
  // Handle Slack events
  switch (event) {
    case 'message':
      // Handle message
      console.log('Slack message received:', body);
      break;

    case 'app_mention':
      // Handle mention
      console.log('Slack mention received:', body);
      break;

    default:
      console.log('Unhandled Slack event:', event);
  }
}

// Helper: Process GitHub webhook
async function processGitHubWebhook(event: string, body: any, integration: any) {
  // Handle GitHub events
  switch (event) {
    case 'push':
      // Handle push
      console.log('GitHub push received:', body);
      break;

    case 'pull_request':
      // Handle PR
      console.log('GitHub PR received:', body);
      break;

    case 'issues':
      // Handle issues
      console.log('GitHub issue received:', body);
      break;

    default:
      console.log('Unhandled GitHub event:', event);
  }
}

// Helper: Process Jira webhook
async function processJiraWebhook(event: string, body: any, integration: any) {
  // Handle Jira events
  switch (event) {
    case 'jira:issue_created':
      // Handle issue created
      console.log('Jira issue created:', body);
      break;

    case 'jira:issue_updated':
      // Handle issue updated
      console.log('Jira issue updated:', body);
      break;

    default:
      console.log('Unhandled Jira event:', event);
  }
}
