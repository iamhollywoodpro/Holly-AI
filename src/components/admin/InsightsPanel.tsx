/**
 * PHASE 3: Insights Dashboard
 * Admin UI for viewing performance issues, refactoring recommendations, and learning insights
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Code,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface InsightData {
  performance?: {
    stats: any;
    issues: any[];
  };
  refactoring?: {
    stats: any;
    recommendations: any[];
  };
  learning?: {
    stats: any;
    insights: any[];
  };
  codeChanges?: {
    stats: any;
    recent: any[];
  };
  selfHealing?: {
    stats: any;
    recent: any[];
  };
}

type InsightType = 'all' | 'performance' | 'refactoring' | 'learning';

export function InsightsPanel() {
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<InsightType>('all');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch insights
  const fetchInsights = async (type: InsightType = selectedType) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/insights?type=${type}&limit=50`);
      const data = await response.json();
      
      if (data.success) {
        setInsights(data.insights);
        setLastUpdate(new Date(data.timestamp));
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and refresh every 60 seconds
  useEffect(() => {
    fetchInsights();
    const interval = setInterval(() => fetchInsights(), 60000);
    return () => clearInterval(interval);
  }, [selectedType]);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900',
      high: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900',
      medium: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900',
      low: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900'
    };
    return colors[severity] || colors.medium;
  };

  const getPriorityColor = (priority: string) => {
    return getSeverityColor(priority);
  };

  if (!insights) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                System Insights
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Performance, refactoring, and learning intelligence
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchInsights()}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh insights"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex space-x-2">
          {(['all', 'performance', 'refactoring', 'learning'] as InsightType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                fetchInsights(type);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Issues */}
      {insights.performance && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Performance Issues
            </h3>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {insights.performance.stats.total}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Issues</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {insights.performance.stats.bySeverity.critical}
              </div>
              <div className="text-sm text-red-700 dark:text-red-500">Critical</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {insights.performance.stats.bySeverity.high}
              </div>
              <div className="text-sm text-orange-700 dark:text-orange-500">High</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {insights.performance.stats.resolved}
              </div>
              <div className="text-sm text-green-700 dark:text-green-500">Resolved</div>
            </div>
          </div>

          {/* Recent Issues */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {insights.performance.issues.slice(0, 10).map((issue: any) => (
              <div
                key={issue.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {issue.issueType.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white mb-2">
                  {issue.description}
                </p>
                {issue.estimatedImpact && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Impact: {issue.estimatedImpact}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refactoring Recommendations */}
      {insights.refactoring && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <Code className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Refactoring Recommendations
            </h3>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {insights.refactoring.stats.total}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Suggestions</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                {insights.refactoring.stats.suggested}
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-500">Suggested</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {insights.refactoring.stats.inProgress}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-500">In Progress</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {insights.refactoring.stats.completed}
              </div>
              <div className="text-sm text-green-700 dark:text-green-500">Completed</div>
            </div>
          </div>

          {/* Recent Recommendations */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {insights.refactoring.recommendations.slice(0, 10).map((rec: any) => (
              <div
                key={rec.id}
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                    {rec.priority}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {rec.recommendationType.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-900 dark:text-white mb-2">
                  {rec.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Effort: {rec.estimatedEffort}</span>
                  <span>Benefit: {rec.estimatedBenefit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Insights */}
      {insights.learning && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center space-x-3 mb-4">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Learning Insights
            </h3>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {insights.learning.stats.total}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Insights</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {insights.learning.stats.actionable}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-500">Actionable</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {insights.learning.stats.applied}
              </div>
              <div className="text-sm text-green-700 dark:text-green-500">Applied</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {(insights.learning.stats.averageConfidence * 100).toFixed(0)}%
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-500">Avg Confidence</div>
            </div>
          </div>

          {/* Recent Insights */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {insights.learning.insights.slice(0, 10).map((insight: any) => (
              <div
                key={insight.id}
                className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {insight.title}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {(insight.confidence * 100).toFixed(0)}% confident
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {insight.description}
                </p>
                {insight.impact && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded text-xs">
                    <strong>Impact:</strong> {insight.impact}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      )}
    </div>
  );
}
