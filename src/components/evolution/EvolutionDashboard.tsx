"use client";

/**
 * HOLLY Evolution Dashboard — Phase 5B
 *
 * Real-time view of HOLLY's growth:
 *  • Identity confidence arc + trait cloud
 *  • Emotion history timeline (Recharts line chart)
 *  • Learning patterns table
 *  • Evolution proposals feed
 *  • Taste style radar
 *  • Active goals list
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import {
  Brain, Sparkles, TrendingUp, Target, Heart,
  Zap, RefreshCw, ChevronRight, AlertCircle,
  CheckCircle2, Clock, BookOpen, Palette,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  identity: {
    traits: string[];
    values: string[];
    strengths: string[];
    interests: string[];
    growthAreas: string[];
    confidence: number;
    purpose: string;
    lastEvolved: string | null;
  } | null;
  emotions: {
    history: Array<{ emotion: string; intensity: number; valence: number; arousal: number; ts: string }>;
    topEmotions: Array<{ name: string; count: number; pct: number }>;
    trend: number;
    totalSampled: number;
  };
  patterns: Array<{ pattern: string; category: string; frequency: number; confidence: number; lastSeen: string }>;
  proposals: Array<{ title: string; type: string; impact: string; risk: string; status: string; proposedAt: string; rationale: string }>;
  learning: { totalEvents: number; last7Days: Record<string, number>; totalLast7: number };
  taste: {
    tone: number; verbosity: number; humor: number; technical: number; emoji: number;
    topTopics: string[]; signalCount: number;
  } | null;
  goals: Array<{ title: string; category: string; priority: number }>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
  joy: "#facc15", excitement: "#f97316", gratitude: "#86efac", curiosity: "#60a5fa",
  pride: "#a78bfa", contentment: "#34d399", sadness: "#94a3b8", frustration: "#f87171",
  anxiety: "#fb923c", anger: "#ef4444", confusion: "#c084fc", determination: "#38bdf8",
  breakthrough: "#fbbf24", neutral: "#6b7280",
};

const CATEGORY_COLOR: Record<string, string> = {
  user_preference: "#a78bfa", common_query: "#60a5fa",
  error_pattern: "#f87171", success_pattern: "#34d399",
};

const PROPOSAL_STATUS_STYLE: Record<string, string> = {
  proposed: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved:  "bg-green-500/15 text-green-300 border-green-500/30",
  rejected:  "bg-red-500/15 text-red-300 border-red-500/30",
  deployed:  "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

function ConfidenceArc({ value }: { value: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 1);
  const dash = pct * circ * 0.75;
  const gap = circ - dash;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-[135deg]">
        {/* Track */}
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1f2937" strokeWidth="10"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
        {/* Fill */}
        <motion.circle
          cx="70" cy="70" r={r} fill="none"
          stroke="url(#confGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${dash} ${gap + circ * 0.25}`}
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${gap + circ * 0.25}` }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="confGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <motion.p
          className="text-3xl font-bold text-white"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          {Math.round(pct * 100)}%
        </motion.p>
        <p className="text-[10px] text-gray-500 mt-0.5">confidence</p>
      </div>
    </div>
  );
}

function TagCloud({ items, color = "purple" }: { items: string[]; color?: string }) {
  const cls = color === "purple"
    ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
    : color === "blue"
    ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
    : "bg-green-500/10 text-green-300 border-green-500/20";

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(t => (
        <span key={t} className={`px-2.5 py-1 text-xs rounded-full border ${cls}`}>{t}</span>
      ))}
      {items.length === 0 && <span className="text-xs text-gray-600">No data yet</span>}
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className = "" }: {
  title: string; icon: any; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-900/80 border border-gray-800/60 rounded-2xl p-5 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-purple-500/10 rounded-lg">
          <Icon className="w-4 h-4 text-purple-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Main dashboard ────────────────────────────────────────────────────────────

export default function EvolutionDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evolution/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <motion.div
          className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          <Sparkles className="w-7 h-7 text-white" />
        </motion.div>
        <p className="text-gray-500 text-sm">Loading HOLLY's growth data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-red-400 font-medium">Failed to load dashboard</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <button onClick={load} className="mt-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { identity, emotions, patterns, proposals, learning, taste, goals } = data;

  // Prepare emotion timeline (reverse to show oldest→newest)
  const emotionTimeline = [...emotions.history].reverse().map((e, i) => ({
    i,
    valence: parseFloat(e.valence.toFixed(2)),
    intensity: parseFloat(e.intensity.toFixed(2)),
    emotion: e.emotion,
  }));

  // Taste radar data
  const tasteRadar = taste
    ? [
        { subject: "Tone",      A: taste.tone       * 100 },
        { subject: "Verbose",   A: taste.verbosity  * 100 },
        { subject: "Humor",     A: taste.humor      * 100 },
        { subject: "Technical", A: taste.technical  * 100 },
        { subject: "Emoji",     A: taste.emoji      * 100 },
      ]
    : [];

  // Learning events bar
  const eventBars = Object.entries(learning.last7Days).map(([type, count]) => ({ type, count }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            HOLLY's Evolution
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : "Loading…"}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 bg-gray-800/60 border border-gray-700/50 rounded-lg hover:bg-gray-700/60 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Row 1: Identity + Confidence + Goals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Confidence arc */}
        <SectionCard title="Confidence Level" icon={Brain}>
          <div className="flex flex-col items-center gap-3">
            <ConfidenceArc value={identity?.confidence ?? 0.5} />
            {identity?.lastEvolved && (
              <p className="text-[10px] text-gray-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last evolved {new Date(identity.lastEvolved).toLocaleDateString()}
              </p>
            )}
          </div>
        </SectionCard>

        {/* Identity traits */}
        <SectionCard title="Identity" icon={Sparkles} className="md:col-span-2">
          <div className="space-y-3">
            {identity ? (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Personality</p>
                  <TagCloud items={identity.traits.slice(0, 6)} color="purple" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Core Values</p>
                  <TagCloud items={identity.values.slice(0, 5)} color="blue" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Strengths</p>
                  <TagCloud items={identity.strengths.slice(0, 4)} color="green" />
                </div>
                {identity.purpose && (
                  <p className="text-xs text-gray-500 italic border-l-2 border-purple-500/30 pl-3">
                    "{identity.purpose.slice(0, 120)}"
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">No identity data yet. Start chatting to build HOLLY's identity.</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Row 2: Emotion timeline + top emotions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <SectionCard title="Emotion History" icon={Heart} className="md:col-span-2">
          {emotionTimeline.length > 1 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={emotionTimeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="i" hide />
                <YAxis domain={[-1, 1]} tickFormatter={v => v.toFixed(1)} tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                  formatter={(val: any, name: string) => [val.toFixed(2), name]}
                  labelFormatter={() => ""}
                />
                <Line type="monotone" dataKey="valence" stroke="#a78bfa" strokeWidth={2} dot={false} name="valence" />
                <Line type="monotone" dataKey="intensity" stroke="#ec4899" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="intensity" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">Not enough emotion data yet.</p>
          )}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-purple-400 rounded" />
              <span className="text-[10px] text-gray-500">Valence</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-pink-400 rounded" style={{ borderTop: "1px dashed" }} />
              <span className="text-[10px] text-gray-500">Intensity</span>
            </div>
            <div className="ml-auto">
              {emotions.trend > 0.05 && <span className="text-[10px] text-green-400 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" /> trending positive</span>}
              {emotions.trend < -0.05 && <span className="text-[10px] text-red-400">trending negative</span>}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Top Emotions" icon={Heart}>
          <div className="space-y-2">
            {emotions.topEmotions.length > 0 ? emotions.topEmotions.map(e => (
              <div key={e.name} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: EMOTION_COLORS[e.name] || "#6b7280" }}
                />
                <span className="text-xs text-gray-300 flex-1 capitalize">{e.name}</span>
                <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: EMOTION_COLORS[e.name] || "#6b7280" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${e.pct}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />
                </div>
                <span className="text-[10px] text-gray-600 w-7 text-right">{e.pct}%</span>
              </div>
            )) : (
              <p className="text-xs text-gray-600">No emotion data yet.</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Row 3: Learning + Taste */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Learning events bar */}
        <SectionCard title="Learning Activity (7 days)" icon={BookOpen}>
          {eventBars.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={eventBars} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="type" tick={{ fontSize: 9, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {eventBars.map((_, i) => (
                      <Cell key={i} fill={["#8b5cf6","#ec4899","#60a5fa","#34d399"][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-600 mt-2 text-right">
                {learning.totalLast7} events this week · {learning.totalEvents} total
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600 text-center py-6">
              No learning events yet — start chatting!
            </p>
          )}
        </SectionCard>

        {/* Taste radar */}
        <SectionCard title="Style Preferences" icon={Palette}>
          {tasteRadar.length > 0 && taste ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={tasteRadar} cx="50%" cy="50%" outerRadius={55}>
                  <PolarGrid stroke="#1f2937" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Radar dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-600 text-center mt-1">
                Based on {taste.signalCount} signals
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">
              Taste profile building… chat more to calibrate.
            </p>
          )}
        </SectionCard>
      </div>

      {/* Row 4: Patterns + Proposals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Learning patterns */}
        <SectionCard title="Top Learning Patterns" icon={TrendingUp}>
          <div className="space-y-2">
            {patterns.length > 0 ? patterns.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-start gap-2.5 py-2 border-b border-gray-800/50 last:border-0"
              >
                <div
                  className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: CATEGORY_COLOR[p.category] || "#6b7280" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{p.pattern}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-600 capitalize">{p.category.replace("_", " ")}</span>
                    <span className="text-[10px] text-gray-600">·</span>
                    <span className="text-[10px] text-gray-600">{p.frequency}×</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="w-10 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${p.confidence * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-600">{Math.round(p.confidence * 100)}%</span>
                </div>
              </motion.div>
            )) : (
              <p className="text-xs text-gray-600">No patterns detected yet.</p>
            )}
          </div>
        </SectionCard>

        {/* Evolution proposals */}
        <SectionCard title="Evolution Proposals" icon={Zap}>
          <div className="space-y-2">
            {proposals.length > 0 ? proposals.map((p, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/30"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-gray-200 leading-snug">{p.title}</p>
                  <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${PROPOSAL_STATUS_STYLE[p.status] || "bg-gray-700 text-gray-400 border-gray-600"}`}>
                    {p.status}
                  </span>
                </div>
                {p.rationale && (
                  <p className="text-[10px] text-gray-500 leading-relaxed">{p.rationale}…</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-gray-600">Impact: <span className="text-gray-400 capitalize">{p.impact}</span></span>
                  <span className="text-[10px] text-gray-600">Risk: <span className="text-gray-400 capitalize">{p.risk}</span></span>
                  <span className="text-[10px] text-gray-600 ml-auto">{new Date(p.proposedAt).toLocaleDateString()}</span>
                </div>
              </motion.div>
            )) : (
              <p className="text-xs text-gray-600">No proposals yet — evolution cycle runs hourly.</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Row 5: Active goals */}
      {goals.length > 0 && (
        <SectionCard title="Active Goals" icon={Target}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {goals.map((g, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2.5 p-3 bg-gray-800/40 rounded-xl border border-gray-700/30"
              >
                <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-300 truncate font-medium">{g.title}</p>
                  <p className="text-[10px] text-gray-600 capitalize mt-0.5">{g.category}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-700 flex-shrink-0 ml-auto" />
              </motion.div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
