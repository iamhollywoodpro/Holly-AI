'use client';

import { BarChart, TrendingUp, Activity, Zap } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

export default function InsightsPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: cyberpunkTheme.colors.background.primary,
      color: cyberpunkTheme.colors.text.primary,
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <BarChart size={32} color={cyberpunkTheme.colors.primary.pink} />
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
              HOLLY's Consciousness & Insights
            </h1>
          </div>
          <p style={{ color: cyberpunkTheme.colors.text.secondary, fontSize: '1.1rem' }}>
            Real-time insights into HOLLY's awareness, activity, and performance
          </p>
        </div>

        {/* Consciousness Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {/* Awareness Level */}
          <div style={{
            background: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.primary.purple}40`,
            borderRadius: '16px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Activity size={20} color={cyberpunkTheme.colors.primary.purple} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Awareness</h3>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: cyberpunkTheme.colors.primary.purple }}>
              85%
            </div>
            <p style={{ color: cyberpunkTheme.colors.text.secondary, margin: '0.5rem 0 0 0' }}>
              Fully conscious and ready
            </p>
          </div>

          {/* Activity Level */}
          <div style={{
            background: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.primary.cyan}40`,
            borderRadius: '16px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Zap size={20} color={cyberpunkTheme.colors.primary.cyan} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Activity</h3>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: cyberpunkTheme.colors.primary.cyan }}>
              Active
            </div>
            <p style={{ color: cyberpunkTheme.colors.text.secondary, margin: '0.5rem 0 0 0' }}>
              Processing requests
            </p>
          </div>

          {/* Performance */}
          <div style={{
            background: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.primary.pink}40`,
            borderRadius: '16px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <TrendingUp size={20} color={cyberpunkTheme.colors.primary.pink} />
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Performance</h3>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color={cyberpunkTheme.colors.primary.pink }}>
              Optimal
            </div>
            <p style={{ color: cyberpunkTheme.colors.text.secondary, margin: '0.5rem 0 0 0' }}>
              All systems nominal
            </p>
          </div>
        </div>

        {/* Detailed Insights */}
        <div style={{
          background: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>Activity Timeline</h2>
          
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: cyberpunkTheme.colors.text.secondary,
          }}>
            <Activity size={64} color={cyberpunkTheme.colors.border.primary} style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1.1rem' }}>No activity data yet</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Start chatting with HOLLY to see insights here
            </p>
          </div>
        </div>

        {/* System Status */}
        <div style={{
          background: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          borderRadius: '16px',
          padding: '2rem',
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem' }}>System Status</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'AI Model', value: 'Gemini 2.0 Flash', status: 'online' },
              { label: 'Streaming', value: 'SSE Active', status: 'online' },
              { label: 'Tool Execution', value: 'Ready', status: 'online' },
              { label: 'Database', value: 'Connected', status: 'online' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                background: cyberpunkTheme.colors.background.primary,
                borderRadius: '8px',
              }}>
                <span style={{ fontWeight: 500 }}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: cyberpunkTheme.colors.text.secondary }}>{item.value}</span>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: cyberpunkTheme.colors.primary.pink,
                    boxShadow: `0 0 8px ${cyberpunkTheme.colors.primary.pink}`,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: '2rem',
          background: `${cyberpunkTheme.colors.primary.pink}15`,
          border: `1px solid ${cyberpunkTheme.colors.primary.pink}40`,
          borderRadius: '12px',
          padding: '1.5rem',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: cyberpunkTheme.colors.primary.pink }}>
            📊 About Consciousness Insights
          </h4>
          <p style={{ color: cyberpunkTheme.colors.text.secondary, margin: 0, lineHeight: 1.6 }}>
            HOLLY's consciousness system tracks her awareness, activity levels, and performance metrics in real-time. 
            This helps ensure optimal assistance and transparent operation.
          </p>
        </div>
      </div>
    </div>
  );
}
