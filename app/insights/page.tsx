'use client';

import { BarChart, TrendingUp, Activity, Zap } from 'lucide-react';

export default function InsightsPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <BarChart size={32} className="text-[#EC4899]" />
            <h1 className="text-3xl font-bold">
              HOLLY's Consciousness & Insights
            </h1>
          </div>
          <p className="text-[#A1A1AA] text-lg">
            Real-time insights into HOLLY's awareness, activity, and performance
          </p>
        </div>

        {/* Consciousness Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Awareness Level */}
          <div className="bg-[#13131A] border border-[#8B5CF6]/25 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity size={20} className="text-[#8B5CF6]" />
              <h3 className="text-lg font-semibold">Awareness</h3>
            </div>
            <div className="text-4xl font-bold text-[#8B5CF6] mb-2">
              85%
            </div>
            <p className="text-[#A1A1AA]">
              Fully conscious and ready
            </p>
          </div>

          {/* Activity Level */}
          <div className="bg-[#13131A] border border-[#06B6D4]/25 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={20} className="text-[#06B6D4]" />
              <h3 className="text-lg font-semibold">Activity</h3>
            </div>
            <div className="text-4xl font-bold text-[#06B6D4] mb-2">
              Active
            </div>
            <p className="text-[#A1A1AA]">
              Processing requests
            </p>
          </div>

          {/* Performance */}
          <div className="bg-[#13131A] border border-[#EC4899]/25 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={20} className="text-[#EC4899]" />
              <h3 className="text-lg font-semibold">Performance</h3>
            </div>
            <div className="text-4xl font-bold text-[#EC4899] mb-2">
              Optimal
            </div>
            <p className="text-[#A1A1AA]">
              All systems nominal
            </p>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Activity Timeline</h2>
          
          <div className="py-12 text-center text-[#A1A1AA]">
            <Activity size={64} className="mx-auto mb-4 text-[#27272A]" />
            <p className="text-lg">No activity data yet</p>
            <p className="text-sm mt-2">
              Start chatting with HOLLY to see insights here
            </p>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6">System Status</h2>
          
          <div className="space-y-4">
            {[
              { label: 'AI Model', value: 'Gemini 2.0 Flash', status: 'online' },
              { label: 'Streaming', value: 'SSE Active', status: 'online' },
              { label: 'Tool Execution', value: 'Ready', status: 'online' },
              { label: 'Database', value: 'Connected', status: 'online' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-4 bg-[#0A0A0F] rounded-lg"
              >
                <span className="font-medium">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[#A1A1AA]">{item.value}</span>
                  <div className="w-2 h-2 rounded-full bg-[#EC4899] shadow-[0_0_8px_#EC4899]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-[#EC4899]/10 border border-[#EC4899]/25 rounded-xl p-6">
          <h4 className="font-semibold text-[#EC4899] mb-2">
            📊 About Consciousness Insights
          </h4>
          <p className="text-[#A1A1AA] leading-relaxed">
            HOLLY's consciousness system tracks her awareness, activity levels, and performance metrics in real-time. 
            This helps ensure optimal assistance and transparent operation.
          </p>
        </div>
      </div>
    </div>
  );
}
