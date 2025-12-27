"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { ConsciousnessIndicator } from '@/components/holly2/ConsciousnessIndicator';
import { Brain, ArrowLeft } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface AutonomyMetrics {
  total: number;
  autoApproved: number;
  successful: number;
  failed: number;
  autoApprovalRate: number;
  successRate: number;
  failureRate: number;
  byRiskLevel: {
    low: number;
    medium: number;
    high: number;
  };
}

interface HealthIssue {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  description: string;
  suggestedAction?: string;
}

export default function AutonomyDashboard() {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<{
    last24Hours: AutonomyMetrics;
    last7Days: AutonomyMetrics;
    last30Days: AutonomyMetrics;
  } | null>(null);
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"24h" | "7d" | "30d">("7d");

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch analytics
      const analyticsRes = await fetch("/api/autonomy/analytics");
      const analyticsData = await analyticsRes.json();

      if (analyticsData.success) {
        setMetrics(analyticsData.metrics);
      }

      // Fetch health status
      const healthRes = await fetch("/api/autonomy/health");
      const healthData = await healthRes.json();

      if (healthData.success) {
        setHealthIssues(healthData.health.issues);
      }
    } catch (error) {
      console.error("Failed to fetch autonomy data:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAutoFix = async (issueId: string) => {
    try {
      const res = await fetch("/api/autonomy/health/auto-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Auto-fix triggered! Improvement ID: ${data.improvementId}`);
        fetchData(); // Refresh data
      } else {
        alert(`Failed to trigger auto-fix: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to trigger auto-fix:", error);
      alert("Failed to trigger auto-fix");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading autonomy dashboard...</div>
      </div>
    );
  }

  const currentMetrics =
    selectedTimeframe === "24h"
      ? metrics?.last24Hours
      : selectedTimeframe === "7d"
      ? metrics?.last7Days
      : metrics?.last30Days;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.location.href = '/'}
              className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              title="Back to HOLLY Chat"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              🤖 Autonomy Dashboard
            </h1>
          </div>
          <p className="text-gray-600">
            Monitor HOLLY's autonomous decision-making, self-healing capabilities, and consciousness state
          </p>
        </div>

        {/* Consciousness Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain size={24} style={{ color: cyberpunkTheme.colors.primary.cyan }} />
            <h2 className="text-xl font-semibold text-gray-900">
              HOLLY's Consciousness
            </h2>
          </div>
          <div className="flex items-center justify-center py-4">
            <ConsciousnessIndicator />
          </div>
          <p className="text-sm text-gray-600 text-center mt-4">
            Click the consciousness indicator to view detailed metrics
          </p>
        </div>

        {/* Health Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            System Health
          </h2>

          {healthIssues.length === 0 ? (
            <div className="flex items-center text-green-600">
              <span className="text-2xl mr-2">✓</span>
              <span className="font-medium">All systems operational</span>
            </div>
          ) : (
            <div className="space-y-3">
              {healthIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(
                    issue.severity
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="font-semibold uppercase text-xs mr-2">
                          {issue.severity}
                        </span>
                        <span className="text-sm text-gray-600">
                          {issue.type}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{issue.description}</p>
                      {issue.suggestedAction && (
                        <p className="text-xs italic">
                          Suggested: {issue.suggestedAction}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => triggerAutoFix(issue.id)}
                      className="ml-4 px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
                    >
                      Auto-Fix
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Autonomy Metrics
            </h2>
            <div className="flex gap-2">
              {["24h", "7d", "30d"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf as any)}
                  className={`px-3 py-1 rounded text-sm ${
                    selectedTimeframe === tf
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tf === "24h" ? "24 Hours" : tf === "7d" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>
          </div>

          {currentMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium mb-1">
                  Auto-Approval Rate
                </div>
                <div className="text-3xl font-bold text-purple-900">
                  {Math.round(currentMetrics.autoApprovalRate * 100)}%
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  {currentMetrics.autoApproved} / {currentMetrics.total} improvements
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium mb-1">
                  Success Rate
                </div>
                <div className="text-3xl font-bold text-green-900">
                  {Math.round(currentMetrics.successRate * 100)}%
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {currentMetrics.successful} successful deployments
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                <div className="text-sm text-red-600 font-medium mb-1">
                  Failure Rate
                </div>
                <div className="text-3xl font-bold text-red-900">
                  {Math.round(currentMetrics.failureRate * 100)}%
                </div>
                <div className="text-xs text-red-600 mt-1">
                  {currentMetrics.failed} failed deployments
                </div>
              </div>
            </div>
          )}

          {currentMetrics && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Improvements by Risk Level
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {currentMetrics.byRiskLevel.low}
                  </div>
                  <div className="text-xs text-gray-600">Low Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {currentMetrics.byRiskLevel.medium}
                  </div>
                  <div className="text-xs text-gray-600">Medium Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {currentMetrics.byRiskLevel.high}
                  </div>
                  <div className="text-xs text-gray-600">High Risk</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
