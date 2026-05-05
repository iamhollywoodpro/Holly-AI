'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { MetricCard } from '@/components/dashboard/metrics/MetricCard';
import { Shield, AlertTriangle, CheckCircle, Clock, Loader2, AlertCircle, Search } from 'lucide-react';
import { useSecurityReport, useAuditLogs, useComplianceReport, useModerationQueue } from '@/hooks/useSecurity';

export default function SecurityDashboardPage() {
  const { report: securityReport, loading: securityLoading } = useSecurityReport();
  const { logs: auditLogs, loading: logsLoading, fetchLogs } = useAuditLogs();
  const { report: complianceReport, loading: complianceLoading } = useComplianceReport();
  const { items: moderationQueue, loading: moderationLoading } = useModerationQueue();
  
  const [logFilter, setLogFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(logFilter.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));

  if (securityLoading && !securityReport) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Center</h1>
          <p className="mt-2 text-gray-600">
            Monitor security threats, audit logs, and compliance status.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Security Score"
          value={securityReport ? `${securityReport.securityScore}%` : '--'}
          change={securityReport && securityReport.securityScore >= 80 ? 'Good' : 'Needs attention'}
          changeType={securityReport && securityReport.securityScore >= 80 ? 'positive' : 'negative'}
          icon={Shield}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Active Threats"
          value={securityReport ? securityReport.activeThreats.toString() : '--'}
          change="Detected threats"
          changeType={securityReport && securityReport.activeThreats > 0 ? 'negative' : 'positive'}
          icon={AlertTriangle}
          iconColor="text-red-600"
        />
        <MetricCard
          title="Blocked Requests"
          value={securityReport ? securityReport.blockedRequests.toString() : '--'}
          change="Last 24 hours"
          changeType="neutral"
          icon={CheckCircle}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Pending Reviews"
          value={moderationQueue.length.toString()}
          change="In moderation queue"
          changeType="neutral"
          icon={Clock}
          iconColor="text-orange-600"
        />
      </div>

      {/* Security Overview & Compliance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Threats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Recent Security Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {securityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : !securityReport || securityReport.recentEvents.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No recent security events
              </div>
            ) : (
              <div className="space-y-3">
                {securityReport.recentEvents.slice(0, 5).map((event, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      event.severity === 'high' ? 'border-red-200 bg-red-50' :
                      event.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                      'border-green-200 bg-green-50'
                    }`}
                  >
                    <AlertTriangle className={`h-5 w-5 ${
                      event.severity === 'high' ? 'text-red-600' :
                      event.severity === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{event.type}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      event.severity === 'high' ? 'bg-red-100 text-red-700' :
                      event.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {event.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Compliance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complianceLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : !complianceReport ? (
              <div className="py-8 text-center text-gray-500">
                No compliance data available
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">GDPR Compliance</span>
                    <span className="text-sm font-medium text-gray-900">{complianceReport.gdprCompliance}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full ${
                        complianceReport.gdprCompliance >= 90 ? 'bg-green-500' :
                        complianceReport.gdprCompliance >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${complianceReport.gdprCompliance}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">CCPA Compliance</span>
                    <span className="text-sm font-medium text-gray-900">{complianceReport.ccpaCompliance}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full ${
                        complianceReport.ccpaCompliance >= 90 ? 'bg-green-500' :
                        complianceReport.ccpaCompliance >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${complianceReport.ccpaCompliance}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">User Consent Rate</span>
                    <span className="text-sm font-medium text-gray-900">{complianceReport.consentRate}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${complianceReport.consentRate}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">Data Retention:</span> {complianceReport.dataRetentionStatus}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    <span className="font-medium">Last Audit:</span> {new Date(complianceReport.lastAudit).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                placeholder="Search actions..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <select 
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Logs Table */}
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No audit logs found
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.userId ? log.userId.substring(0, 8) : 'System'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.ipAddress || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moderation Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {moderationLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : moderationQueue.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No items in moderation queue
            </div>
          ) : (
            <div className="space-y-3">
              {moderationQueue.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{item.type}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        item.status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-900">{item.content.substring(0, 100)}...</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Flagged: {new Date(item.flaggedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-green-600 px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-50">
                      Approve
                    </button>
                    <button className="rounded-lg border border-red-600 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
