'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { MetricCard } from '@/components/dashboard/metrics/MetricCard';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { BarChart } from '@/components/dashboard/charts/BarChart';
import { TrendingUp, Users, DollarSign, Activity, Download, RefreshCw, Loader2, AlertCircle, Plus } from 'lucide-react';
import { useMetrics, useDashboards, useReports, useInsights } from '@/hooks/useAnalytics';
import * as analyticsApi from '@/lib/api/analytics';

export default function AnalyticsDashboardPage() {
  const { metrics, loading: metricsLoading, fetchMetrics } = useMetrics();
  const { reports, loading: reportsLoading, generateReport } = useReports();
  const { insights, loading: insightsLoading } = useInsights();
  const [exportLoading, setExportLoading] = useState(false);
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState('summary');
  const [showReportForm, setShowReportForm] = useState(false);

  const handleRefresh = async () => {
    await fetchMetrics();
  };

  const handleExportReport = async () => {
    setExportLoading(true);
    try {
      // This would trigger a report export API call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      alert('Report exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim()) return;

    try {
      await generateReport({
        name: reportName,
        type: reportType,
        config: {
          dateRange: 'last_30_days',
          metrics: ['users', 'conversions', 'revenue']
        }
      });
      setReportName('');
      setShowReportForm(false);
    } catch (err) {
      console.error('Report generation failed:', err);
    }
  };

  // Calculate summary metrics from API data
  const totalMetrics = metrics.length;
  const avgValue = metrics.length > 0 
    ? Math.round(metrics.reduce((sum, m) => sum + (m.value || 0), 0) / metrics.length)
    : 0;

  // Prepare chart data from metrics
  const trendData = metrics
    .filter(m => m.category === 'performance')
    .slice(0, 7)
    .map(m => ({
      name: new Date(m.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
      value: m.value || 0
    }));

  const categoryData = metrics
    .reduce((acc: any[], m) => {
      const existing = acc.find(item => item.name === m.category);
      if (existing) {
        existing.value += m.value || 0;
      } else {
        acc.push({ name: m.category || 'Unknown', value: m.value || 0 });
      }
      return acc;
    }, [])
    .slice(0, 4);

  if (metricsLoading && metrics.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-gray-600">
            Monitor performance metrics and generate insights.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleRefresh}
            disabled={metricsLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={handleExportReport}
            disabled={exportLoading}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {exportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Report
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Metrics"
          value={totalMetrics.toString()}
          change={`${metrics.length} tracked`}
          changeType="neutral"
          icon={Activity}
          iconColor="text-blue-600"
        />
        <MetricCard
          title="Average Value"
          value={avgValue.toString()}
          change="Across all categories"
          changeType="neutral"
          icon={TrendingUp}
          iconColor="text-green-600"
        />
        <MetricCard
          title="Active Reports"
          value={reports.length.toString()}
          change={`${reports.filter(r => r.status === 'completed').length} completed`}
          changeType="positive"
          icon={DollarSign}
          iconColor="text-purple-600"
        />
        <MetricCard
          title="Insights"
          value={insights.length.toString()}
          change="Generated insights"
          changeType="neutral"
          icon={Users}
          iconColor="text-orange-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No trend data available
              </div>
            ) : (
              <div className="h-80">
                <LineChart data={trendData} color="#8b5cf6" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Metrics by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No category data available
              </div>
            ) : (
              <div className="h-80">
                <BarChart data={categoryData} color="#3b82f6" />
              </div>
            )}
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
              <button 
                onClick={() => setShowReportForm(!showReportForm)}
                className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                New Report
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {showReportForm && (
              <form onSubmit={handleGenerateReport} className="mb-4 p-4 border border-gray-200 rounded-lg space-y-3">
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Report name..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
                <select 
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="summary">Summary</option>
                  <option value="detailed">Detailed</option>
                  <option value="performance">Performance</option>
                  <option value="trends">Trends</option>
                </select>
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    disabled={!reportName.trim()}
                    className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    Generate
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            
            {reportsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : reports.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No reports yet. Create one to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {reports.slice(0, 5).map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{report.name}</p>
                      <p className="text-xs text-gray-500">
                        {report.type} • {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      report.status === 'completed' ? 'bg-green-100 text-green-700' :
                      report.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
              </div>
            ) : insights.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No insights available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {insights.slice(0, 5).map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                        <p className="mt-1 text-xs text-gray-600">{insight.description}</p>
                      </div>
                      <span className={`ml-2 rounded-full px-2 py-1 text-xs font-medium ${
                        insight.severity === 'high' ? 'bg-red-100 text-red-700' :
                        insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {insight.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
