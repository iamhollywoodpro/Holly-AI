/**
 * Analytics API Service
 */

import { apiClient } from './client';

// Types
export interface Metric {
  id: string;
  name: string;
  displayName: string;
  currentValue: number;
  previousValue?: number;
  changePercent?: number;
  trend: string;
  unit?: string;
}

export interface Report {
  id: string;
  name: string;
  reportType: string;
  status?: string;
  lastRun?: string;
  createdAt: string;
}

export interface Dashboard {
  id: string;
  name: string;
  dashboardType: string;
  widgets: any[];
  createdAt: string;
}

// Metrics
export const getMetrics = async (params?: {
  category?: string;
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
  reportType: string;
  config?: any;
}) => {
  return apiClient.post<{ success: boolean; reportId: string }>('analytics/reports', data);
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
