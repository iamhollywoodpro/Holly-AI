// React Hooks for Security API
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as securityApi from '@/lib/api/security';

// Hook for security report
export function useSecurityReport() {
  const [report, setReport] = useState<securityApi.SecurityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityApi.getSecurityReport();
      setReport(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    const interval = setInterval(fetchReport, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchReport]);

  return { report, loading, error, fetchReport };
}

// Hook for audit logs
export function useAuditLogs() {
  const [logs, setLogs] = useState<securityApi.AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (filters?: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    userId?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityApi.getAuditLogs(filters);
      setLogs(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, fetchLogs };
}

// Hook for moderation queue
export function useModerationQueue() {
  const [items, setItems] = useState<securityApi.ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async (filters?: {
    status?: string;
    type?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityApi.getModerationQueue(filters);
      setItems(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { items, loading, error, fetchQueue };
}

// Hook for compliance report
export function useComplianceReport() {
  const [report, setReport] = useState<securityApi.ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await securityApi.getComplianceReport();
      setReport(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, fetchReport };
}
