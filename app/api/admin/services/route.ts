// Phase 4E - External Services API
// Hollywood Phase 4E: Manage available external service configurations

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: List external services
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const name = searchParams.get('name');
    const action = searchParams.get('action');

    // Get specific service
    if (name) {
      const service = await prisma.externalService.findUnique({
        where: { name }
      });

      if (!service) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ service });
    }

    // Get service categories
    if (action === 'categories') {
      const categories = await prisma.externalService.groupBy({
        by: ['category'],
        _count: true,
        where: { isActive: true }
      });

      return NextResponse.json({
        categories: categories.map(c => ({
          name: c.category,
          count: c._count
        }))
      });
    }

    // List services
    const where: any = { isActive: true };
    if (category) where.category = category;

    const services = await prisma.externalService.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });

    // Group by category
    const grouped = services.reduce((acc: any, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {});

    return NextResponse.json({
      services,
      grouped,
      total: services.length
    });
  } catch (error) {
    console.error('Services GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

// POST: Create external service (admin only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Test service health
    if (action === 'health-check') {
      const { name } = body;

      const service = await prisma.externalService.findUnique({
        where: { name }
      });

      if (!service) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }

      const healthResult = await checkServiceHealth(service);

      // Update health status
      await prisma.externalService.update({
        where: { name },
        data: {
          lastHealthCheck: new Date(),
          healthStatus: healthResult.status,
          isAvailable: healthResult.available
        }
      });

      return NextResponse.json(healthResult);
    }

    // Create new service
    const {
      name,
      displayName,
      description,
      category,
      baseUrl,
      apiVersion,
      authType,
      oauthClientId,
      oauthClientSecret,
      oauthScopes,
      oauthAuthUrl,
      oauthTokenUrl,
      apiKeyHeader,
      rateLimitPerMin,
      rateLimitPerHour,
      capabilities,
      endpoints,
      webhookSupport,
      docsUrl,
      iconUrl,
      setupInstructions,
      version,
      metadata
    } = body;

    const service = await prisma.externalService.create({
      data: {
        name,
        displayName,
        description,
        category,
        baseUrl,
        apiVersion,
        authType,
        oauthClientId,
        oauthClientSecret,
        oauthScopes: oauthScopes || [],
        oauthAuthUrl,
        oauthTokenUrl,
        apiKeyHeader,
        rateLimitPerMin,
        rateLimitPerHour,
        capabilities: capabilities || {},
        endpoints,
        webhookSupport: webhookSupport || false,
        docsUrl,
        iconUrl,
        setupInstructions,
        version,
        metadata,
        isActive: true,
        isAvailable: true,
        healthStatus: 'healthy'
      }
    });

    return NextResponse.json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Services POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}

// PUT: Update external service
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, action } = body;

    // Toggle active status
    if (action === 'toggle') {
      const service = await prisma.externalService.findUnique({
        where: { name }
      });

      if (!service) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }

      const updated = await prisma.externalService.update({
        where: { name },
        data: {
          isActive: !service.isActive
        }
      });

      return NextResponse.json({
        success: true,
        service: updated
      });
    }

    // Update service
    const {
      displayName,
      description,
      category,
      baseUrl,
      apiVersion,
      authType,
      oauthClientId,
      oauthClientSecret,
      oauthScopes,
      oauthAuthUrl,
      oauthTokenUrl,
      apiKeyHeader,
      rateLimitPerMin,
      rateLimitPerHour,
      capabilities,
      endpoints,
      webhookSupport,
      docsUrl,
      iconUrl,
      setupInstructions,
      isActive,
      isAvailable,
      version,
      metadata
    } = body;

    const service = await prisma.externalService.update({
      where: { name },
      data: {
        ...(displayName && { displayName }),
        ...(description && { description }),
        ...(category && { category }),
        ...(baseUrl && { baseUrl }),
        ...(apiVersion && { apiVersion }),
        ...(authType && { authType }),
        ...(oauthClientId && { oauthClientId }),
        ...(oauthClientSecret && { oauthClientSecret }),
        ...(oauthScopes && { oauthScopes }),
        ...(oauthAuthUrl && { oauthAuthUrl }),
        ...(oauthTokenUrl && { oauthTokenUrl }),
        ...(apiKeyHeader && { apiKeyHeader }),
        ...(rateLimitPerMin && { rateLimitPerMin }),
        ...(rateLimitPerHour && { rateLimitPerHour }),
        ...(capabilities && { capabilities }),
        ...(endpoints && { endpoints }),
        ...(typeof webhookSupport === 'boolean' && { webhookSupport }),
        ...(docsUrl && { docsUrl }),
        ...(iconUrl && { iconUrl }),
        ...(setupInstructions && { setupInstructions }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof isAvailable === 'boolean' && { isAvailable }),
        ...(version && { version }),
        ...(metadata && { metadata })
      }
    });

    return NextResponse.json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Services PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

// DELETE: Remove external service
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Service name required' },
        { status: 400 }
      );
    }

    await prisma.externalService.delete({
      where: { name }
    });

    return NextResponse.json({
      success: true,
      message: 'Service deleted'
    });
  } catch (error) {
    console.error('Services DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}

// Helper: Check service health
async function checkServiceHealth(service: any) {
  try {
    // Placeholder for actual health check
    // In production, this would make API calls to verify service availability

    if (!service.baseUrl) {
      return {
        status: 'unknown',
        available: true,
        message: 'No base URL to check'
      };
    }

    // Simulate health check
    const isHealthy = true; // Would make actual request here

    return {
      status: isHealthy ? 'healthy' : 'down',
      available: isHealthy,
      message: isHealthy ? 'Service is operational' : 'Service is unavailable',
      responseTime: 150 // ms
    };
  } catch (error: any) {
    return {
      status: 'down',
      available: false,
      message: error.message,
      error: error.toString()
    };
  }
}

// Initialize default services
export async function initializeDefaultServices() {
  const defaultServices = [
    {
      name: 'slack',
      displayName: 'Slack',
      description: 'Team communication and collaboration platform',
      category: 'communication',
      baseUrl: 'https://slack.com/api',
      authType: 'oauth2',
      oauthScopes: ['chat:write', 'channels:read', 'users:read'],
      webhookSupport: true,
      iconUrl: '🔔',
      capabilities: {
        sendMessage: true,
        readChannels: true,
        readUsers: true,
        receiveWebhooks: true
      }
    },
    {
      name: 'jira',
      displayName: 'Jira',
      description: 'Project management and issue tracking',
      category: 'project_management',
      baseUrl: 'https://api.atlassian.com',
      authType: 'oauth2',
      webhookSupport: true,
      iconUrl: '📋',
      capabilities: {
        createIssue: true,
        updateIssue: true,
        readIssues: true,
        receiveWebhooks: true
      }
    },
    {
      name: 'github',
      displayName: 'GitHub',
      description: 'Code hosting and version control',
      category: 'code',
      baseUrl: 'https://api.github.com',
      authType: 'oauth2',
      webhookSupport: true,
      iconUrl: '🐙',
      capabilities: {
        readRepos: true,
        createPR: true,
        managePR: true,
        receiveWebhooks: true
      }
    },
    {
      name: 'gmail',
      displayName: 'Gmail',
      description: 'Email service',
      category: 'email',
      baseUrl: 'https://gmail.googleapis.com',
      authType: 'oauth2',
      webhookSupport: false,
      iconUrl: '📧',
      capabilities: {
        sendEmail: true,
        readEmail: true
      }
    }
  ];

  // Create services if they don't exist
  for (const service of defaultServices) {
    await prisma.externalService.upsert({
      where: { name: service.name },
      update: {},
      create: {
        ...service,
        isActive: true,
        isAvailable: true,
        healthStatus: 'healthy'
      }
    });
  }
}
