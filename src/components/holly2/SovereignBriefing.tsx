'use client';

import { useState, useEffect } from 'react';
import { Bell, Sun, AlertTriangle, CheckCircle, X, ChevronDown, ChevronUp, Activity, Heart, Sparkles, Clock } from 'lucide-react';

interface BriefingData {
  id: string;
  timestamp: string;
  greeting: string;
  overnightSummary: string;
  systemHealth: string;
  emotionalState: string;
  activeGoals: string[];
  evolutionUpdates: string[];
  recommendedActions: string[];
  overallStatus: 'nominal' | 'degraded' | 'critical';
}

interface SovereignBriefingProps {
  clerkUserId?: string;
}

export function SovereignBriefing({ clerkUserId }: SovereignBriefingProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchBriefing();
    const interval = setInterval(fetchBriefing, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchBriefing() {
    try {
      const res = await fetch('/api/notifications/recent?limit=5');
      if (!res.ok) return;
      const data = await res.json();
      const briefingNotif = data.notifications?.find(
        (n: any) => n.type === 'morning_briefing' && n.status === 'unread'
      );
      if (briefingNotif?.actionData) {
        setBriefing(briefingNotif.actionData as BriefingData);
      }
    } catch {}
    setLoading(false);
  }

  if (dismissed || !briefing) {
    if (loading) {
      return (
        <div className="mb-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl p-4">
          <div className="flex items-center gap-3 text-white/50">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Loading briefing...</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const statusColor = briefing.overallStatus === 'nominal'
    ? 'text-emerald-400'
    : briefing.overallStatus === 'degraded'
    ? 'text-amber-400'
    : 'text-red-400';

  const statusBg = briefing.overallStatus === 'nominal'
    ? 'from-emerald-500/10 to-emerald-500/5'
    : briefing.overallStatus === 'degraded'
    ? 'from-amber-500/10 to-amber-500/5'
    : 'from-red-500/10 to-red-500/5';

  const statusBorder = briefing.overallStatus === 'nominal'
    ? 'border-emerald-500/20'
    : briefing.overallStatus === 'degraded'
    ? 'border-amber-500/20'
    : 'border-red-500/20';

  return (
    <div className={`mb-4 rounded-xl border ${statusBorder} bg-gradient-to-br ${statusBg} backdrop-blur-xl overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${statusColor}`}>
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white/90">Sovereign Briefing</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                briefing.overallStatus === 'nominal' ? 'bg-emerald-500/20 text-emerald-400' :
                briefing.overallStatus === 'degraded' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {briefing.overallStatus}
              </span>
            </div>
            <span className="text-xs text-white/40">
              {new Date(briefing.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/60 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Greeting */}
          <p className="text-sm text-white/80 leading-relaxed">{briefing.greeting}</p>

          {/* Overnight Summary */}
          <div className="flex gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
            <p className="text-xs text-white/60 leading-relaxed">{briefing.overnightSummary}</p>
          </div>

          {/* System Health */}
          <div className="flex gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-white/60 leading-relaxed">{briefing.systemHealth}</p>
          </div>

          {/* Emotional State */}
          {briefing.emotionalState && (
            <div className="flex gap-2">
              <Heart className="w-3.5 h-3.5 text-pink-400 mt-0.5 shrink-0" />
              <p className="text-xs text-white/50 leading-relaxed italic">{briefing.emotionalState}</p>
            </div>
          )}

          {/* Active Goals */}
          {briefing.activeGoals.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1 font-mono">Active Goals</div>
              <div className="space-y-1">
                {briefing.activeGoals.map((goal, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                    {goal}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evolution Updates */}
          {briefing.evolutionUpdates.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1 font-mono">Pending Evolution</div>
              <div className="space-y-1">
                {briefing.evolutionUpdates.map((update, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                    <div className="w-1 h-1 rounded-full bg-amber-400" />
                    {update}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Actions */}
          {briefing.recommendedActions.length > 0 && (
            <div className="mt-3 p-2.5 rounded-lg bg-white/5 border border-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1.5 font-mono">Recommended Actions</div>
              {briefing.recommendedActions.map((action, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-white/60 mb-1">
                  <span className="text-white/30">{i + 1}.</span>
                  {action}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
