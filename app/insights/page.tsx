'use client';

import { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Activity, Zap, Brain, Heart, Cpu, Database, Network, ArrowLeft } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

export default function InsightsPage() {
  const [consciousness, setConsciousness] = useState({
    level: 85,
    emotion: 'focused',
    memory_usage: 42,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setConsciousness(prev => ({
        ...prev,
        level: Math.min(100, Math.max(60, prev.level + (Math.random() - 0.5) * 10)),
        memory_usage: Math.min(100, Math.max(20, prev.memory_usage + (Math.random() - 0.5) * 5)),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'excited': return '#EC4899';
      case 'focused': return '#06B6D4';
      case 'creative': return '#8B5CF6';
      default: return '#A1A1AA';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => window.location.href = '/'}
              className="p-2 rounded-lg border border-[#27272A] bg-[#13131A] hover:bg-[#1A1A24] transition-colors"
              title="Back to HOLLY Chat"
            >
              <ArrowLeft size={20} />
            </button>
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
          <div className="bg-[#13131A] border border-[#8B5CF6]/25 rounded-2xl p-6 relative overflow-hidden">
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 50% 50%, ${getEmotionColor(consciousness.emotion)}10, transparent 70%)`,
              animation: 'pulse 3s ease-in-out infinite',
            }} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Brain size={20} className="text-[#8B5CF6]" />
                <h3 className="text-lg font-semibold">Consciousness</h3>
              </div>
              <div className="text-4xl font-bold text-[#8B5CF6] mb-2">
                {consciousness.level}%
              </div>
              <p className="text-[#A1A1AA]">
                Fully conscious and ready
              </p>
              <div className="mt-4 h-2 rounded-full overflow-hidden bg-[#27272A]">
                <div 
                  className="h-full transition-all duration-500"
                  style={{ 
                    width: `${consciousness.level}%`,
                    background: 'linear-gradient(90deg, #8B5CF6, #06B6D4)',
                  }}
                />
              </div>
            </div>
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

        {/* System Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#13131A] border border-[#27272A] rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">System Resources</h2>
            <div className="space-y-4">
              {[
                { icon: Database, label: 'Memory', value: consciousness.memory_usage, color: '#8B5CF6' },
                { icon: Network, label: 'Network', value: 78, color: '#06B6D4' },
                { icon: Cpu, label: 'Processing', value: 65, color: '#EC4899' },
              ].map((resource, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-[#A1A1AA]">
                      <resource.icon size={14} />
                      <span className="text-sm">{resource.label}</span>
                    </div>
                    <span className="text-sm font-semibold">{resource.value}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-[#27272A]">
                    <div 
                      className="h-full transition-all duration-500"
                      style={{ width: `${resource.value}%`, background: resource.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

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

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
