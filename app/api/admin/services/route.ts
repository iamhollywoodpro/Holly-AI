/**
 * EXTERNAL SERVICES API - Phase 4E
 * Manage available external service configurations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Check if user is admin
 */
async function isUserAdmin(clerkUserId: string): Promise<boolean> {
  try {
    const user = await currentUser();
    
    const hasAdminEmail = user?.emailAddresses?.some(e => 
      e.emailAddress.endsWith('@nexamusicgroup.com')
    ) || false;
    
    const hasAdminRole = (user?.publicMetadata as any)?.role === 'admin' || 
                        (user?.privateMetadata as any)?.role === 'admin';
    
    if (hasAdminEmail || hasAdminRole) {
      return true;
    }
    
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { email: true }
    });
    
    if (dbUser?.email?.endsWith('@nexamusicgroup.com')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return false;
  }
}

/**
 * GET - List external services or get service details
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
    const serviceName = searchParams.get('name');
    const category = searchParams.get('category');

    // Action: Get service stats
    if (action === 'stats') {
      const totalServices = await prisma.externalService.count();

      const activeServices = await prisma.externalService.count({
        where: { isActive: true }
      });

      const healthyServices = await prisma.externalService.count({
        where: { healthStatus: 'healthy' }
      });

      const categoryCounts = await prisma.externalService.groupBy({
        by: ['category'],
        _count: true
      });

      return NextResponse.json({
        stats: {
          total: totalServices,
          active: activeServices,
          healthy: healthyServices,
          byCategory: categoryCounts.reduce((acc, item) => {
            acc[item.category] = item._count;
            return acc;
          }, {} as Record<string, number>)
        }
      });
    }

    // Get specific service
    if (serviceName) {
      const service = await prisma.externalService.findUnique({
        where: { name: serviceName }
      });

      if (!service) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ service });
    }

    // List all services
    const where: any = {};
    if (category) where.category = category;

    const services = await prisma.externalService.findMany({
      where,
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        category: true,
        authType: true,
        capabilities: true,
        webhookSupport: true,
        isActive: true,
        isAvailable: true,
        healthStatus: true,
        iconUrl: true,
        docsUrl: true,
        lastHealthCheck: true,
        createdAt: true
      }
    });

    return NextResponse.json({ 
      services,
      count: services.length 
    });

  } catch (error) {
    console.error('❌ External Services GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external services' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new external service (admin only)
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

    // Check admin access
    const isAdmin = await isUserAdmin(clerkUserId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
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

    // Validate required fields
    if (!name || !displayName || !category || !authType) {
      return NextResponse.json(
        { error: 'name, displayName, category, and authType are required' },
        { status: 400 }
      );
    }

    // Check if service already exists
    const existing = await prisma.externalService.findUnique({
      where: { name }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Service with this name already exists' },
        { status: 409 }
      );
    }

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
        setupInstructions,
        version,
        metadata: metadata || {},
        isActive: true,
        isAvailable: true,
        healthStatus: 'healthy'
      }
    });

    return NextResponse.json({
      success: true,
      service: {
        id: service.id,
        name: service.name,
        displayName: service.displayName
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ External Services POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create external service' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update external service (admin only)
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

    // Check admin access
    const isAdmin = await isUserAdmin(clerkUserId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { serviceId, ...updates } = body;

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated directly
    delete updates.serviceId;
    delete updates.createdAt;
    delete updates.name; // Don't allow changing service name

    const updated = await prisma.externalService.update({
      where: { id: serviceId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      service: {
        id: updated.id,
        name: updated.name,
        displayName: updated.displayName,
        isActive: updated.isActive
      }
    });

  } catch (error) {
    console.error('❌ External Services PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update external service' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete external service (admin only)
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

    // Check admin access
    const isAdmin = await isUserAdmin(clerkUserId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('id');

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    await prisma.externalService.delete({
      where: { id: serviceId }
    });

    return NextResponse.json({
      success: true,
      message: 'External service deleted successfully'
    });

  } catch (error) {
    console.error('❌ External Services DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete external service' },
      { status: 500 }
    );
  }
}
