// PHASE 2: REAL Integration Management
// CRUD operations on Integration table
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { integration, action = 'status', userId, config } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    let result: any = {
      success: true,
      action,
      timestamp: new Date().toISOString()
    };

    switch (action) {
      case 'create':
      case 'enable':
        if (!integration) {
          return NextResponse.json(
            { success: false, error: 'integration name required' },
            { status: 400 }
          );
        }

        const newIntegration = await prisma.integration.upsert({
          where: {
            id: `${userId}_${integration}` // Use compound ID
          },
          create: {
            createdBy: userId,
            service: integration.toLowerCase(),
            serviceName: integration,
            authType: 'api_key',
            status: 'active',
            config: config || {},
            isActive: true
          },
          update: {
            status: 'active',
            isActive: true,
            config: config || {}
          }
        });

        result.integration = {
          id: newIntegration.id,
          service: newIntegration.service,
          serviceName: newIntegration.serviceName,
          status: newIntegration.status,
          isActive: newIntegration.isActive,
          configured: true
        };
        break;

      case 'disable':
        if (!integration) {
          return NextResponse.json(
            { success: false, error: 'integration name required' },
            { status: 400 }
          );
        }

        await prisma.integration.update({
          where: {
            id: `${userId}_${integration}`
          },
          data: {
            isActive: false,
            status: 'inactive',
            updatedAt: new Date()
          }
        });

        result.integration = {
          name: integration,
          status: 'inactive',
          enabled: false
        };
        break;

      case 'list':
      case 'status':
        const integrations = await prisma.integration.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            enabled: true,
            createdAt: true,
            updatedAt: true
          }
        });

        result.integrations = integrations;
        result.summary = {
          total: integrations.length,
          active: integrations.filter(i => i.enabled).length,
          inactive: integrations.filter(i => !i.enabled).length
        };
        break;

      case 'delete':
        if (!integration) {
          return NextResponse.json(
            { success: false, error: 'integration name required' },
            { status: 400 }
          );
        }

        await prisma.integration.delete({
          where: {
            userId_name: {
              userId,
              name: integration
            }
          }
        });

        result.integration = {
          name: integration,
          deleted: true
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Integration management error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET endpoint to retrieve integrations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    const integrations = await prisma.integration.findMany({
      where: { userId }
    });

    return NextResponse.json({
      success: true,
      integrations
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
