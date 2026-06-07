'use client';

import { MetricCard } from '@/components/dashboard/metrics/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { AutonomousFeatures } from '@/components/dashboard/AutonomousFeatures';
import {
  Image,
  FileText,
  Shield,
  Network,
  TrendingUp,
  Users,
  Activity,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAssets } from '@/hooks/useCreative';
import { useMetrics } from '@/hooks/useAnalytics';
import { useSecurityReport } from '@/hooks/useSecurity';
import { useAgents, useResourceUtilization } from '@/hooks/useOrchestration';

export default function DashboardPage() {
  const { assets, loading: assetsLoading } = useAssets();
  const { metrics, loading: metricsLoading } = useMetrics();
  const { report: securityReport, loading: securityLoading } = useSecurityReport();
  const { agents, loading: agentsLoading } = useAgents();
  const { resources, loading: resourcesLoading } = useResourceUtilization();

  // Calculate stats from real data
  const imageAssets = assets.filter(a => a.type === 'image').length;
  const contentAssets = assets.filter(a => a.type === 'content').length;
  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'busy').length;
  const idleAgents = agents.filter(a => a.status === 'idle').length;

  // Recent activity from assets (last 4)
  const recentAssets = assets.slice(0, 4);

  if (assetsLoading && assets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#66CCCC]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#F5F0E8]">Dashboard Overview</h1>
        <p className="mt-2 text-[#8C8476]">
          Welcome back! Here's what's happening with Holly AI today.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Images Generated"
          value={imageAssets.toString()}
          change={`${assets.length} total assets`}
          changeType="neutral"
          icon={Image}
          iconColor="text-[#66CCCC]"
        />
        <MetricCard
          title="Content Created"
          value={contentAssets.toString()}
          change={`${metrics.length} metrics tracked`}
          changeType="neutral"
          icon={FileText}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Active Agents"
          value={activeAgents.toString()}
          change={`${idleAgents} idle`}
          changeType="neutral"
          icon={Network}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Security Score"
          value={securityReport ? `${securityReport.securityScore}%` : '--'}
          change={securityReport && securityReport.activeThreats === 0 ? 'No threats detected' : `${securityReport?.activeThreats || 0} threats`}
          changeType={securityReport && securityReport.activeThreats === 0 ? 'positive' : 'negative'}
          icon={Shield}
          iconColor="text-red-600"
        />
      </div>

      {/* Activity Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#66CCCC]" />
              </div>
            ) : recentAssets.length === 0 ? (
              <div className="py-8 text-center text-[#8C8476]">
                No recent activity
              </div>
            ) : (
              <div className="space-y-4">
                {recentAssets.map((asset) => (
                  <ActivityItem
                    key={asset.id}
                    icon={asset.type === 'image' ? Image : FileText}
                    title={asset.type === 'image' ? 'Image Generated' : 'Content Created'}
                    description={asset.name || 'Untitled'}
                    time={new Date(asset.createdAt).toLocaleString()}
                    color={asset.type === 'image' ? 'text-[#66CCCC]' : 'text-blue-600'}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {resourcesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#66CCCC]" />
              </div>
            ) : !resources ? (
              <div className="py-8 text-center text-[#8C8476]">
                No resource data available
              </div>
            ) : (
              <div className="space-y-4">
                <StatBar label="CPU Usage" value={resources.cpu} color="bg-green-500" />
                <StatBar label="Memory Usage" value={resources.memory} color="bg-blue-500" />
                <StatBar label="Storage Usage" value={resources.storage} color="bg-[#3DAF76]" />
                <StatBar label="Network Usage" value={resources.network} color="bg-yellow-500" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Autonomous Features Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#66CCCC]" />
            Autonomous Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AutonomousFeatures />
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agents Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-green-600" />
              Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#66CCCC]" />
              </div>
            ) : agents.length === 0 ? (
              <p className="text-sm text-[#8C8476]">No agents available</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Total Agents:</span>
                  <span className="font-medium text-[#F5F0E8]">{agents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Active:</span>
                  <span className="font-medium text-green-600">{activeAgents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Idle:</span>
                  <span className="font-medium text-[#5C564D]">{idleAgents}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              Security Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {securityLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#66CCCC]" />
              </div>
            ) : !securityReport ? (
              <p className="text-sm text-[#8C8476]">No security data available</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Security Score:</span>
                  <span className={`font-medium ${
                    securityReport.securityScore >= 80 ? 'text-green-600' :
                    securityReport.securityScore >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>{securityReport.securityScore}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Active Threats:</span>
                  <span className={`font-medium ${
                    securityReport.activeThreats === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>{securityReport.activeThreats}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Blocked Requests:</span>
                  <span className="font-medium text-[#F5F0E8]">{securityReport.blockedRequests}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metrics Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Analytics Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[#66CCCC]" />
              </div>
            ) : metrics.length === 0 ? (
              <p className="text-sm text-[#8C8476]">No metrics tracked yet</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Total Metrics:</span>
                  <span className="font-medium text-[#F5F0E8]">{metrics.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Avg Value:</span>
                  <span className="font-medium text-blue-600">
                    {Math.round(metrics.reduce((sum, m) => sum + (m.value || 0), 0) / metrics.length)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#8C8476]">Categories:</span>
                  <span className="font-medium text-[#F5F0E8]">
                    {new Set(metrics.map(m => m.category)).size}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  title,
  description,
  time,
  color,
}: {
  icon: any;
  title: string;
  description: string;
  time: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={`rounded-lg bg-[#1E1B18] p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-[#F5F0E8]">{title}</p>
        <p className="text-sm text-[#8C8476]">{description}</p>
        <p className="mt-1 text-xs text-[#5C564D]">{time}</p>
      </div>
    </div>
  );
}

function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-medium text-[#F5F0E8]">{label}</span>
        <span className="text-[#8C8476]">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/10">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
