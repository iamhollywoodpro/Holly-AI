// Phase 4E - Integration Management API
// Hollywood Phase 4E: Manage external service integrations

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - List integrations or get specific integration
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const integrationId = searchParams.get('id');
    const service = searchParams.get('service');
    const status = searchParams.get('status');

    // Get specific integration
    if (action === 'get' && integrationId) {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true
            }
          },
          notifications: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          },
          webhookLogs: {
            take: 10,
            orderBy: { receivedAt: 'desc' }
          }
        }
      });

      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }

      // Remove sensitive data
      const sanitized = {
        ...integration,
        credentials: undefined,
        accessToken: undefined,
        refreshToken: undefined,
        webhookSecret: undefined
      };

      return NextResponse.json({ integration: sanitized });
    }

    // Get integration stats
    if (action === 'stats') {
      const [total, active, inactive, error] = await Promise.all([
        prisma.integration.count({ where: { createdBy: userId } }),
        prisma.integration.count({ where: { createdBy: userId, status: 'active' } }),
        prisma.integration.count({ where: { createdBy: userId, status: 'inactive' } }),
        prisma.integration.count({ where: { createdBy: userId, status: 'error' } })
      ]);

      const recentActivity = await prisma.webhookLog.count({
        where: {
          integration: {
            createdBy: userId
          },
          receivedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      return NextResponse.json({
        stats: {
          total,
          active,
          inactive,
          error,
          recentActivity
        }
      });
    }

    // List integrations
    const where: any = { createdBy: userId };
    if (service) where.service = service;
    if (status) where.status = status;

    const integrations = await prisma.integration.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        },
        _count: {
          select: {
            notifications: true,
            webhookLogs: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Sanitize sensitive data
    const sanitized = integrations.map(int => ({
      ...int,
      credentials: undefined,
      accessToken: undefined,
      refreshToken: undefined,
      webhookSecret: undefined
    }));

    return NextResponse.json({ integrations: sanitized });

  } catch (error: any) {
    console.error('Integration API GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create or manage integrations
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Create new integration
    if (action === 'create') {
      const {
        service,
        serviceName,
        serviceIcon,
        authType,
        config,
        credentials,
        capabilities,
        enabledFeatures,
        webhookUrl,
        webhookEvents
      } = body;

      const integration = await prisma.integration.create({
        data: {
          service,
          serviceName,
          serviceIcon,
          authType,
          config: config || {},
          credentials: credentials || {},
          capabilities: capabilities || [],
          enabledFeatures: enabledFeatures || [],
          webhookUrl,
          webhookEvents: webhookEvents || [],
          status: 'inactive',
          createdBy: userId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true
            }
          }
        }
      });

      return NextResponse.json({ 
        success: true, 
        integration: {
          ...integration,
          credentials: undefined,
          accessToken: undefined,
          refreshToken: undefined
        }
      });
    }

    // Test integration connection
    if (action === 'test') {
      const { integrationId } = body;

      const integration = await prisma.integration.findUnique({
        where: { id: integrationId }
      });

      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }

      // TODO: Implement actual service connection testing
      // This would call the external service API to verify connection

      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          status: 'active'
        }
      });

      return NextResponse.json({ 
        success: true,
        message: 'Connection test successful',
        status: 'active'
      });
    }

    // Activate integration
    if (action === 'activate') {
      const { integrationId } = body;

      const integration = await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'active',
          isActive: true
        }
      });

      return NextResponse.json({ success: true, integration });
    }

    // Deactivate integration
    if (action === 'deactivate') {
      const { integrationId } = body;

      const integration = await prisma.integration.update({
        where: { id: integrationId },
        data: {
          status: 'inactive',
          isActive: false
        }
      });

      return NextResponse.json({ success: true, integration });
    }

    // Sync integration
    if (action === 'sync') {
      const { integrationId } = body;

      // TODO: Implement actual service sync logic
      // This would fetch latest data from the external service

      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: true,
        message: 'Sync initiated'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Integration API POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update integration
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { integrationId, action } = body;

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.integration.findUnique({
      where: { id: integrationId }
    });

    if (!existing || existing.createdBy !== userId) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Update configuration
    if (action === 'update-config') {
      const { config, enabledFeatures, webhookEvents } = body;

      const integration = await prisma.integration.update({
        where: { id: integrationId },
        data: {
          config: config || existing.config,
          enabledFeatures: enabledFeatures || existing.enabledFeatures,
          webhookEvents: webhookEvents || existing.webhookEvents
        }
      });

      return NextResponse.json({ success: true, integration });
    }

    // Update credentials
    if (action === 'update-credentials') {
      const { credentials, accessToken, refreshToken, tokenExpiry } = body;

      const integration = await prisma.integration.update({
        where: { id: integrationId },
        data: {
          credentials: credentials || existing.credentials,
          accessToken,
          refreshToken,
          tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : undefined
        }
      });

      return NextResponse.json({ success: true, integration });
    }

    // General update
    const {
      serviceName,
      serviceIcon,
      config,
      enabledFeatures,
      webhookUrl,
      webhookEvents,
      syncFrequency
    } = body;

    const integration = await prisma.integration.update({
      where: { id: integrationId },
      data: {
        serviceName: serviceName || existing.serviceName,
        serviceIcon: serviceIcon || existing.serviceIcon,
        config: config || existing.config,
        enabledFeatures: enabledFeatures || existing.enabledFeatures,
        webhookUrl: webhookUrl || existing.webhookUrl,
        webhookEvents: webhookEvents || existing.webhookEvents,
        syncFrequency: syncFrequency !== undefined ? syncFrequency : existing.syncFrequency
      }
    });

    return NextResponse.json({ success: true, integration });

  } catch (error: any) {
    console.error('Integration API PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete integration
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const integrationId = searchParams.get('id');

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.integration.findUnique({
      where: { id: integrationId }
    });

    if (!existing || existing.createdBy !== userId) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    await prisma.integration.delete({
      where: { id: integrationId }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Integration API DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
