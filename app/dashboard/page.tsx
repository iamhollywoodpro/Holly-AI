'use client';

import { MetricCard } from '@/components/dashboard/metrics/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import {
  Image,
  FileText,
  Shield,
  Network,
  TrendingUp,
  Users,
  Activity,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-gray-600">
          Welcome back! Here's what's happening with Holly AI today.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Images Generated"
          value="1,234"
          change="+12% from last week"
          changeType="positive"
          icon={Image}
          iconColor="text-purple-600"
        />
        <MetricCard
          title="Content Created"
          value="856"
          change="+8% from last week"
          changeType="positive"
          icon={FileText}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Active Agents"
          value="12"
          change="3 idle"
          changeType="neutral"
          icon={Network}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Security Score"
          value="98%"
          change="No threats detected"
          changeType="positive"
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
            <div className="space-y-4">
              <ActivityItem
                icon={Image}
                title="Image Generated"
                description="Cyberpunk cityscape"
                time="2 minutes ago"
                color="text-purple-600"
              />
              <ActivityItem
                icon={FileText}
                title="Content Created"
                description="Blog post: AI in 2025"
                time="15 minutes ago"
                color="text-blue-600"
              />
              <ActivityItem
                icon={Network}
                title="Workflow Executed"
                description="Data processing pipeline"
                time="1 hour ago"
                color="text-green-600"
              />
              <ActivityItem
                icon={Shield}
                title="Security Scan"
                description="All systems secure"
                time="2 hours ago"
                color="text-red-600"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <StatBar label="API Response Time" value={85} color="bg-green-500" />
              <StatBar label="Resource Utilization" value={62} color="bg-blue-500" />
              <StatBar label="Task Completion Rate" value={94} color="bg-purple-500" />
              <StatBar label="Agent Efficiency" value={78} color="bg-yellow-500" />
            </div>
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
      <div className={`rounded-lg bg-gray-100 p-2 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="mt-1 text-xs text-gray-400">{time}</p>
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
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-600">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
