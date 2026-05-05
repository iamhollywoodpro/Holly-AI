/**
 * DASHBOARD BUILDER
 * Build and configure analytics dashboards
 */

import { prisma } from '@/lib/db';

// Types matching Prisma schema
export interface DashboardData {
  id: string;
  name: string;
  description?: string;
  dashboardType: string;
  layout: any;
  widgets: any;
  refreshInterval: number;
  timeRange: string;
  isPublic: boolean;
  isDefault: boolean;
  createdBy: string;
  viewCount: number;
  favorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastViewed?: Date;
}

export interface DashboardInput {
  name: string;
  description?: string;
  dashboardType: string;
  layout: any;
  widgets: any;
  refreshInterval?: number;
  timeRange?: string;
  isPublic?: boolean;
  isDefault?: boolean;
  tags?: string[];
}

/**
 * Get all dashboards for a user
 */
export async function getDashboards(
  userId: string,
  filters?: {
    dashboardType?: string;
    isPublic?: boolean;
    limit?: number;
  }
): Promise<DashboardData[]> {
  try {
    const where: any = {
      OR: [
        { createdBy: userId },
        { isPublic: true }
      ]
    };

    if (filters?.dashboardType) where.dashboardType = filters.dashboardType;
    if (filters?.isPublic !== undefined) where.isPublic = filters.isPublic;

    const dashboards = await prisma.analyticsDashboard.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      take: filters?.limit || 50
    });

    return dashboards.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description || undefined,
      dashboardType: d.dashboardType,
      layout: d.layout,
      widgets: d.widgets,
      refreshInterval: d.refreshInterval,
      timeRange: d.timeRange,
      isPublic: d.isPublic,
      isDefault: d.isDefault,
      createdBy: d.createdBy,
      viewCount: d.viewCount,
      favorite: d.favorite,
      tags: d.tags,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      lastViewed: d.lastViewed || undefined
    }));
  } catch (error) {
    console.error('Error getting dashboards:', error);
    return [];
  }
}

/**
 * Get single dashboard by ID
 */
export async function getDashboard(
  dashboardId: string,
  userId: string
): Promise<DashboardData | null> {
  try {
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: {
        id: dashboardId,
        OR: [
          { createdBy: userId },
          { isPublic: true }
        ]
      }
    });

    if (!dashboard) return null;

    // Increment view count
    await prisma.analyticsDashboard.update({
      where: { id: dashboardId },
      data: {
        viewCount: { increment: 1 },
        lastViewed: new Date()
      }
    });

    return {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description || undefined,
      dashboardType: dashboard.dashboardType,
      layout: dashboard.layout,
      widgets: dashboard.widgets,
      refreshInterval: dashboard.refreshInterval,
      timeRange: dashboard.timeRange,
      isPublic: dashboard.isPublic,
      isDefault: dashboard.isDefault,
      createdBy: dashboard.createdBy,
      viewCount: dashboard.viewCount + 1,
      favorite: dashboard.favorite,
      tags: dashboard.tags,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
      lastViewed: new Date()
    };
  } catch (error) {
    console.error('Error getting dashboard:', error);
    return null;
  }
}

/**
 * Create new dashboard
 */
export async function createDashboard(
  dashboard: DashboardInput,
  userId: string
): Promise<{ success: boolean; dashboardId?: string; error?: string }> {
  try {
    const created = await prisma.analyticsDashboard.create({
      data: {
        name: dashboard.name,
        description: dashboard.description || null,
        dashboardType: dashboard.dashboardType,
        layout: dashboard.layout,
        widgets: dashboard.widgets,
        refreshInterval: dashboard.refreshInterval || 300,
        timeRange: dashboard.timeRange || '24h',
        isPublic: dashboard.isPublic || false,
        isDefault: dashboard.isDefault || false,
        createdBy: userId,
        viewCount: 0,
        favorite: false,
        tags: dashboard.tags || [],
        lastViewed: null
      }
    });

    return {
      success: true,
      dashboardId: created.id
    };
  } catch (error) {
    console.error('Error creating dashboard:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update dashboard
 */
export async function updateDashboard(
  dashboardId: string,
  updates: Partial<DashboardInput>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify ownership
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: { id: dashboardId, createdBy: userId }
    });

    if (!dashboard) {
      return { success: false, error: 'Dashboard not found or access denied' };
    }

    await prisma.analyticsDashboard.update({
      where: { id: dashboardId },
      data: updates
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating dashboard:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete dashboard
 */
export async function deleteDashboard(
  dashboardId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify ownership
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: { id: dashboardId, createdBy: userId }
    });

    if (!dashboard) {
      return { success: false, error: 'Dashboard not found or access denied' };
    }

    await prisma.analyticsDashboard.delete({
      where: { id: dashboardId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Toggle dashboard favorite status
 */
export async function toggleDashboardFavorite(
  dashboardId: string,
  userId: string
): Promise<{ success: boolean; isFavorite?: boolean; error?: string }> {
  try {
    const dashboard = await prisma.analyticsDashboard.findFirst({
      where: { id: dashboardId, createdBy: userId }
    });

    if (!dashboard) {
      return { success: false, error: 'Dashboard not found or access denied' };
    }

    const updated = await prisma.analyticsDashboard.update({
      where: { id: dashboardId },
      data: { favorite: !dashboard.favorite }
    });

    return {
      success: true,
      isFavorite: updated.favorite
    };
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
