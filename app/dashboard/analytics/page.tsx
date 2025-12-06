'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { MetricCard } from '@/components/dashboard/metrics/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { BarChart } from '@/components/dashboard/charts/BarChart';
import { TrendingUp, Users, DollarSign, Activity, Download, RefreshCw } from 'lucide-react';

// Mock data for charts
const trendData = [
  { name: 'Mon', value: 120 },
  { name: 'Tue', value: 145 },
  { name: 'Wed', value: 132 },
  { name: 'Thu', value: 168 },
  { name: 'Fri', value: 190 },
  { name: 'Sat', value: 175 },
  { name: 'Sun', value: 155 },
];

const categoryData = [
  { name: 'Images', value: 456 },
  { name: 'Content', value: 234 },
  { name: 'Reports', value: 189 },
  { name: 'Workflows', value: 123 },
];

export default function AnalyticsDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-gray-600">
            Monitor performance metrics and generate insights.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value="12,345"
          change="+15% from last month"
          changeType="positive"
          icon={Users}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Conversion Rate"
          value="8.5%"
          change="+2.3% from last month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Revenue"
          value="$45,678"
          change="+12% from last month"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-purple-600"
        />
        <MetricCard
          title="Active Sessions"
          value="1,234"
          change="-5% from yesterday"
          changeType="negative"
          icon={Activity}
          iconColor="text-orange-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <LineChart data={trendData} color="#8b5cf6" />
            </div>
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Usage by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <BarChart data={categoryData} color="#3b82f6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Reports</CardTitle>
              <button className="text-sm font-medium text-purple-600 hover:text-purple-700">
                View All
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ReportItem
                name="Monthly Performance Report"
                date="Dec 6, 2025"
                status="completed"
              />
              <ReportItem
                name="User Engagement Analysis"
                date="Dec 5, 2025"
                status="completed"
              />
              <ReportItem
                name="Revenue Breakdown Q4"
                date="Dec 4, 2025"
                status="completed"
              />
              <ReportItem
                name="Campaign Performance"
                date="Dec 3, 2025"
                status="completed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Top Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <MetricItem
                label="Page Views"
                value="45,678"
                change="+23%"
                positive={true}
              />
              <MetricItem
                label="Bounce Rate"
                value="32%"
                change="-8%"
                positive={true}
              />
              <MetricItem
                label="Avg. Session Duration"
                value="4m 32s"
                change="+15%"
                positive={true}
              />
              <MetricItem
                label="Goal Completions"
                value="1,234"
                change="+18%"
                positive={true}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportItem({
  name,
  date,
  status,
}: {
  name: string;
  date: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">{date}</p>
      </div>
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
        {status}
      </span>
    </div>
  );
}

function MetricItem({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <span
        className={`text-sm font-medium ${
          positive ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {change}
      </span>
    </div>
  );
}
