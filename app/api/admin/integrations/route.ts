// Phase 4E - Integration Management API
// Hollywood Phase 4E: Manage external service integrations

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List integrations or get specific integration
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

    // Get specific integration
    if (action === 'get' && integrationId) {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        include: {
          user: {
            select: {
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

      return NextResponse.json({ integration });
    }

    // Get integrations by service
    if (service) {
      const integrations = await prisma.integration.findMany({
        where: {
          createdBy: userId,
          service
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              imageUrl: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({ integrations });
    }

    // List all integrations
    const integrations = await prisma.integration.findMany({
      where: {
        createdBy: userId
      },
      include: {
        user: {
          select: {
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

    // Get stats
    const stats = {
      total: integrations.length,
      active: integrations.filter(i => i.status === 'active').length,
      inactive: integrations.filter(i => i.status === 'inactive').length,
      error: integrations.filter(i => i.status === 'error').length,
      services: [...new Set(integrations.map(i => i.service))].length
    };

    return NextResponse.json({ integrations, stats });
  } catch (error) {
    console.error('Integration GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

// POST: Create integration or perform actions
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Test integration connection
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

      // Test connection based on service type
      const testResult = await testIntegrationConnection(integration);

      // Update integration with test results
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastError: testResult.error || null,
          lastErrorAt: testResult.error ? new Date() : null
        }
      });

      return NextResponse.json({
        success: testResult.success,
        message: testResult.message,
        data: testResult.data
      });
    }

    // Refresh token
    if (action === 'refresh-token') {
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

      const refreshResult = await refreshIntegrationToken(integration);

      if (refreshResult.success) {
        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            accessToken: refreshResult.accessToken,
            refreshToken: refreshResult.refreshToken,
            tokenExpiry: refreshResult.tokenExpiry
          }
        });
      }

      return NextResponse.json(refreshResult);
    }

    // Sync integration
    if (action === 'sync') {
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

      const syncResult = await syncIntegration(integration);

      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          lastError: syncResult.error || null,
          lastErrorAt: syncResult.error ? new Date() : null
        }
      });

      return NextResponse.json(syncResult);
    }

    // Create new integration
    const {
      service,
      serviceName,
      serviceIcon,
      config,
      credentials,
      authType,
      accessToken,
      refreshToken,
      tokenExpiry,
      capabilities,
      enabledFeatures,
      webhookUrl,
      webhookSecret,
      webhookEvents
    } = body;

    const integration = await prisma.integration.create({
      data: {
        service,
        serviceName,
        serviceIcon,
        config: config || {},
        credentials: credentials || {},
        authType,
        accessToken,
        refreshToken,
        tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
        capabilities: capabilities || [],
        enabledFeatures: enabledFeatures || [],
        webhookUrl,
        webhookSecret,
        webhookEvents: webhookEvents || [],
        status: 'active',
        isActive: true,
        createdBy: userId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      integration
    });
  } catch (error) {
    console.error('Integration POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

// PUT: Update integration
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, action } = body;

    // Toggle active status
    if (action === 'toggle') {
      const integration = await prisma.integration.findUnique({
        where: { id }
      });

      if (!integration) {
        return NextResponse.json(
          { error: 'Integration not found' },
          { status: 404 }
        );
      }

      const updated = await prisma.integration.update({
        where: { id },
        data: {
          isActive: !integration.isActive,
          status: !integration.isActive ? 'active' : 'inactive'
        }
      });

      return NextResponse.json({
        success: true,
        integration: updated
      });
    }

    // Update integration
    const {
      serviceName,
      serviceIcon,
      config,
      credentials,
      accessToken,
      refreshToken,
      tokenExpiry,
      capabilities,
      enabledFeatures,
      webhookUrl,
      webhookSecret,
      webhookEvents,
      status,
      isActive
    } = body;

    const integration = await prisma.integration.update({
      where: { id },
      data: {
        ...(serviceName && { serviceName }),
        ...(serviceIcon && { serviceIcon }),
        ...(config && { config }),
        ...(credentials && { credentials }),
        ...(accessToken && { accessToken }),
        ...(refreshToken && { refreshToken }),
        ...(tokenExpiry && { tokenExpiry: new Date(tokenExpiry) }),
        ...(capabilities && { capabilities }),
        ...(enabledFeatures && { enabledFeatures }),
        ...(webhookUrl && { webhookUrl }),
        ...(webhookSecret && { webhookSecret }),
        ...(webhookEvents && { webhookEvents }),
        ...(status && { status }),
        ...(typeof isActive === 'boolean' && { isActive })
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      integration
    });
  } catch (error) {
    console.error('Integration PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

// DELETE: Remove integration
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Integration ID required' },
        { status: 400 }
      );
    }

    await prisma.integration.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Integration deleted'
    });
  } catch (error) {
    console.error('Integration DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}

// Helper: Test integration connection
async function testIntegrationConnection(integration: any) {
  // Placeholder for actual integration testing
  // In production, this would make actual API calls to test connectivity
  
  try {
    switch (integration.service) {
      case 'slack':
        // Test Slack API
        return {
          success: true,
          message: 'Slack connection successful',
          data: { workspace: 'Test Workspace' }
        };
      
      case 'jira':
        // Test Jira API
        return {
          success: true,
          message: 'Jira connection successful',
          data: { site: 'Test Site' }
        };
      
      default:
        return {
          success: true,
          message: 'Connection test not implemented for this service',
          data: {}
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Connection test failed',
      error: error.message
    };
  }
}

// Helper: Refresh integration token
async function refreshIntegrationToken(integration: any) {
  // Placeholder for actual token refresh logic
  // In production, this would use OAuth refresh tokens
  
  return {
    success: false,
    message: 'Token refresh not implemented',
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null
  };
}

// Helper: Sync integration
async function syncIntegration(integration: any) {
  // Placeholder for actual integration sync
  // In production, this would sync data from external service
  
  return {
    success: true,
    message: 'Sync completed',
    syncedItems: 0
  };
}
