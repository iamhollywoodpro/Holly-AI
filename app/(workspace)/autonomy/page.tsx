"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Brain, Activity, Shield, Zap, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, RefreshCw, Clock, ArrowLeft, MessageSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AutonomyMetrics {
  total: number;
  autoApproved: number;
  successful: number;
  failed: number;
  autoApprovalRate: number;
  successRate: number;
  failureRate: number;
  byRiskLevel: { low: number; medium: number; high: number };
}

interface HealthIssue {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  description: string;
  suggestedAction?: string;
}

type Timeframe = "24h" | "7d" | "30d";

// ─── Severity styling ─────────────────────────────────────────────────────────
const severityConfig = {
  critical: { bg: "bg-red-500/10",    border: "border-red-500/30",    text: "text-red-400",    badge: "bg-red-500/20 text-red-300" },
  high:     { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", badge: "bg-orange-500/20 text-orange-300" },
  medium:   { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-300" },
  low:      { bg: "bg-blue-500/10",   border: "border-blue-500/30",   text: "text-blue-400",   badge: "bg-blue-500/20 text-blue-300" },
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
        <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AutonomyDashboard() {
  const [metrics, setMetrics] = useState<{
    last24Hours: AutonomyMetrics;
    last7Days:   AutonomyMetrics;
    last30Days:  AutonomyMetrics;
  } | null>(null);
  const [healthIssues, setHealthIssues] = useState<HealthIssue[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [fixingId, setFixingId]       = useState<string | null>(null);
  const [timeframe, setTimeframe]     = useState<Timeframe>("7d");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [analyticsRes, healthRes] = await Promise.all([
        fetch("/api/autonomy/analytics", { credentials: "include" }),
        fetch("/api/autonomy/health",    { credentials: "include" }),
      ]);
      const [analyticsData, healthData] = await Promise.all([
        analyticsRes.json(),
        healthRes.json(),
      ]);
      if (analyticsData.success) setMetrics(analyticsData.metrics);
      if (healthData.success)    setHealthIssues(healthData.health?.issues || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[Autonomy] Failed to fetch:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const triggerAutoFix = async (issueId: string) => {
    setFixingId(issueId);
    try {
      const res  = await fetch("/api/autonomy/self-heal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ issueId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error("[AutoFix]", err);
    } finally {
      setFixingId(null);
    }
  };

  const current = timeframe === "24h" ? metrics?.last24Hours
                : timeframe === "7d"  ? metrics?.last7Days
                : metrics?.last30Days;

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <FeatureNav title="Autonomy" />
        <div className="flex items-center justify-center flex-1">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-8 h-8 text-purple-400" />
          </motion.div>
          <p className="text-sm text-gray-500">Loading autonomy data…</p>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
    <FeatureNav title="Autonomy" />
    <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6 w-full">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-purple-400" />
            Autonomy Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            HOLLY's self-healing, decision-making, and consciousness metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Timeframe selector ── */}
      <div className="flex gap-1 p-1 bg-gray-900 border border-gray-800 rounded-lg w-fit">
        {(["24h", "7d", "30d"] as Timeframe[]).map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              timeframe === tf
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {tf === "24h" ? "24 hours" : tf === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      {/* ── Metrics grid ── */}
      {current && current.total > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Auto-Approval Rate"
            value={`${Math.round((current.autoApprovalRate ?? 0) * 100)}%`}
            sub={`${current.autoApproved} / ${current.total} improvements`}
            icon={Zap}
            color="bg-purple-500/20 text-purple-400"
          />
          <StatCard
            label="Success Rate"
            value={`${Math.round((current.successRate ?? 0) * 100)}%`}
            sub={`${current.successful} successful deployments`}
            icon={TrendingUp}
            color="bg-green-500/20 text-green-400"
          />
          <StatCard
            label="Failure Rate"
            value={`${Math.round((current.failureRate ?? 0) * 100)}%`}
            sub={`${current.failed} failed deployments`}
            icon={TrendingDown}
            color="bg-red-500/20 text-red-400"
          />
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <Activity className="w-8 h-8 text-purple-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-medium">Autonomy metrics will populate as HOLLY operates</p>
          <p className="text-xs text-gray-600 mt-1">Self-improvements, auto-approvals, and deployment stats will appear here</p>
        </div>
      )}

      {/* ── Risk breakdown ── */}
      {current && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-400" />
            Improvements by Risk Level
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Low Risk",    count: current.byRiskLevel.low,    color: "text-green-400",  bg: "bg-green-500/10"  },
              { label: "Medium Risk", count: current.byRiskLevel.medium, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { label: "High Risk",   count: current.byRiskLevel.high,   color: "text-red-400",    bg: "bg-red-500/10"    },
            ].map(r => (
              <div key={r.label} className={`${r.bg} rounded-lg p-4 text-center`}>
                <p className={`text-2xl font-bold ${r.color}`}>{r.count}</p>
                <p className="text-xs text-gray-500 mt-1">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── System Health ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-gray-400" />
          System Health
        </h2>

        {healthIssues.length === 0 ? (
          <div className="flex items-center gap-2.5 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">All systems operational</span>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {healthIssues.map(issue => {
                const cfg = severityConfig[issue.severity] || severityConfig.low;
                return (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertTriangle className={`w-3.5 h-3.5 ${cfg.text} flex-shrink-0`} />
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                            {issue.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 truncate">{issue.type}</span>
                        </div>
                        <p className="text-sm text-gray-200">{issue.description}</p>
                        {issue.suggestedAction && (
                          <p className="text-xs text-gray-500 mt-1 italic">
                            Suggested: {issue.suggestedAction}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => triggerAutoFix(issue.id)}
                        disabled={fixingId === issue.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white disabled:opacity-50 transition-colors flex-shrink-0"
                      >
                        {fixingId === issue.id
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <Zap className="w-3 h-3" />
                        }
                        {fixingId === issue.id ? "Fixing…" : "Auto-Fix"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Agent Mode teaser ── */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">HOLLY Agent Mode</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Give HOLLY a high-level goal and she'll plan + execute multi-step tasks autonomously using her tool suite.
          </p>
        </div>
        <a
          href="/chat"
          className="flex-shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Open Chat →
        </a>
      </div>

    </div>
    </div>
  );
}

// ─── Minimal feature nav ─────────────────────────────────────────────────────
function FeatureNav({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/60">
      <div className="flex items-center gap-3">
        <Link href="/chat" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/40 transition-all text-gray-400 hover:text-white text-xs font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back to Chat</span>
        </Link>
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <Link href="/chat" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-all text-purple-300 hover:text-white text-xs font-medium">
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Open Chat</span>
      </Link>
    </header>
  );
}
