'use client';

import { ArrowLeft, TrendingUp, MessageSquare, Clock, Zap, Music, Code, Palette } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import Link from 'next/link';

export default function AnalyticsPage() {
  // Mock data
  const stats = {
    totalConversations: 127,
    totalMessages: 1543,
    totalTime: '24h 32m',
    avgResponseTime: '1.2s',
  };

  const modeUsage = [
    { name: 'Conversation', count: 85, percentage: 67, icon: MessageSquare, color: cyberpunkTheme.colors.primary.cyan },
    { name: 'Music', count: 23, percentage: 18, icon: Music, color: cyberpunkTheme.colors.primary.purple },
    { name: 'Code', count: 15, percentage: 12, icon: Code, color: cyberpunkTheme.colors.primary.pink },
    { name: 'Design', count: 4, percentage: 3, icon: Palette, color: '#10B981' },
  ];

  const weeklyActivity = [
    { day: 'Mon', messages: 45 },
    { day: 'Tue', messages: 62 },
    { day: 'Wed', messages: 38 },
    { day: 'Thu', messages: 71 },
    { day: 'Fri', messages: 55 },
    { day: 'Sat', messages: 28 },
    { day: 'Sun', messages: 19 },
  ];

  const maxMessages = Math.max(...weeklyActivity.map(d => d.messages));

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
    >
      {/* Header */}
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
          📊 Analytics
        </h1>
        <p style={{ color: cyberpunkTheme.colors.text.secondary }}>
          Your usage statistics and insights
        </p>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
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
              <MessageSquare 
                className="w-8 h-8"
                style={{ color: cyberpunkTheme.colors.primary.cyan }}
              />
              <TrendingUp 
                className="w-5 h-5"
                style={{ color: '#10B981' }}
              />
            </div>
            <div 
              className="text-3xl font-bold mb-1"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              {stats.totalConversations}
            </div>
            <div style={{ color: cyberpunkTheme.colors.text.tertiary }}>
              Total Conversations
            </div>
          </div>

          <div 
            className="p-6 rounded-xl"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <MessageSquare 
                className="w-8 h-8"
                style={{ color: cyberpunkTheme.colors.primary.purple }}
              />
              <TrendingUp 
                className="w-5 h-5"
                style={{ color: '#10B981' }}
              />
            </div>
            <div 
              className="text-3xl font-bold mb-1"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              {stats.totalMessages}
            </div>
            <div style={{ color: cyberpunkTheme.colors.text.tertiary }}>
              Total Messages
            </div>
          </div>

          <div 
            className="p-6 rounded-xl"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Clock 
                className="w-8 h-8"
                style={{ color: cyberpunkTheme.colors.primary.pink }}
              />
            </div>
            <div 
              className="text-3xl font-bold mb-1"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              {stats.totalTime}
            </div>
            <div style={{ color: cyberpunkTheme.colors.text.tertiary }}>
              Total Time
            </div>
          </div>

          <div 
            className="p-6 rounded-xl"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <Zap 
                className="w-8 h-8"
                style={{ color: '#10B981' }}
              />
            </div>
            <div 
              className="text-3xl font-bold mb-1"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              {stats.avgResponseTime}
            </div>
            <div style={{ color: cyberpunkTheme.colors.text.tertiary }}>
              Avg Response Time
            </div>
          </div>
        </div>

        {/* Mode Usage */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <h2 
            className="text-2xl font-bold mb-6"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            Mode Usage
          </h2>
          <div className="space-y-4">
            {modeUsage.map(mode => {
              const Icon = mode.icon;
              return (
                <div key={mode.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Icon 
                        className="w-5 h-5"
                        style={{ color: mode.color }}
                      />
                      <span style={{ color: cyberpunkTheme.colors.text.primary }}>
                        {mode.name}
                      </span>
                    </div>
                    <div 
                      className="text-sm"
                      style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    >
                      {mode.count} ({mode.percentage}%)
                    </div>
                  </div>
                  <div 
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${mode.percentage}%`,
                        backgroundColor: mode.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Activity */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <h2 
            className="text-2xl font-bold mb-6"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            Weekly Activity
          </h2>
          <div className="flex items-end justify-between gap-4 h-64">
            {weeklyActivity.map(day => {
              const height = (day.messages / maxMessages) * 100;
              return (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="text-sm mb-2"
                    style={{ color: cyberpunkTheme.colors.text.tertiary }}
                  >
                    {day.messages}
                  </div>
                  <div 
                    className="w-full rounded-t-lg transition-all hover:opacity-80"
                    style={{
                      height: `${height}%`,
                      background: cyberpunkTheme.colors.gradients.primary,
                    }}
                  />
                  <div 
                    className="text-sm"
                    style={{ color: cyberpunkTheme.colors.text.secondary }}
                  >
                    {day.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
