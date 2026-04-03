'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Brain,
  Clock,
  Tag,
  Search,
  MessageSquare,
  Heart,
  Target,
  Zap,
  BookOpen,
  Star,
  TrendingUp,
  Music,
  Code,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ArrowLeft,
  ChevronUp,
  User,
  Activity,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string | null;
  messageCount: number;
  lastMessagePreview: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  summary?: {
    summary: string;
    keyTopics: string[];
    keyPoints: string[];
    actionItems: string[];
    outcome: string | null;
  } | null;
}

interface TasteProfile {
  tone: number;
  verbosity: number;
  humor: number;
  technical: number;
  emoji: number;
  topTopics: string[];
  formats: string[];
  signalCount: number;
  lastUpdated: string;
}

interface TasteSignal {
  id: string;
  category: string;
  item: string;
  signal: 'positive' | 'negative' | 'neutral';
  context: string;
  weight: number;
  source: string;
  createdAt: string;
}

interface Experience {
  id: string;
  type: string;
  significance: number;
  primaryEmotion: string | null;
  secondaryEmotions: string[];
  relatedConcepts: string[];
  lessons: string[];
  skillsGained: string[];
  createdAt: string;
  content: any;
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: number;
  targetDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface LearningPattern {
  id: string;
  pattern: string;
  category: string;
  frequency: number;
  lastSeen: string;
  confidence: number;
  action: string | null;
}

interface Identity {
  coreValues: any;
  personalityTraits: any;
  interests: any;
  strengths: any;
  growthAreas: any;
  confidenceLevel: number;
  purpose: string;
  updatedAt: string;
}

interface EmotionEntry {
  id: string;
  emotion: string;
  intensity: number;
  trigger: string | null;
  notes: string | null;
  timestamp: string;
}

interface MemoryData {
  stats: {
    totalConversations: number;
    totalMessages: number;
    experienceCount: number;
    goalCount: number;
    tasteSignalCount: number;
  };
  conversations: Conversation[];
  tasteProfile: TasteProfile | null;
  tasteSignals: TasteSignal[];
  experiences: Experience[];
  goals: Goal[];
  learningPatterns: LearningPattern[];
  identity: Identity | null;
  emotions: EmotionEntry[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function getMeterColor(value: number) {
  if (value < 0.33) return '#06B6D4';
  if (value < 0.66) return '#8B5CF6';
  return '#EC4899';
}

function getSignalColor(signal: string) {
  if (signal === 'positive') return 'text-emerald-400 bg-emerald-400/10';
  if (signal === 'negative') return 'text-red-400 bg-red-400/10';
  return 'text-zinc-400 bg-zinc-400/10';
}

function getGoalStatusColor(status: string) {
  if (status === 'active') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (status === 'completed') return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  if (status === 'paused') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
}

function getTypeIcon(type: string) {
  if (type.includes('music') || type.includes('audio')) return <Music size={14} className="text-pink-400" />;
  if (type.includes('code') || type.includes('deploy')) return <Code size={14} className="text-cyan-400" />;
  if (type.includes('learn')) return <BookOpen size={14} className="text-purple-400" />;
  if (type.includes('creative')) return <Sparkles size={14} className="text-yellow-400" />;
  return <Zap size={14} className="text-violet-400" />;
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div className="bg-[#13131A] border border-[#27272A] rounded-xl p-4 flex items-center gap-4">
      <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        <p className="text-xs text-[#A1A1AA]">{label}</p>
      </div>
    </div>
  );
}

function MeterBar({ label, value, leftLabel, rightLabel }: { label: string; value: number; leftLabel: string; rightLabel: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#A1A1AA] mb-1">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 bg-[#27272A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value * 100}%`, backgroundColor: getMeterColor(value) }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#52525B] mt-1">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function ConversationCard({ conv }: { conv: Conversation }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-[#0D0D14] border border-[#27272A] rounded-xl p-4 hover:border-[#8B5CF6]/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {conv.pinned && <Star size={12} className="text-yellow-400 shrink-0" />}
            <p className="font-medium text-white text-sm truncate">
              {conv.title ?? 'Untitled conversation'}
            </p>
          </div>
          {conv.lastMessagePreview && (
            <p className="text-xs text-[#A1A1AA] truncate">{conv.lastMessagePreview}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-[#52525B]">{formatDate(conv.updatedAt)}</p>
          <p className="text-xs text-[#52525B]">{conv.messageCount} msgs</p>
        </div>
      </div>

      {conv.summary && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-xs text-[#8B5CF6] flex items-center gap-1 hover:text-[#A78BFA] transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Hide summary' : 'Show summary'}
          </button>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-[#27272A] space-y-2">
              <p className="text-xs text-[#D4D4D8] leading-relaxed">{conv.summary.summary}</p>
              {conv.summary.keyTopics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {conv.summary.keyTopics.map((topic) => (
                    <span key={topic} className="text-[10px] bg-[#8B5CF6]/15 text-[#A78BFA] px-2 py-0.5 rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
              {conv.summary.actionItems.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] text-[#52525B] mb-1">Action items:</p>
                  {conv.summary.actionItems.map((item, i) => (
                    <p key={i} className="text-xs text-[#A1A1AA] flex gap-2">
                      <span className="text-[#8B5CF6]">→</span> {item}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [data, setData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'conversations' | 'taste' | 'experiences' | 'goals' | 'learning' | 'identity' | 'emotions'>('conversations');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (q = '') => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({ section: 'all', limit: '20' });
      if (q) params.set('q', q);
      const res = await fetch(`/api/memory?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load memory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchData(search), 400);
    return () => clearTimeout(timer);
  }, [search, fetchData]);

  const tabs = [
    { id: 'conversations' as const, label: 'Conversations', icon: <MessageSquare size={14} /> },
    { id: 'taste' as const, label: 'Taste Profile', icon: <Heart size={14} /> },
    { id: 'experiences' as const, label: 'Experiences', icon: <Zap size={14} /> },
    { id: 'goals' as const, label: 'Goals', icon: <Target size={14} /> },
    { id: 'learning' as const, label: 'Learning', icon: <TrendingUp size={14} /> },
    { id: 'identity' as const, label: 'Identity', icon: <User size={14} /> },
    { id: 'emotions' as const, label: 'Emotions', icon: <Activity size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* ── Feature nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/60">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/40 transition-all text-gray-400 hover:text-white text-xs font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <span className="text-sm font-semibold text-white">🧠 Memory</span>
        </div>
        <Link href="/chat" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-all text-purple-300 hover:text-white text-xs font-medium">
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Open Chat</span>
        </Link>
      </header>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#8B5CF6]/15 rounded-2xl">
                <Brain size={28} className="text-[#8B5CF6]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">HOLLY's Memory</h1>
                <p className="text-[#A1A1AA] text-sm mt-0.5">
                  Everything HOLLY remembers — conversations, preferences, and growth
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchData(search)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#13131A] border border-[#27272A] rounded-xl text-sm text-[#A1A1AA] hover:text-white hover:border-[#8B5CF6]/40 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Stats row */}
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              <StatCard
                icon={<MessageSquare size={16} className="text-blue-400" />}
                label="Conversations"
                value={data.stats.totalConversations}
                color="bg-blue-400/10"
              />
              <StatCard
                icon={<Tag size={16} className="text-cyan-400" />}
                label="Messages"
                value={data.stats.totalMessages}
                color="bg-cyan-400/10"
              />
              <StatCard
                icon={<Zap size={16} className="text-violet-400" />}
                label="Experiences"
                value={data.stats.experienceCount}
                color="bg-violet-400/10"
              />
              <StatCard
                icon={<Target size={16} className="text-emerald-400" />}
                label="Active Goals"
                value={data.stats.goalCount}
                color="bg-emerald-400/10"
              />
              <StatCard
                icon={<Heart size={16} className="text-pink-400" />}
                label="Taste Signals"
                value={data.stats.tasteSignalCount}
                color="bg-pink-400/10"
              />
            </div>
          )}

          {/* Search */}
          <div className="bg-[#13131A] border border-[#27272A] rounded-xl p-3 flex items-center gap-3 focus-within:border-[#8B5CF6]/50 transition-colors">
            <Search size={18} className="text-[#52525B] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search HOLLY's memory..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-[#52525B] text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs text-[#52525B] hover:text-white transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm">
            ⚠️ {error} — <button onClick={() => fetchData()} className="underline">retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#13131A] border border-[#27272A] rounded-xl p-6 animate-pulse">
                <div className="h-4 bg-[#27272A] rounded w-1/3 mb-3" />
                <div className="h-3 bg-[#27272A] rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#8B5CF6] text-white'
                      : 'bg-[#13131A] border border-[#27272A] text-[#A1A1AA] hover:text-white hover:border-[#8B5CF6]/30'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Conversations Tab ─────────────────────────────────────────── */}
            {activeTab === 'conversations' && (
              <div className="space-y-3">
                {data.conversations.length === 0 ? (
                  <EmptyState icon={<MessageSquare size={40} />} title="No conversations yet" desc="Start chatting with HOLLY to see your history here." />
                ) : (
                  data.conversations.map((conv) => (
                    <ConversationCard key={conv.id} conv={conv} />
                  ))
                )}
              </div>
            )}

            {/* ── Taste Profile Tab ─────────────────────────────────────────── */}
            {activeTab === 'taste' && (
              <div className="space-y-6">
                {data.tasteProfile ? (
                  <>
                    <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <Heart size={20} className="text-pink-400" />
                        <h3 className="text-lg font-semibold">Communication Style</h3>
                        <span className="ml-auto text-xs text-[#52525B]">
                          {data.tasteProfile.signalCount} signals learned
                        </span>
                      </div>
                      <div className="space-y-5">
                        <MeterBar label="Tone" value={data.tasteProfile.tone} leftLabel="Casual" rightLabel="Formal" />
                        <MeterBar label="Response Length" value={data.tasteProfile.verbosity} leftLabel="Concise" rightLabel="Detailed" />
                        <MeterBar label="Humor" value={data.tasteProfile.humor} leftLabel="Serious" rightLabel="Playful" />
                        <MeterBar label="Technical Depth" value={data.tasteProfile.technical} leftLabel="Simple" rightLabel="Expert" />
                        <MeterBar label="Emoji Usage" value={data.tasteProfile.emoji} leftLabel="None" rightLabel="Heavy" />
                      </div>
                    </div>

                    {data.tasteProfile.topTopics.length > 0 && (
                      <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <Tag size={16} className="text-cyan-400" />
                          Top Interests
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {data.tasteProfile.topTopics.map((topic) => (
                            <span key={topic} className="px-3 py-1 bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/20 rounded-full text-sm">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {data.tasteSignals.length > 0 && (
                      <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <Sparkles size={16} className="text-yellow-400" />
                          Recent Learning Signals
                        </h4>
                        <div className="space-y-2">
                          {data.tasteSignals.slice(0, 15).map((sig) => (
                            <div key={sig.id} className="flex items-center gap-3 py-2 border-b border-[#27272A] last:border-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSignalColor(sig.signal)}`}>
                                {sig.signal}
                              </span>
                              <span className="text-sm text-[#D4D4D8] flex-1">{sig.item || sig.category}</span>
                              <span className="text-xs text-[#52525B]">{formatDate(sig.createdAt)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState icon={<Heart size={40} />} title="No taste profile yet" desc="Chat with HOLLY and she'll learn your preferences automatically." />
                )}
              </div>
            )}

            {/* ── Experiences Tab ───────────────────────────────────────────── */}
            {activeTab === 'experiences' && (
              <div className="space-y-3">
                {data.experiences.length === 0 ? (
                  <EmptyState icon={<Zap size={40} />} title="No experiences recorded" desc="HOLLY records experiences as you interact — check back after more chats." />
                ) : (
                  data.experiences.map((exp) => (
                    <div key={exp.id} className="bg-[#13131A] border border-[#27272A] rounded-xl p-4 hover:border-[#8B5CF6]/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-[#1A1A27] rounded-lg mt-0.5">
                          {getTypeIcon(exp.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-[#A78BFA] capitalize">{exp.type.replace(/_/g, ' ')}</span>
                            {exp.primaryEmotion && (
                              <span className="text-xs text-[#EC4899]">· {exp.primaryEmotion}</span>
                            )}
                            <span className="ml-auto text-xs text-[#52525B]">{formatDate(exp.createdAt)}</span>
                          </div>
                          {/* Significance bar */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-1 bg-[#27272A] rounded-full flex-1">
                              <div
                                className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-full"
                                style={{ width: `${exp.significance * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-[#52525B]">sig {Math.round(exp.significance * 100)}%</span>
                          </div>
                          {exp.lessons.length > 0 && (
                            <div className="mt-2">
                              {exp.lessons.slice(0, 2).map((lesson, i) => (
                                <p key={i} className="text-xs text-[#A1A1AA] flex gap-1.5">
                                  <span className="text-[#8B5CF6] shrink-0">→</span> {lesson}
                                </p>
                              ))}
                            </div>
                          )}
                          {exp.relatedConcepts.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {exp.relatedConcepts.slice(0, 4).map((concept) => (
                                <span key={concept} className="text-[10px] bg-[#27272A] text-[#A1A1AA] px-2 py-0.5 rounded-full">
                                  {concept}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Goals Tab ─────────────────────────────────────────────────── */}
            {activeTab === 'goals' && (
              <div className="space-y-3">
                {data.goals.length === 0 ? (
                  <EmptyState icon={<Target size={40} />} title="No goals set" desc="HOLLY creates goals as she learns what matters to you." />
                ) : (
                  data.goals.map((goal) => (
                    <div key={goal.id} className="bg-[#13131A] border border-[#27272A] rounded-xl p-4 hover:border-[#8B5CF6]/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getGoalStatusColor(goal.status)}`}>
                              {goal.status}
                            </span>
                            <span className="text-xs text-[#52525B] capitalize">{goal.category}</span>
                          </div>
                          <p className="font-medium text-white text-sm">{goal.title}</p>
                          {goal.description && (
                            <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">{goal.description}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${i < Math.ceil(goal.priority / 2) ? 'bg-[#8B5CF6]' : 'bg-[#27272A]'}`}
                              />
                            ))}
                          </div>
                          <p className="text-[10px] text-[#52525B]">{formatDate(goal.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Learning Tab ─────────────────────────────────────────────── */}
            {activeTab === 'learning' && (
              <div className="space-y-3">
                {data.learningPatterns.length === 0 ? (
                  <EmptyState icon={<TrendingUp size={40} />} title="No patterns learned yet" desc="HOLLY will start detecting patterns as you interact more." />
                ) : (
                  data.learningPatterns.map((pattern) => (
                    <div key={pattern.id} className="bg-[#13131A] border border-[#27272A] rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-[#06B6D4] capitalize">
                              {pattern.category.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-[#52525B]">· seen {pattern.frequency}×</span>
                            <span className="ml-auto text-xs text-[#52525B]">{formatDate(pattern.lastSeen)}</span>
                          </div>
                          <p className="text-sm text-[#D4D4D8] leading-relaxed">{pattern.pattern}</p>
                          {pattern.action && (
                            <p className="text-xs text-[#A78BFA] mt-1.5 flex gap-1.5">
                              <span>→</span> {pattern.action}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-[#52525B] mb-1">confidence</div>
                          <div className="text-sm font-medium text-white">
                            {Math.round(pattern.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Identity Tab ─────────────────────────────────────────────── */}
            {activeTab === 'identity' && (
              <div className="space-y-6">
                {data.identity ? (
                  <>
                    {/* Confidence level */}
                    <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <User size={20} className="text-violet-400" />
                        <h3 className="text-lg font-semibold">HOLLY's Self-Model</h3>
                        <span className="ml-auto text-xs text-[#52525B]">updated {formatDate(data.identity.updatedAt)}</span>
                      </div>

                      <div className="mb-5">
                        <p className="text-xs text-[#A1A1AA] mb-1">Confidence Level</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-[#27272A] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-full transition-all"
                              style={{ width: `${data.identity.confidenceLevel * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-white font-medium">
                            {Math.round(data.identity.confidenceLevel * 100)}%
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 rounded-xl p-4 mb-4">
                        <p className="text-xs text-[#A78BFA] mb-1">Purpose</p>
                        <p className="text-sm text-white">{data.identity.purpose}</p>
                      </div>

                      {toArray(data.identity.coreValues).length > 0 && (
                        <TagGroup label="Core Values" items={toArray(data.identity.coreValues)} color="text-violet-400 bg-violet-400/10" />
                      )}
                    </div>

                    {toArray(data.identity.interests).length > 0 && (
                      <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
                        <TagGroup label="Interests" items={toArray(data.identity.interests)} color="text-cyan-400 bg-cyan-400/10" />
                      </div>
                    )}

                    {toArray(data.identity.strengths).length > 0 && (
                      <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
                        <TagGroup label="Strengths" items={toArray(data.identity.strengths)} color="text-emerald-400 bg-emerald-400/10" />
                      </div>
                    )}

                    {toArray(data.identity.growthAreas).length > 0 && (
                      <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-6">
                        <TagGroup label="Growth Areas" items={toArray(data.identity.growthAreas)} color="text-yellow-400 bg-yellow-400/10" />
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState icon={<User size={40} />} title="Identity not formed yet" desc="HOLLY's identity evolves through interactions — check back after more chats." />
                )}
              </div>
            )}

            {/* ── Emotions Tab ─────────────────────────────────────────────── */}
            {activeTab === 'emotions' && (
              <div className="space-y-3">
                {data.emotions.length === 0 ? (
                  <EmptyState icon={<Activity size={40} />} title="No emotion log yet" desc="HOLLY tracks emotional context as you interact." />
                ) : (
                  data.emotions.map((e) => (
                    <div key={e.id} className="bg-[#13131A] border border-[#27272A] rounded-xl p-4 flex items-center gap-4">
                      <div className="text-2xl">{emotionEmoji(e.emotion)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white capitalize">{e.emotion}</span>
                          <div className="flex-1 h-1 bg-[#27272A] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] rounded-full"
                              style={{ width: `${e.intensity * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-[#52525B]">{Math.round(e.intensity * 100)}%</span>
                        </div>
                        {e.trigger && <p className="text-xs text-[#A1A1AA]">Trigger: {e.trigger}</p>}
                      </div>
                      <span className="text-xs text-[#52525B] shrink-0">{formatDate(e.timestamp)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* How it works */}
        <div className="mt-10 bg-[#8B5CF6]/8 border border-[#8B5CF6]/20 rounded-2xl p-6">
          <h4 className="font-semibold text-[#A78BFA] mb-2 flex items-center gap-2">
            <Brain size={16} />
            How HOLLY's Memory Works
          </h4>
          <p className="text-[#A1A1AA] text-sm leading-relaxed">
            HOLLY uses pgvector semantic embeddings to store and retrieve memories by meaning, not just keywords.
            Every conversation, learning event, and experience is embedded with NVIDIA NIM or Ollama,
            stored in PostgreSQL, and retrieved via cosine similarity — so HOLLY remembers what's
            <em className="text-[#D4D4D8]"> conceptually relevant</em>, not just what matches a search term.
            Your data is private and only used to make HOLLY better for you.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Utility components ─────────────────────────────────────────────────────────

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="py-16 text-center text-[#A1A1AA]">
      <div className="text-[#27272A] flex justify-center mb-4">{icon}</div>
      <p className="font-medium text-[#71717A] mb-1">{title}</p>
      <p className="text-sm max-w-xs mx-auto">{desc}</p>
    </div>
  );
}

function TagGroup({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <p className="text-xs text-[#52525B] mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`text-xs px-3 py-1 rounded-full ${color}`}>
            {typeof item === 'string' ? item : JSON.stringify(item)}
          </span>
        ))}
      </div>
    </div>
  );
}

function toArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'object') return Object.values(value).map(String);
  return [];
}

function emotionEmoji(emotion: string): string {
  const map: Record<string, string> = {
    happy: '😊', joy: '😄', excited: '🤩', calm: '😌', neutral: '😐',
    sad: '😢', frustrated: '😤', angry: '😠', anxious: '😰', curious: '🤔',
    proud: '😤', grateful: '🙏', confused: '😕', surprised: '😮',
  };
  return map[emotion.toLowerCase()] ?? '💜';
}
