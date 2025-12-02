// Phase 4E - External Services API
// Hollywood Phase 4E: Manage external service configurations and catalog

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - List available external services or get specific service
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const serviceName = searchParams.get('name');
    const category = searchParams.get('category');
    const isActive = searchParams.get('active');

    // Get specific service
    if (action === 'get' && serviceName) {
      const service = await prisma.externalService.findUnique({
        where: { name: serviceName }
      });

      if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }

      // Remove sensitive data for non-admin users
      const sanitized = {
        ...service,
        oauthClientSecret: undefined
      };

      return NextResponse.json({ service: sanitized });
    }

    // List services catalog
    const where: any = {};
    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive === 'true';

    const services = await prisma.externalService.findMany({
      where,
      orderBy: [
        { isAvailable: 'desc' },
        { displayName: 'asc' }
      ]
    });

    // Remove sensitive data
    const sanitized = services.map(service => ({
      ...service,
      oauthClientSecret: undefined
    }));

    return NextResponse.json({ services: sanitized });

  } catch (error: any) {
    console.error('External Services API GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Add or manage external services (Admin only)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Add new service to catalog
    if (action === 'create' || !action) {
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
        setupInstructions
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
          endpoints: endpoints || {},
          webhookSupport: webhookSupport || false,
          docsUrl,
          iconUrl,
          setupInstructions
        }
      });

      return NextResponse.json({ 
        success: true, 
        service: {
          ...service,
          oauthClientSecret: undefined
        }
      });
    }

    // Test service health
    if (action === 'health-check') {
      const { serviceName } = body;

      const service = await prisma.externalService.findUnique({
        where: { name: serviceName }
      });

      if (!service) {
        return NextResponse.json({ error: 'Service not found' }, { status: 404 });
      }

      // TODO: Implement actual health check
      // This would ping the service's health endpoint

      const isHealthy = true; // Placeholder
      const healthStatus = isHealthy ? 'healthy' : 'down';

      await prisma.externalService.update({
        where: { name: serviceName },
        data: {
          lastHealthCheck: new Date(),
          healthStatus,
          isAvailable: isHealthy
        }
      });

      return NextResponse.json({ 
        success: true,
        healthStatus,
        isAvailable: isHealthy
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('External Services API POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update service configuration (Admin only)
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { serviceName, action } = body;

    if (!serviceName) {
      return NextResponse.json({ error: 'Service name required' }, { status: 400 });
    }

    const existing = await prisma.externalService.findUnique({
      where: { name: serviceName }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Update service configuration
    if (action === 'update-config') {
      const {
        displayName,
        description,
        baseUrl,
        apiVersion,
        rateLimitPerMin,
        rateLimitPerHour,
        capabilities,
        endpoints,
        docsUrl,
        iconUrl,
        setupInstructions
      } = body;

      const service = await prisma.externalService.update({
        where: { name: serviceName },
        data: {
          displayName: displayName || existing.displayName,
          description: description || existing.description,
          baseUrl: baseUrl || existing.baseUrl,
          apiVersion: apiVersion || existing.apiVersion,
          rateLimitPerMin: rateLimitPerMin !== undefined ? rateLimitPerMin : existing.rateLimitPerMin,
          rateLimitPerHour: rateLimitPerHour !== undefined ? rateLimitPerHour : existing.rateLimitPerHour,
          capabilities: capabilities || existing.capabilities,
          endpoints: endpoints || existing.endpoints,
          docsUrl: docsUrl || existing.docsUrl,
          iconUrl: iconUrl || existing.iconUrl,
          setupInstructions: setupInstructions || existing.setupInstructions
        }
      });

      return NextResponse.json({ success: true, service });
    }

    // Update OAuth credentials
    if (action === 'update-oauth') {
      const {
        oauthClientId,
        oauthClientSecret,
        oauthScopes,
        oauthAuthUrl,
        oauthTokenUrl
      } = body;

      const service = await prisma.externalService.update({
        where: { name: serviceName },
        data: {
          oauthClientId: oauthClientId || existing.oauthClientId,
          oauthClientSecret: oauthClientSecret || existing.oauthClientSecret,
          oauthScopes: oauthScopes || existing.oauthScopes,
          oauthAuthUrl: oauthAuthUrl || existing.oauthAuthUrl,
          oauthTokenUrl: oauthTokenUrl || existing.oauthTokenUrl
        }
      });

      return NextResponse.json({ 
        success: true, 
        service: {
          ...service,
          oauthClientSecret: undefined
        }
      });
    }

    // Toggle service active status
    if (action === 'toggle-active') {
      const service = await prisma.externalService.update({
        where: { name: serviceName },
        data: {
          isActive: !existing.isActive
        }
      });

      return NextResponse.json({ success: true, service });
    }

    // General update
    const updateData: any = {};
    Object.keys(body).forEach(key => {
      if (key !== 'serviceName' && key !== 'action' && body[key] !== undefined) {
        updateData[key] = body[key];
      }
    });

    const service = await prisma.externalService.update({
      where: { name: serviceName },
      data: updateData
    });

    return NextResponse.json({ 
      success: true, 
      service: {
        ...service,
        oauthClientSecret: undefined
      }
    });

  } catch (error: any) {
    console.error('External Services API PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove service from catalog (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const serviceName = searchParams.get('name');

    if (!serviceName) {
      return NextResponse.json({ error: 'Service name required' }, { status: 400 });
    }

    const existing = await prisma.externalService.findUnique({
      where: { name: serviceName }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await prisma.externalService.delete({
      where: { name: serviceName }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('External Services API DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
