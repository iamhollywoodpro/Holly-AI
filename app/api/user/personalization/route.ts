/**
 * Personalization Engine API
 * Phase 4B - User preferences and personalized experiences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/user/personalization
 * Get user preferences and personalization data
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { clerkUserId: userId }
    });

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId,
          clerkUserId: userId
        }
      });
    }

    // Get user segments
    const segments = await prisma.userSegmentMember.findMany({
      where: { clerkUserId: userId },
      include: {
        segment: {
          select: {
            name: true,
            description: true,
            segmentType: true
          }
        }
      }
    });

    // Get active A/B tests
    const activeTests = await prisma.aBTestAssignment.findMany({
      where: { clerkUserId: userId },
      include: {
        test: {
          select: {
            name: true,
            status: true,
            testType: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      preferences,
      segments: segments.map(s => s.segment),
      activeTests: activeTests.map(a => ({
        testName: a.test.name,
        variant: a.variant,
        exposed: a.exposed
      }))
    });

  } catch (error) {
    console.error('Error getting personalization:', error);
    return NextResponse.json(
      { error: 'Failed to get personalization' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/personalization
 * Update user preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      theme,
      language,
      timezone,
      dateFormat,
      timeFormat,
      dashboardLayout,
      pinnedFeatures,
      hiddenFeatures,
      favoritePages,
      emailNotifications,
      pushNotifications,
      notificationFrequency,
      contentTypes,
      interests,
      categories,
      betaFeatures,
      experimentalUI
    } = body;

    const preferences = await prisma.userPreferences.upsert({
      where: { clerkUserId: userId },
      update: {
        theme,
        language,
        timezone,
        dateFormat,
        timeFormat,
        dashboardLayout: dashboardLayout ? JSON.parse(JSON.stringify(dashboardLayout)) : undefined,
        pinnedFeatures,
        hiddenFeatures,
        favoritePages,
        emailNotifications,
        pushNotifications,
        notificationFrequency,
        contentTypes,
        interests,
        categories,
        betaFeatures,
        experimentalUI
      },
      create: {
        userId,
        clerkUserId: userId,
        theme: theme || 'system',
        language: language || 'en',
        dateFormat: dateFormat || 'MM/DD/YYYY',
        timeFormat: timeFormat || '12h',
        emailNotifications: emailNotifications ?? true,
        pushNotifications: pushNotifications ?? true,
        notificationFrequency: notificationFrequency || 'real_time',
        betaFeatures: betaFeatures ?? false,
        experimentalUI: experimentalUI ?? false
      }
    });

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error updating personalization:', error);
    return NextResponse.json(
      { error: 'Failed to update personalization' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/personalization/recommend
 * Get personalized recommendations
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { context = 'general', limit = 10 } = body;

    // Get user preferences
    const preferences = await prisma.userPreferences.findUnique({
      where: { clerkUserId: userId }
    });

    // Get user behavior
    const recentEvents = await prisma.userEvent.findMany({
      where: {
        clerkUserId: userId,
        timestamp: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Analyze patterns
    const eventTypes = recentEvents.reduce((acc: any, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {});

    const pages = recentEvents
      .filter(e => e.eventType === 'page_view')
      .reduce((acc: any, e) => {
        acc[e.page] = (acc[e.page] || 0) + 1;
        return acc;
      }, {});

    const topPages = Object.entries(pages)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([page]) => page);

    // Generate recommendations
    const recommendations = [];

    // Based on interests
    if (preferences?.interests && preferences.interests.length > 0) {
      recommendations.push({
        type: 'content',
        reason: 'Based on your interests',
        items: preferences.interests.slice(0, 3),
        score: 0.9
      });
    }

    // Based on frequent pages
    if (topPages.length > 0) {
      recommendations.push({
        type: 'feature',
        reason: 'Based on your frequent usage',
        items: topPages,
        score: 0.85
      });
    }

    // Based on user segments
    const segments = await prisma.userSegmentMember.findMany({
      where: { clerkUserId: userId },
      include: { segment: true }
    });

    if (segments.length > 0) {
      recommendations.push({
        type: 'segment',
        reason: 'Popular in your segment',
        items: segments.map(s => s.segment.name),
        score: 0.8
      });
    }

    // Personalization suggestions
    if (!preferences?.dashboardLayout) {
      recommendations.push({
        type: 'action',
        reason: 'Customize your experience',
        items: ['Customize Dashboard', 'Set Preferences'],
        score: 0.75
      });
    }

    return NextResponse.json({
      success: true,
      recommendations: recommendations.slice(0, limit),
      personalizationScore: preferences?.personalizationScore || 0
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
