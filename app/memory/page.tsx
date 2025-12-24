'use client';

import { Brain, Clock, Tag, Search } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

export default function MemoryPage() {
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
            <Brain size={32} color={cyberpunkTheme.colors.primary.purple} />
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
              HOLLY's Memory
            </h1>
          </div>
          <p style={{ color: cyberpunkTheme.colors.text.secondary, fontSize: '1.1rem' }}>
            Everything HOLLY remembers about your conversations, preferences, and work together
          </p>
        </div>

        {/* Search Bar */}
        <div style={{
          background: cyberpunkTheme.colors.background.secondary,
          border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <Search size={20} color={cyberpunkTheme.colors.text.secondary} />
          <input
            type="text"
            placeholder="Search memories..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: cyberpunkTheme.colors.text.primary,
              fontSize: '1rem',
            }}
          />
        </div>

        {/* Memory Categories */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Recent Conversations */}
          <div style={{
            background: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            borderRadius: '16px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Clock size={20} color={cyberpunkTheme.colors.primary.pink} />
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Recent Conversations</h3>
            </div>
            <p style={{ color: cyberpunkTheme.colors.text.secondary, marginBottom: '1rem' }}>
              Your latest interactions with HOLLY
            </p>
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: cyberpunkTheme.colors.text.secondary,
            }}>
              <Clock size={48} color={cyberpunkTheme.colors.border.primary} style={{ margin: '0 auto 1rem' }} />
              <p>No recent memories yet</p>
            </div>
          </div>

          {/* Topics & Interests */}
          <div style={{
            background: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            borderRadius: '16px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Tag size={20} color={cyberpunkTheme.colors.primary.cyan} />
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Topics & Interests</h3>
            </div>
            <p style={{ color: cyberpunkTheme.colors.text.secondary, marginBottom: '1rem' }}>
              Things you've discussed with HOLLY
            </p>
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: cyberpunkTheme.colors.text.secondary,
            }}>
              <Tag size={48} color={cyberpunkTheme.colors.border.primary} style={{ margin: '0 auto 1rem' }} />
              <p>No topics tracked yet</p>
            </div>
          </div>

          {/* Preferences */}
          <div style={{
            background: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            borderRadius: '16px',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Brain size={20} color={cyberpunkTheme.colors.primary.purple} />
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Your Preferences</h3>
            </div>
            <p style={{ color: cyberpunkTheme.colors.text.secondary, marginBottom: '1rem' }}>
              How you like to work with HOLLY
            </p>
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              color: cyberpunkTheme.colors.text.secondary,
            }}>
              <Brain size={48} color={cyberpunkTheme.colors.border.primary} style={{ margin: '0 auto 1rem' }} />
              <p>No preferences set yet</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          marginTop: '2rem',
          background: `${cyberpunkTheme.colors.primary.purple}15`,
          border: `1px solid ${cyberpunkTheme.colors.primary.purple}40`,
          borderRadius: '12px',
          padding: '1.5rem',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: cyberpunkTheme.colors.primary.purple }}>
            🧠 How HOLLY's Memory Works
          </h4>
          <p style={{ color: cyberpunkTheme.colors.text.secondary, margin: 0, lineHeight: 1.6 }}>
            HOLLY remembers your conversations, preferences, and work patterns to provide better assistance over time. 
            Your memories are private and only used to improve your experience with HOLLY.
          </p>
        </div>
      </div>
    </div>
  );
}
