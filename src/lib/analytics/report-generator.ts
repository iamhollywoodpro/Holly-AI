/**
 * REPORT GENERATOR
 * Generate custom reports from analytics data
 */

import { prisma } from '@/lib/db';

// Types matching Prisma schema
export interface ReportData {
  id: string;
  name: string;
  description?: string;
  reportType: string;
  config: any;
  filters?: any;
  groupBy: string[];
  sortBy?: string;
  isScheduled: boolean;
  schedule?: string;
  recipients: string[];
  isPublic: boolean;
  createdBy: string;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  favorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportInput {
  name: string;
  description?: string;
  reportType: string;
  config: any;
  filters?: any;
  groupBy?: string[];
  sortBy?: string;
  isScheduled?: boolean;
  schedule?: string;
  recipients?: string[];
  isPublic?: boolean;
  tags?: string[];
}

export interface ReportResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Get all reports for a user
 */
export async function getReports(
  userId: string,
  filters?: {
    reportType?: string;
    isScheduled?: boolean;
    limit?: number;
  }
): Promise<ReportData[]> {
  try {
    const where: any = { createdBy: userId };
    if (filters?.reportType) where.reportType = filters.reportType;
    if (filters?.isScheduled !== undefined) where.isScheduled = filters.isScheduled;

    const reports = await prisma.customReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50
    });

    return reports.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      reportType: r.reportType,
      config: r.config,
      filters: r.filters || undefined,
      groupBy: r.groupBy,
      sortBy: r.sortBy || undefined,
      isScheduled: r.isScheduled,
      schedule: r.schedule || undefined,
      recipients: r.recipients,
      isPublic: r.isPublic,
      createdBy: r.createdBy,
      lastRun: r.lastRun || undefined,
      nextRun: r.nextRun || undefined,
      runCount: r.runCount,
      favorite: r.favorite,
      tags: r.tags,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  } catch (error) {
    console.error('Error getting reports:', error);
    return [];
  }
}

/**
 * Get single report by ID
 */
export async function getReport(
  reportId: string,
  userId: string
): Promise<ReportData | null> {
  try {
    const report = await prisma.customReport.findFirst({
      where: {
        id: reportId,
        OR: [
          { createdBy: userId },
          { isPublic: true }
        ]
      }
    });

    if (!report) return null;

    return {
      id: report.id,
      name: report.name,
      description: report.description || undefined,
      reportType: report.reportType,
      config: report.config,
      filters: report.filters || undefined,
      groupBy: report.groupBy,
      sortBy: report.sortBy || undefined,
      isScheduled: report.isScheduled,
      schedule: report.schedule || undefined,
      recipients: report.recipients,
      isPublic: report.isPublic,
      createdBy: report.createdBy,
      lastRun: report.lastRun || undefined,
      nextRun: report.nextRun || undefined,
      runCount: report.runCount,
      favorite: report.favorite,
      tags: report.tags,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt
    };
  } catch (error) {
    console.error('Error getting report:', error);
    return null;
  }
}

/**
 * Create new report
 */
export async function createReport(
  report: ReportInput,
  userId: string
): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    const created = await prisma.customReport.create({
      data: {
        name: report.name,
        description: report.description || null,
        reportType: report.reportType,
        config: report.config,
        filters: report.filters || null,
        groupBy: report.groupBy || [],
        sortBy: report.sortBy || null,
        isScheduled: report.isScheduled || false,
        schedule: report.schedule || null,
        recipients: report.recipients || [],
        isPublic: report.isPublic || false,
        createdBy: userId,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        favorite: false,
        tags: report.tags || []
      }
    });

    return {
      success: true,
      reportId: created.id
    };
  } catch (error) {
    console.error('Error creating report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update report
 */
export async function updateReport(
  reportId: string,
  updates: Partial<ReportInput>,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify ownership
    const report = await prisma.customReport.findFirst({
      where: { id: reportId, createdBy: userId }
    });

    if (!report) {
      return { success: false, error: 'Report not found or access denied' };
    }

    await prisma.customReport.update({
      where: { id: reportId },
      data: updates
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete report
 */
export async function deleteReport(
  reportId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify ownership
    const report = await prisma.customReport.findFirst({
      where: { id: reportId, createdBy: userId }
    });

    if (!report) {
      return { success: false, error: 'Report not found or access denied' };
    }

    await prisma.customReport.delete({
      where: { id: reportId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run report and generate results
 */
export async function runReport(
  reportId: string,
  userId: string
): Promise<ReportResult> {
  try {
    const report = await prisma.customReport.findFirst({
      where: {
        id: reportId,
        OR: [
          { createdBy: userId },
          { isPublic: true }
        ]
      }
    });

    if (!report) {
      return { success: false, error: 'Report not found or access denied' };
    }

    // Update run stats
    await prisma.customReport.update({
      where: { id: reportId },
      data: {
        lastRun: new Date(),
        runCount: { increment: 1 }
      }
    });

    // Generate report data based on config
    // This is a placeholder - actual implementation would query data
    const data = {
      reportId: report.id,
      reportName: report.name,
      reportType: report.reportType,
      generatedAt: new Date(),
      data: [] // Actual data would be populated here
    };

    return {
      success: true,
      data
    };
  } catch (error) {
    console.error('Error running report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
