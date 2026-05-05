// HOLLY Phase 2D: Stats Dashboard Component
// Visual analytics for conversation history

'use client';

import { useMemo } from 'react';
import { MessageSquare, Calendar, TrendingUp, Tag as TagIcon, X } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    tags?: Array<{ id: string; name: string; color: string }>;
  };
}

interface StatsData {
  conversations: Conversation[];
  messages: Message[];
}

interface StatsDashboardProps {
  data: StatsData;
  onClose: () => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#06b6d4'];

export function StatsDashboard({ data, onClose }: StatsDashboardProps) {
  const stats = useMemo(() => {
    const { conversations, messages } = data;

    // Total counts
    const totalConversations = conversations.length;
    const totalMessages = messages.length;

    // Messages per conversation
    const messagesPerConv = conversations.map(conv => {
      const convMessages = messages.filter(m => m.conversation_id === conv.id);
      return {
        title: conv.title.length > 20 ? conv.title.substring(0, 20) + '...' : conv.title,
        messages: convMessages.length,
      };
    }).sort((a, b) => b.messages - a.messages).slice(0, 10);

    // Activity by day
    const activityByDay: Record<string, number> = {};
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      activityByDay[date] = (activityByDay[date] || 0) + 1;
    });
    const activityData = Object.entries(activityByDay)
      .map(([date, count]) => ({ date, messages: count }))
      .slice(-14); // Last 14 days

    // Tag distribution
    const tagCounts: Record<string, { name: string; count: number; color: string }> = {};
    conversations.forEach(conv => {
      const tags = conv.metadata?.tags || [];
      tags.forEach(tag => {
        if (!tagCounts[tag.id]) {
          tagCounts[tag.id] = { name: tag.name, count: 0, color: tag.color };
        }
        tagCounts[tag.id].count++;
      });
    });
    const tagData = Object.values(tagCounts);

    // Average messages per conversation
    const avgMessages = totalConversations > 0
      ? Math.round(totalMessages / totalConversations)
      : 0;

    // Most active day
    const mostActiveDay = activityData.reduce(
      (max, day) => (day.messages > max.messages ? day : max),
      activityData[0] || { date: 'N/A', messages: 0 }
    );

    return {
      totalConversations,
      totalMessages,
      avgMessages,
      mostActiveDay,
      messagesPerConv,
      activityData,
      tagData,
    };
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Conversation Analytics
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your HOLLY conversation insights
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close stats"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    Total Conversations
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {stats.totalConversations}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                    Total Messages
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {stats.totalMessages}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                    Avg Messages/Conv
                  </p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                    {stats.avgMessages}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Most Active Day
                  </p>
                  <p className="text-lg font-bold text-green-900 dark:text-green-100">
                    {stats.mostActiveDay.date}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {stats.mostActiveDay.messages} messages
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Activity Timeline */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Activity Timeline (Last 14 Days)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="messages" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Conversations */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Most Active Conversations
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.messagesPerConv} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    stroke="#9ca3af"
                    style={{ fontSize: '11px' }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="messages" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tag Distribution */}
          {stats.tagData.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <TagIcon className="w-5 h-5" />
                Tag Distribution
              </h3>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="40%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.tagData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {stats.tagData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1">
                  <div className="space-y-2">
                    {stats.tagData.map((tag, index) => (
                      <div key={tag.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tag.color || COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {tag.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {tag.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
