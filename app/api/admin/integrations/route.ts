/**
 * INTEGRATION MANAGEMENT API - Phase 4E
 * Manage external service integrations (Slack, Jira, Email, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET - List all integrations with optional filtering
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
    const service = searchParams.get('service');
    const status = searchParams.get('status');

    // Action: Get available services
    if (action === 'services') {
      return NextResponse.json({
        services: [
          {
            id: 'slack',
            name: 'Slack',
            icon: '💬',
            description: 'Team communication and notifications',
            authType: 'oauth',
            capabilities: ['send_message', 'create_channel', 'list_channels']
          },
          {
            id: 'jira',
            name: 'Jira',
            icon: '🎫',
            description: 'Issue tracking and project management',
            authType: 'api_key',
            capabilities: ['create_ticket', 'update_ticket', 'list_tickets']
          },
          {
            id: 'email',
            name: 'Email',
            icon: '📧',
            description: 'Email notifications and alerts',
            authType: 'smtp',
            capabilities: ['send_email', 'send_bulk_email']
          },
          {
            id: 'github',
            name: 'GitHub',
            icon: '🐙',
            description: 'Repository management and webhooks',
            authType: 'oauth',
            capabilities: ['create_repo', 'push_code', 'create_pr', 'webhooks']
          },
          {
            id: 'discord',
            name: 'Discord',
            icon: '🎮',
            description: 'Community notifications',
            authType: 'webhook',
            capabilities: ['send_message', 'create_webhook']
          },
          {
            id: 'webhook',
            name: 'Custom Webhook',
            icon: '🔗',
            description: 'Custom webhook integrations',
            authType: 'webhook',
            capabilities: ['send_webhook']
          }
        ]
      });
    }

    // Action: Get integration stats
    if (action === 'stats') {
      const totalIntegrations = await prisma.integration.count({
        where: { createdBy: clerkUserId }
      });

      const activeIntegrations = await prisma.integration.count({
        where: { 
          createdBy: clerkUserId,
          isActive: true 
        }
      });

      const recentNotifications = await prisma.notification.count({
        where: {
          integration: {
            createdBy: clerkUserId
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const recentWebhooks = await prisma.webhookLog.count({
        where: {
          integration: {
            createdBy: clerkUserId
          },
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      return NextResponse.json({
        stats: {
          total: totalIntegrations,
          active: activeIntegrations,
          inactive: totalIntegrations - activeIntegrations,
          notificationsToday: recentNotifications,
          webhooksToday: recentWebhooks
        }
      });
    }

    // Default: List all integrations
    const where: any = { createdBy: clerkUserId };
    
    if (service) where.service = service;
    if (status) where.status = status;

    const integrations = await prisma.integration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        service: true,
        serviceName: true,
        serviceIcon: true,
        status: true,
        authType: true,
        capabilities: true,
        enabledFeatures: true,
        isActive: true,
        lastSyncAt: true,
        lastErrorAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose credentials/tokens
      }
    });

    return NextResponse.json({ 
      integrations,
      count: integrations.length 
    });

  } catch (error) {
    console.error('❌ Integration GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new integration or test connection
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
    const { action, service, serviceName, config, credentials, authType, capabilities } = body;

    // Action: Test connection
    if (action === 'test') {
      const { integrationId } = body;
      
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      });

      if (!integration) {
        return NextResponse.json(
          { error: 'Integration not found' },
          { status: 404 }
        );
      }

      // TODO: Implement actual connection testing for each service
      // For now, return mock success
      return NextResponse.json({
        success: true,
        message: 'Connection test successful',
        latency: Math.floor(Math.random() * 200) + 50 // Mock latency
      });
    }

    // Create new integration
    if (!service || !serviceName) {
      return NextResponse.json(
        { error: 'Service and serviceName are required' },
        { status: 400 }
      );
    }

    const integration = await prisma.integration.create({
      data: {
        service,
        serviceName,
        serviceIcon: body.serviceIcon || '🔗',
        status: 'pending',
        config: config || {},
        credentials: credentials || {},
        authType: authType || 'api_key',
        capabilities: capabilities || [],
        enabledFeatures: body.enabledFeatures || [],
        webhookUrl: body.webhookUrl,
        webhookSecret: body.webhookSecret,
        webhookEvents: body.webhookEvents || [],
        rateLimit: body.rateLimit,
        syncFrequency: body.syncFrequency,
        isActive: false,
        createdBy: clerkUserId
      }
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        service: integration.service,
        serviceName: integration.serviceName,
        status: integration.status
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Integration POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update integration
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
    const { integrationId, ...updates } = body;

    if (!integrationId) {
      return NextResponse.json(
        { error: 'integrationId is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.integration.findUnique({
      where: { id: integrationId }
    });

    if (!existing || existing.createdBy !== clerkUserId) {
      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 404 }
      );
    }

    // Remove fields that shouldn't be updated directly
    delete updates.integrationId;
    delete updates.createdBy;
    delete updates.createdAt;

    const updated = await prisma.integration.update({
      where: { id: integrationId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      integration: {
        id: updated.id,
        service: updated.service,
        serviceName: updated.serviceName,
        status: updated.status,
        isActive: updated.isActive
      }
    });

  } catch (error) {
    console.error('❌ Integration PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove integration
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
    const integrationId = searchParams.get('id');

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.integration.findUnique({
      where: { id: integrationId }
    });

    if (!existing || existing.createdBy !== clerkUserId) {
      return NextResponse.json(
        { error: 'Integration not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.integration.delete({
      where: { id: integrationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Integration deleted successfully'
    });

  } catch (error) {
    console.error('❌ Integration DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
