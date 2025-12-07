// PHASE 1: REAL System Configuration Management
// Updates actual system configuration (database-backed)
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration model (will add to Prisma schema if doesn't exist)
interface SystemConfig {
  key: string;
  value: string;
  category: string;
  description?: string;
  updatedBy: string;
  updatedAt: Date;
}

export async function POST(req: NextRequest) {
  try {
    const { key, value, userId, category = 'general' } = await req.json();

    if (!key || value === undefined || !userId) {
      return NextResponse.json(
        { success: false, error: 'key, value, and userId required' },
        { status: 400 }
      );
    }

    // Get previous value from UserSettings if it exists
    let previousValue = null;
    
    try {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId }
      });
      
      if (userSettings) {
        // Extract previous value from settings JSON
        const settings = userSettings as any;
        previousValue = settings[key] || null;
      }
    } catch (error) {
      // Settings don't exist yet
    }

    // Update or create user settings
    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        settings: {
          theme: 'dark',
          language: 'en',
          notifications: true,
          [key]: value
        }
      },
      update: {
        settings: {
          ...((await prisma.userSettings.findUnique({ where: { userId } }))?.settings as any || {}),
          [key]: value
        }
      }
    });

    // Log the configuration change in audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'config_update',
          details: {
            resource: 'system_config',
            resourceId: key,
            key,
            previousValue,
            newValue: value,
            category
          }
        }
      });
    } catch (error) {
      // Audit log failed but config was updated
      console.warn('Failed to create audit log:', error);
    }

    const result = {
      success: true,
      config: {
        key,
        updated: true,
        previousValue,
        newValue: value,
        category,
        updatedBy: userId
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Config update error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET endpoint to retrieve config
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const key = searchParams.get('key');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId required' },
        { status: 400 }
      );
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    if (!userSettings) {
      return NextResponse.json({
        success: true,
        config: {},
        message: 'No settings found for user'
      });
    }

    // Return specific key or all settings
    const settings = userSettings as any;
    const result = key ? { [key]: settings[key] } : settings;

    return NextResponse.json({
      success: true,
      config: result
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
