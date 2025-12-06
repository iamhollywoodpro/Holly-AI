// React Hooks for Analytics API
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as analyticsApi from '@/lib/api/analytics';

// Hook for metrics
export function useMetrics() {
  const [metrics, setMetrics] = useState<analyticsApi.Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (filters?: {
    category?: string;
    startDate?: Date;
    endDate?: Date;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getMetrics(filters);
      setMetrics(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, fetchMetrics };
}

// Hook for dashboards
export function useDashboards() {
  const [dashboards, setDashboards] = useState<analyticsApi.Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getDashboards();
      setDashboards(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createDashboard = useCallback(async (data: {
    name: string;
    description?: string;
    widgets: any[];
  }) => {
    try {
      const newDashboard = await analyticsApi.createDashboard(data);
      setDashboards(prev => [...prev, newDashboard]);
      return newDashboard;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteDashboard = useCallback(async (dashboardId: string) => {
    try {
      await analyticsApi.deleteDashboard(dashboardId);
      setDashboards(prev => prev.filter(d => d.id !== dashboardId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  return { dashboards, loading, error, fetchDashboards, createDashboard, deleteDashboard };
}

// Hook for reports
export function useReports() {
  const [reports, setReports] = useState<analyticsApi.Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async (filters?: {
    type?: string;
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getReports(filters);
      setReports(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateReport = useCallback(async (data: {
    name: string;
    type: string;
    config: any;
  }) => {
    try {
      const newReport = await analyticsApi.createReport(data);
      setReports(prev => [...prev, newReport]);
      return newReport;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, fetchReports, generateReport };
}

// Hook for insights
export function useInsights() {
  const [insights, setInsights] = useState<analyticsApi.Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async (filters?: {
    category?: string;
    severity?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getInsights(filters);
      setInsights(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, loading, error, fetchInsights };
}
