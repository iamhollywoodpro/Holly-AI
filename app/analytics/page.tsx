'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, MessageSquare, Clock, Zap, Github, HardDrive } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import Link from 'next/link';

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
    { name: 'Conversations', value: stats?.totalConversations ?? 0, icon: MessageSquare, color: cyberpunkTheme.colors.primary.cyan },
    { name: 'GitHub Repos', value: stats?.activeRepos ?? 0, icon: Github, color: cyberpunkTheme.colors.primary.purple },
    { name: 'Drive Files', value: stats?.driveFilesCount ?? 0, icon: HardDrive, color: cyberpunkTheme.colors.primary.pink },
  ];

  const lastActive = stats?.lastActiveAt
    ? new Date(stats.lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div
      className="min-h-screen p-6"
      style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
    >
      <div className="max-w-7xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          style={{ color: cyberpunkTheme.colors.text.secondary }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <h1
          className="text-4xl font-bold mb-2"
          style={{
            background: cyberpunkTheme.colors.gradients.holographic,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Analytics
        </h1>
        <p style={{ color: cyberpunkTheme.colors.text.secondary }}>
          Your usage statistics and insights
        </p>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div
            className="p-12 rounded-xl text-center"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
              color: cyberpunkTheme.colors.text.tertiary,
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
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare className="w-8 h-8" style={{ color: cyberpunkTheme.colors.primary.cyan }} />
                  <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: cyberpunkTheme.colors.text.primary }}>
                  {(stats?.totalConversations ?? 0).toLocaleString()}
                </div>
                <div style={{ color: cyberpunkTheme.colors.text.tertiary }}>Total Conversations</div>
              </div>

              <div
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <MessageSquare className="w-8 h-8" style={{ color: cyberpunkTheme.colors.primary.purple }} />
                  <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: cyberpunkTheme.colors.text.primary }}>
                  {(stats?.totalMessages ?? 0).toLocaleString()}
                </div>
                <div style={{ color: cyberpunkTheme.colors.text.tertiary }}>Total Messages</div>
              </div>

              <div
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Github className="w-8 h-8" style={{ color: cyberpunkTheme.colors.primary.pink }} />
                </div>
                <div className="text-3xl font-bold mb-1" style={{ color: cyberpunkTheme.colors.text.primary }}>
                  {stats?.activeRepos ?? 0}
                </div>
                <div style={{ color: cyberpunkTheme.colors.text.tertiary }}>GitHub Repos</div>
              </div>

              <div
                className="p-6 rounded-xl"
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8" style={{ color: '#10B981' }} />
                </div>
                <div className="text-lg font-bold mb-1" style={{ color: cyberpunkTheme.colors.text.primary }}>
                  {lastActive}
                </div>
                <div style={{ color: cyberpunkTheme.colors.text.tertiary }}>Last Active</div>
              </div>
            </div>

            {/* Activity Breakdown */}
            <div
              className="p-6 rounded-xl"
              style={{
                backgroundColor: cyberpunkTheme.colors.background.secondary,
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
              }}
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: cyberpunkTheme.colors.text.primary }}>
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
                          <span style={{ color: cyberpunkTheme.colors.text.primary }}>{item.name}</span>
                        </div>
                        <div className="text-sm" style={{ color: cyberpunkTheme.colors.text.tertiary }}>
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
                    backgroundColor: cyberpunkTheme.colors.background.primary,
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="w-5 h-5" style={{ color: '#10B981' }} />
                    <div>
                      <div className="font-medium" style={{ color: cyberpunkTheme.colors.text.primary }}>
                        Google Drive Connected
                      </div>
                      <div className="text-sm" style={{ color: cyberpunkTheme.colors.text.tertiary }}>
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
