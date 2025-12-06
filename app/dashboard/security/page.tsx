'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { MetricCard } from '@/components/dashboard/metrics/MetricCard';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Download,
  Filter,
} from 'lucide-react';

export default function SecurityDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Center</h1>
          <p className="mt-2 text-gray-600">
            Monitor security events, audit logs, and compliance status.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">
          <Shield className="h-4 w-4" />
          Run Security Scan
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Security Score"
          value="98/100"
          change="Excellent"
          changeType="positive"
          icon={Shield}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Active Threats"
          value="2"
          change="2 resolved today"
          changeType="positive"
          icon={AlertTriangle}
          iconColor="text-orange-600"
        />
        <MetricCard
          title="Compliance Status"
          value="100%"
          change="All checks passed"
          changeType="positive"
          icon={CheckCircle}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Last Scan"
          value="2h ago"
          change="Next: 2h"
          changeType="neutral"
          icon={Clock}
          iconColor="text-purple-600"
        />
      </div>

      {/* Alerts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Alerts</CardTitle>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                2 Active
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AlertItem
                severity="warning"
                title="Rate limit exceeded"
                description="User XYZ exceeded API rate limit"
                time="15 min ago"
              />
              <AlertItem
                severity="warning"
                title="Unusual login location"
                description="Login detected from new country"
                time="1 hour ago"
              />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ComplianceItem
                label="GDPR Compliance"
                status="compliant"
                lastCheck="2 hours ago"
              />
              <ComplianceItem
                label="CCPA Compliance"
                status="compliant"
                lastCheck="2 hours ago"
              />
              <ComplianceItem
                label="SOC 2 Type II"
                status="in-progress"
                lastCheck="In Progress"
              />
              <ComplianceItem
                label="ISO 27001"
                status="compliant"
                lastCheck="1 day ago"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Logs</CardTitle>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <LogRow
                  timestamp="14:23:15"
                  action="user_login"
                  user="john@example.com"
                  ip="192.168.1.100"
                  status="success"
                />
                <LogRow
                  timestamp="14:22:45"
                  action="data_export"
                  user="jane@example.com"
                  ip="192.168.1.101"
                  status="success"
                />
                <LogRow
                  timestamp="14:21:30"
                  action="api_call"
                  user="system"
                  ip="10.0.0.1"
                  status="success"
                />
                <LogRow
                  timestamp="14:20:12"
                  action="failed_login"
                  user="unknown"
                  ip="203.45.67.89"
                  status="failed"
                />
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">Showing 1-10 of 1,234 logs</p>
            <div className="flex gap-2">
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                Previous
              </button>
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertItem({
  severity,
  title,
  description,
  time,
}: {
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  time: string;
}) {
  const severityColors = {
    warning: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <div className="flex gap-4 rounded-lg border border-gray-200 p-4">
      <div className={`rounded-lg p-2 ${severityColors[severity]}`}>
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
        <p className="mt-2 text-xs text-gray-400">{time}</p>
      </div>
      <button className="text-sm font-medium text-purple-600 hover:text-purple-700">
        Resolve
      </button>
    </div>
  );
}

function ComplianceItem({
  label,
  status,
  lastCheck,
}: {
  label: string;
  status: 'compliant' | 'in-progress' | 'non-compliant';
  lastCheck: string;
}) {
  const statusConfig = {
    compliant: { color: 'text-green-700 bg-green-100', icon: CheckCircle, text: 'Compliant' },
    'in-progress': { color: 'text-yellow-700 bg-yellow-100', icon: Clock, text: 'In Progress' },
    'non-compliant': { color: 'text-red-700 bg-red-100', icon: AlertTriangle, text: 'Non-Compliant' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">Last check: {lastCheck}</p>
      </div>
      <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${config.color}`}>
        <StatusIcon className="h-4 w-4" />
        <span className="text-xs font-medium">{config.text}</span>
      </div>
    </div>
  );
}

function LogRow({
  timestamp,
  action,
  user,
  ip,
  status,
}: {
  timestamp: string;
  action: string;
  user: string;
  ip: string;
  status: string;
}) {
  return (
    <tr>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{timestamp}</td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        <code className="rounded bg-gray-100 px-2 py-1 text-xs">{action}</code>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{user}</td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{ip}</td>
      <td className="whitespace-nowrap px-6 py-4 text-sm">
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            status === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {status}
        </span>
      </td>
    </tr>
  );
}
