/**
 * WEBHOOK MANAGER PANEL - Phase 4E
 * Monitor and manage incoming webhooks from external services
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Trash2,
  RotateCcw,
  Filter,
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface WebhookLog {
  id: string;
  service: string;
  event: string;
  method: string;
  url: string;
  status: string;
  statusCode?: number;
  responseTime?: number;
  processed: boolean;
  processedAt?: string;
  error?: string;
  retryCount: number;
  receivedAt: string;
  createdAt: string;
  integration?: {
    serviceName: string;
    serviceIcon: string;
  };
}

interface WebhookStats {
  total: number;
  success: number;
  failed: number;
  today: number;
  avgResponseTime: number;
}

export default function WebhookManagerPanel() {
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [stats, setStats] = useState<WebhookStats>({
    total: 0,
    success: 0,
    failed: 0,
    today: 0,
    avgResponseTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');

  useEffect(() => {
    fetchWebhookLogs();
    fetchStats();
  }, [filterStatus, filterService]);

  const fetchWebhookLogs = async () => {
    try {
      let url = '/api/webhooks?limit=50';
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      if (filterService !== 'all') url += `&service=${filterService}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setWebhookLogs(data.webhookLogs || []);
      }
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/webhooks?action=stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (webhookLogId: string) => {
    try {
      const response = await fetch('/api/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookLogId })
      });

      if (response.ok) {
        fetchWebhookLogs();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to retry webhook:', error);
    }
  };

  const handleDelete = async (webhookLogId: string) => {
    if (!confirm('Delete this webhook log?')) return;

    try {
      const response = await fetch(`/api/webhooks?id=${webhookLogId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchWebhookLogs();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete webhook log:', error);
    }
  };

  const handleClearOld = async () => {
    if (!confirm('Delete webhook logs older than 30 days?')) return;

    try {
      const response = await fetch('/api/webhooks?action=clear_old&days=30', {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchWebhookLogs();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to clear old webhooks:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'retrying': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'retrying': return <RotateCcw className="w-5 h-5 text-orange-600" />;
      default: return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Webhook Manager
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor incoming webhooks from external services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleClearOld}
            variant="outline"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Old
          </Button>
          <Button
            onClick={() => { fetchWebhookLogs(); fetchStats(); }}
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Zap className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success</p>
              <p className="text-2xl font-bold text-green-600">{stats.success}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today</p>
              <p className="text-2xl font-bold text-purple-600">{stats.today}</p>
            </div>
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time</p>
              <p className="text-2xl font-bold text-orange-600">{stats.avgResponseTime}ms</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-600" />
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="retrying">Retrying</option>
          </select>

          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Services</option>
            <option value="slack">Slack</option>
            <option value="jira">Jira</option>
            <option value="github">GitHub</option>
            <option value="discord">Discord</option>
          </select>
        </div>
      </Card>

      {/* Webhook Logs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Webhooks
        </h3>
        {webhookLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No webhook logs found
          </div>
        ) : (
          <div className="space-y-3">
            {webhookLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(log.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {log.integration && (
                          <span className="text-xl">{log.integration.serviceIcon}</span>
                        )}
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {log.service} - {log.event}
                        </h4>
                        <Badge className={getStatusColor(log.status)}>
                          {log.status}
                        </Badge>
                        {log.statusCode && (
                          <Badge variant="outline">
                            {log.statusCode}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {log.method} {log.url}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                        <span>{formatTimeAgo(log.createdAt)}</span>
                        {log.responseTime && (
                          <>
                            <span>•</span>
                            <span>{log.responseTime}ms</span>
                          </>
                        )}
                        {log.retryCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{log.retryCount} retries</span>
                          </>
                        )}
                        {log.processed && log.processedAt && (
                          <>
                            <span>•</span>
                            <span>Processed</span>
                          </>
                        )}
                      </div>
                      {log.error && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-800 dark:text-red-200">
                              {log.error}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    {log.status === 'failed' && log.retryCount < 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(log.id)}
                        title="Retry webhook"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(log.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Webhook Info */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Webhook Endpoint
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              Configure your external services to send webhooks to:
            </p>
            <code className="block p-2 bg-white dark:bg-gray-800 rounded text-sm">
              POST https://holly.nexamusicgroup.com/api/webhooks?service=SERVICE_NAME&integrationId=YOUR_INTEGRATION_ID
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}
