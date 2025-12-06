/**
 * Analytics API Service
 */

import { apiClient } from './client';

// Types
export interface Metric {
  id: string;
  name: string;
  displayName: string;
  category?: string;
  value: number; // FIXED: Added value property
  currentValue: number;
  previousValue?: number;
  changePercent?: number;
  trend: string;
  unit?: string;
  timestamp: Date;
}

export interface Report {
  id: string;
  name: string;
  type: string; // FIXED: Changed from reportType to type
  reportType: string;
  status: string; // FIXED: Made required
  lastRun?: string;
  createdAt: Date; // FIXED: Changed to Date
}

export interface Dashboard {
  id: string;
  name: string;
  dashboardType: string;
  widgets: any[];
  createdAt: Date; // FIXED: Changed to Date
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  category?: string;
  severity: string; // FIXED: Added severity
  timestamp: Date;
}

// Metrics
export const getMetrics = async (params?: {
  category?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  limit?: number;
}) => {
  return apiClient.get<Metric[]>('analytics/metrics', params);
};

export const getMetric = async (id: string) => {
  return apiClient.get<Metric>(`analytics/metrics/${id}`);
};

export const createMetric = async (data: {
  name: string;
  metricType: string;
  category?: string;
}) => {
  return apiClient.post<{ success: boolean; metricId: string }>('analytics/metrics', data);
};

// Reports
export const getReports = async (params?: {
  type?: string;
  status?: string;
  reportType?: string;
  limit?: number;
}) => {
  return apiClient.get<Report[]>('analytics/reports', params);
};

export const getReport = async (id: string) => {
  return apiClient.get<Report>(`analytics/reports/${id}`);
};

export const runReport = async (id: string) => {
  return apiClient.post<{ success: boolean; data: any }>(
    `analytics/reports/${id}/run`
  );
};

export const createReport = async (data: {
  name: string;
  type: string;
  config: any;
}) => {
  return apiClient.post<Report>('analytics/reports', data);
};

// Dashboards
export const getDashboards = async (params?: {
  dashboardType?: string;
  limit?: number;
}) => {
  return apiClient.get<Dashboard[]>('analytics/dashboards', params);
};

export const getDashboard = async (id: string) => {
  return apiClient.get<Dashboard>(`analytics/dashboards/${id}`);
};

// FIXED: Added missing createDashboard export
export const createDashboard = async (data: {
  name: string;
  description?: string;
  widgets: any[];
}) => {
  return apiClient.post<Dashboard>('analytics/dashboards', data);
};

// FIXED: Added missing deleteDashboard export
export const deleteDashboard = async (id: string) => {
  return apiClient.delete(`analytics/dashboards/${id}`);
};

// FIXED: Added missing getInsights export
export const getInsights = async (filters?: {
  category?: string;
  severity?: string;
}) => {
  return apiClient.get<Insight[]>('analytics/insights', filters);
};
