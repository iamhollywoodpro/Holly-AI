'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, MessageSquare, Clock, Zap, Github, HardDrive } from 'lucide-react';
import Link from 'next/link';

// Holly emerald/copper color palette
const H = {
  bg: { dark: '#0A0908', surface: '#141210', raised: '#1E1B18' },
  text: { primary: '#F5F0E8', secondary: '#8C8476', tertiary: '#5C564D' },
  primary: '#2D8B5E',
  secondary: '#C47A4A',
  accent: '#D4A853',
  border: '#2A2520',
  gradient: 'linear-gradient(135deg, #2D8B5E 0%, #C47A4A 100%)',
  holographic: 'linear-gradient(135deg, #C47A4A 0%, #2D8B5E 50%, #D4A853 100%)',
};

interface UserStats {
  totalConversations: number;
  totalMessages: number;
  activeRepos: number;
  driveFilesCount: number;
  lastActiveAt: string;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/user/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const modeUsage = [
    { name: 'Conversations', value: stats?.totalConversations ?? 0, icon: MessageSquare, color: H.primary },
    { name: 'GitHub Repos', value: stats?.activeRepos ?? 0, icon: Github, color: H.secondary },
    { name: 'Drive Files', value: stats?.driveFilesCount ?? 0, icon: HardDrive, color: H.accent },
  ];

  const lastActive = stats?.lastActiveAt
    ? new Date(stats.lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: H.bg.dark }}
    >
      <div className="max-w-7xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          style={{ color: H.text.secondary }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <h1
          className="text-4xl font-bold mb-2"
          style={{
            background: H.holographic,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Analytics
        </h1>
        <p style={{ color: H.text.secondary }}>
          Your usage statistics and insights
        </p>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div
            className="p-12 rounded-xl text-center"
            style={{
              backgroundColor: H.bg.surface,
              border: `1px solid ${H.border}`,
              color: H.text.tertiary,
            }}
          >
            Loading your stats...
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: H.bg.surface,
                  border: `1px solid ${H.border}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare className="w-8 h-8" style={{ color: H.primary }} />
                  <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: H.text.primary }}>
                  {(stats?.totalConversations ?? 0).toLocaleString()}
                </div>
                <div style={{ color: H.text.tertiary }}>Total Conversations</div>
              </div>

              <div
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: H.bg.surface,
                  border: `1px solid ${H.border}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare className="w-8 h-8" style={{ color: H.secondary }} />
                  <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: H.text.primary }}>
                  {(stats?.totalMessages ?? 0).toLocaleString()}
                </div>
                <div style={{ color: H.text.tertiary }}>Total Messages</div>
              </div>

              <div
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: H.bg.surface,
                  border: `1px solid ${H.border}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Github className="w-8 h-8" style={{ color: H.accent }} />
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: H.text.primary }}>
                  {stats?.activeRepos ?? 0}
                </div>
                <div style={{ color: H.text.tertiary }}>GitHub Repos</div>
              </div>

              <div
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: H.bg.surface,
                  border: `1px solid ${H.border}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8" style={{ color: '#10B981' }} />
                </div>
                <div className="text-lg font-bold mb-1" style={{ color: H.text.primary }}>
                  {lastActive}
                </div>
                <div style={{ color: H.text.tertiary }}>Last Active</div>
              </div>
            </div>

            {/* Activity Breakdown */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: H.bg.surface,
                border: `1px solid ${H.border}`,
              }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: H.text.primary }}>
                Activity Overview
              </h2>
              <div className="space-y-4">
                {modeUsage.map(item => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" style={{ color: item.color }} />
                          <span style={{ color: H.text.primary }}>{item.name}</span>
                        </div>
                        <div className="text-sm" style={{ color: H.text.tertiary }}>
                          {item.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {stats?.driveFilesCount ? (
                <div
                  className="mt-6 p-4 rounded-lg"
                  style={{
                    backgroundColor: H.bg.dark,
                    border: `1px solid ${H.border}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5" style={{ color: '#10B981' }} />
                    <div>
                      <div className="font-medium" style={{ color: H.text.primary }}>
                        Google Drive Connected
                      </div>
                      <div className="text-sm" style={{ color: H.text.tertiary }}>
                        {stats.driveFilesCount} files synced
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
