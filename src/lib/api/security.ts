// API Client for Security Dashboard
import { auth } from '@clerk/nextjs/server';

const API_BASE = '/api';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: any;
  ipAddress?: string;
  timestamp: Date;
}

export interface SecurityReport {
  securityScore: number;
  activeThreats: number;
  blockedRequests: number;
  anomalyCount: number;
  rateLimit: {
    remaining: number;
    limit: number;
    resetAt: Date;
  };
  recentEvents: Array<{
    type: string;
    severity: string;
    timestamp: Date;
  }>;
}

export interface ModerationItem {
  id: string;
  content: string;
  type: string;
  status: string;
  flaggedAt: Date;
  reviewedAt?: Date;
}

export interface ComplianceReport {
  gdprCompliance: number;
  ccpaCompliance: number;
  dataRetentionStatus: string;
  consentRate: number;
  lastAudit: Date;
}

// Security Report
export async function getSecurityReport(): Promise<SecurityReport> {
  const response = await fetch(`${API_BASE}/security/report`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch security report');
  return response.json();
}

// Audit Logs
export async function getAuditLogs(filters?: {
  startDate?: Date;
  endDate?: Date;
  action?: string;
  userId?: string;
}): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
  if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
  if (filters?.action) params.append('action', filters.action);
  if (filters?.userId) params.append('userId', filters.userId);

  const response = await fetch(`${API_BASE}/audit/logs?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch audit logs');
  return response.json();
}

// Moderation Queue
export async function getModerationQueue(filters?: {
  status?: string;
  type?: string;
}): Promise<ModerationItem[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.type) params.append('type', filters.type);

  const response = await fetch(`${API_BASE}/moderation/queue?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch moderation queue');
  return response.json();
}

// Compliance Report
export async function getComplianceReport(): Promise<ComplianceReport> {
  const response = await fetch(`${API_BASE}/compliance/report`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch compliance report');
  return response.json();
}

// Content Moderation
export async function moderateContent(data: {
  content: string;
  type: 'text' | 'image';
}): Promise<{ safe: boolean; reason?: string }> {
  const response = await fetch(`${API_BASE}/moderation/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to moderate content');
  return response.json();
}

// Report Content
export async function reportContent(data: {
  contentId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE}/moderation/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to report content');
}
