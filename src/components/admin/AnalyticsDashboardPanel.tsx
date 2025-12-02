/**
 * Analytics Dashboard Panel
 * Phase 4A - Advanced analytics visualization
 */

'use client';

import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertCircle, Code, Zap, Target, Shield } from 'lucide-react';

interface AnalyticsData {
  codeQuality: any;
  performance: any;
  technicalDebt: any;
  predictions: any;
  selfHealing: any;
  trends: any;
}

export function AnalyticsDashboardPanel() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [healthScore, setHealthScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/dashboard?range=${timeRange}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.analytics);
        setHealthScore(data.healthScore);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
      case 'decreasing':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'degrading':
      case 'increasing':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />;
    }
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8 text-center text-gray-500">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">System Health Score</h2>
            <p className="text-purple-100">Overall codebase health assessment</p>
          </div>
          <div className="text-right">
            <div className={`text-6xl font-bold ${getHealthColor(healthScore)}`}>
              {healthScore}
            </div>
            <p className="text-sm text-purple-100 mt-1">out of 100</p>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics Overview</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === '7d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === '30d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Code Quality Metrics */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold">Code Quality</h3>
          </div>
          {analytics.codeQuality.trend && getTrendIcon(analytics.codeQuality.trend)}
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Quality Score</p>
              <p className="text-2xl font-bold text-blue-600">
                {analytics.codeQuality.averages?.quality?.toFixed(0) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Complexity</p>
              <p className="text-2xl font-bold text-purple-600">
                {analytics.codeQuality.averages?.complexity?.toFixed(0) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Maintainability</p>
              <p className="text-2xl font-bold text-green-600">
                {analytics.codeQuality.averages?.maintainability?.toFixed(0) || 'N/A'}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Test Coverage</p>
              <p className="text-2xl font-bold text-yellow-600">
                {analytics.codeQuality.averages?.coverage?.toFixed(0) || 'N/A'}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold">Performance</h3>
          </div>
          {analytics.performance.trend && getTrendIcon(analytics.performance.trend)}
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Issues</p>
              <p className="text-2xl font-bold">{analytics.performance.total}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Open Issues</p>
              <p className="text-2xl font-bold text-orange-600">{analytics.performance.open}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Critical Issues</p>
              <p className="text-2xl font-bold text-red-600">{analytics.performance.critical}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Response Time</p>
              <p className="text-2xl font-bold text-blue-600">
                {analytics.performance.avgResponseTime?.toFixed(0) || 0}ms
              </p>
            </div>
          </div>

          {/* Top Endpoints */}
          {analytics.performance.byEndpoint?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Top Issues by Endpoint</h4>
              <div className="space-y-2">
                {analytics.performance.byEndpoint.slice(0, 5).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700 truncate">{item.endpoint}</span>
                    <span className="text-sm font-medium text-red-600">{item.count} issues</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Technical Debt */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Technical Debt</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Items</p>
              <p className="text-2xl font-bold">{analytics.technicalDebt.total}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Unresolved</p>
              <p className="text-2xl font-bold text-red-600">{analytics.technicalDebt.unresolved}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Effort (Hours)</p>
              <p className="text-2xl font-bold text-purple-600">
                {analytics.technicalDebt.unresolvedEffortHours}h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Debt Ratio</p>
              <p className="text-2xl font-bold text-yellow-600">
                {analytics.technicalDebt.debtRatio?.toFixed(1) || 0}%
              </p>
            </div>
          </div>

          {/* Severity Breakdown */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(analytics.technicalDebt.bySeverity || {}).map(([severity, count]: any) => (
              <div key={severity} className="p-3 bg-gray-50 rounded text-center">
                <p className="text-xs text-gray-600 uppercase mb-1">{severity}</p>
                <p className="text-xl font-bold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Predictions & Self-Healing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Predictions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
            <Target className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Predictions</h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Predictions</span>
                <span className="text-lg font-bold">{analytics.predictions.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Accuracy</span>
                <span className="text-lg font-bold text-green-600">
                  {analytics.predictions.accuracy}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Prevented</span>
                <span className="text-lg font-bold text-blue-600">
                  {analytics.predictions.prevented}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Confidence</span>
                <span className="text-lg font-bold text-purple-600">
                  {(analytics.predictions.avgConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Self-Healing */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">Self-Healing</h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Actions</span>
                <span className="text-lg font-bold">{analytics.selfHealing.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-lg font-bold text-green-600">
                  {analytics.selfHealing.successRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Successful</span>
                <span className="text-lg font-bold text-blue-600">
                  {analytics.selfHealing.successful}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Time to Heal</span>
                <span className="text-lg font-bold text-purple-600">
                  {analytics.selfHealing.avgTimeToHealMinutes}m
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Chart (Simple visualization) */}
      {analytics.trends?.daily && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">30-Day Trends</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <p className="text-sm text-gray-600">Code Changes</p>
                <p className="text-xl font-bold text-blue-600">
                  {analytics.trends.summary.totalCodeChanges}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <p className="text-sm text-gray-600">Healing Actions</p>
                <p className="text-xl font-bold text-green-600">
                  {analytics.trends.summary.totalHealingActions}
                </p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <p className="text-sm text-gray-600">Perf Issues</p>
                <p className="text-xl font-bold text-yellow-600">
                  {analytics.trends.summary.totalPerfIssues}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded">
                <p className="text-sm text-gray-600">Predictions</p>
                <p className="text-xl font-bold text-purple-600">
                  {analytics.trends.summary.totalPredictions}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Detailed chart visualization coming soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
