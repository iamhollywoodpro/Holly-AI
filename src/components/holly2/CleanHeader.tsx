'use client';

import { useState } from 'react';
import { 
  Share2, Users, FolderOpen, MoreVertical, Star, Trash2, FileText, Edit3, Download, Eye, Brain
} from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface CleanHeaderProps {
  onToggleSidebar: () => void;
  chatTitle?: string;
  activeMode?: string;
  onExport?: () => void;
  onClearChat?: () => void;
  readingMode?: boolean;
  onToggleReadingMode?: () => void;
}

export function CleanHeader({ 
  onToggleSidebar, 
  chatTitle = "New Chat",
  activeMode = "default",
  onExport,
  onClearChat,
  readingMode = false,
  onToggleReadingMode
}: CleanHeaderProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Mode display names and colors
  const modeConfig: Record<string, { name: string; color: string; icon: string }> = {
    'default': { name: 'HOLLY', color: cyberpunkTheme.colors.primary.cyan, icon: '🤖' },
    'full-stack': { name: 'Full-Stack Dev', color: cyberpunkTheme.colors.primary.purple, icon: '💻' },
    'magic-design': { name: 'Magic Design', color: cyberpunkTheme.colors.primary.pink, icon: '🎨' },
    'write-code': { name: 'Code Expert', color: cyberpunkTheme.colors.primary.cyan, icon: '⚡' },
    'aura-ar': { name: 'AURA A&R', color: cyberpunkTheme.colors.primary.pink, icon: '🎵' },
    'deep-research': { name: 'Deep Research', color: cyberpunkTheme.colors.primary.purple, icon: '🔍' },
    'music-generation': { name: 'Music Studio', color: cyberpunkTheme.colors.primary.pink, icon: '🎼' },
    'self-coding': { name: 'Self-Coding', color: cyberpunkTheme.colors.primary.cyan, icon: '🔧' },
  };

  const currentMode = modeConfig[activeMode] || modeConfig['default'];

  return (
    <header style={{
      background: cyberpunkTheme.colors.background.secondary,
      borderBottom: `1px solid ${cyberpunkTheme.colors.border.primary}`,
      padding: '0.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem',
    }} className="clean-header">
      {/* Left: Chat Title + Mode Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
        {/* Chat Title */}
        <div style={{
          flex: 1,
          minWidth: 0,
        }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: cyberpunkTheme.colors.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {chatTitle}
          </div>
          
          {/* Brain State Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.25rem',
          }}>
            <Brain size={14} style={{ color: currentMode.color }} />
            <span style={{
              fontSize: '0.75rem',
              color: currentMode.color,
              fontWeight: 500,
            }}>
              {currentMode.icon} {currentMode.name}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Action Buttons + User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Collaborate */}
        <button
          onClick={() => alert('Collaboration feature coming soon!')}
          style={{
            background: 'transparent',
            border: 'none',
            color: cyberpunkTheme.colors.text.secondary,
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            transition: 'all 0.3s',
            boxShadow: '0 0 0 rgba(0, 240, 255, 0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${cyberpunkTheme.colors.background.tertiary}80`;
            e.currentTarget.style.color = cyberpunkTheme.colors.primary.cyan;
            e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunkTheme.colors.primary.cyan}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
            e.currentTarget.style.boxShadow = '0 0 0 rgba(0, 240, 255, 0)';
          }}
        >
          <Users size={16} />
          <span className="mobile-hide">Collaborate</span>
        </button>

        {/* Share */}
        <button
          onClick={() => {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: cyberpunkTheme.colors.text.secondary,
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            transition: 'all 0.3s',
            boxShadow: '0 0 0 rgba(176, 38, 255, 0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${cyberpunkTheme.colors.background.tertiary}80`;
            e.currentTarget.style.color = cyberpunkTheme.colors.primary.purple;
            e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunkTheme.colors.primary.purple}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
            e.currentTarget.style.boxShadow = '0 0 0 rgba(176, 38, 255, 0)';
          }}
        >
          <Share2 size={16} />
          <span className="mobile-hide">Share</span>
        </button>

        {/* View Files */}
        <button
          onClick={() => window.location.href = '/files'}
          style={{
            background: 'transparent',
            border: 'none',
            color: cyberpunkTheme.colors.text.secondary,
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            transition: 'all 0.3s',
            boxShadow: '0 0 0 rgba(0, 240, 255, 0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${cyberpunkTheme.colors.background.tertiary}80`;
            e.currentTarget.style.color = cyberpunkTheme.colors.primary.cyan;
            e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunkTheme.colors.primary.cyan}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
            e.currentTarget.style.boxShadow = '0 0 0 rgba(0, 240, 255, 0)';
          }}
        >
          <FolderOpen size={16} />
          <span className="mobile-hide">Files</span>
        </button>

        {/* Export */}
        {onExport && (
          <button
            onClick={onExport}
            style={{
              background: 'transparent',
              border: 'none',
              color: cyberpunkTheme.colors.text.secondary,
              cursor: 'pointer',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              transition: 'all 0.3s',
              boxShadow: '0 0 0 rgba(176, 38, 255, 0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${cyberpunkTheme.colors.background.tertiary}80`;
              e.currentTarget.style.color = cyberpunkTheme.colors.primary.purple;
              e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunkTheme.colors.primary.purple}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
              e.currentTarget.style.boxShadow = '0 0 0 rgba(176, 38, 255, 0)';
            }}
          >
            <Download size={16} />
            <span className="mobile-hide">Export</span>
          </button>
        )}

        {/* Clear Chat */}
        {onClearChat && (
          <button
            onClick={onClearChat}
            style={{
              background: 'transparent',
              border: 'none',
              color: cyberpunkTheme.colors.text.secondary,
              cursor: 'pointer',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              transition: 'all 0.3s',
              boxShadow: '0 0 0 rgba(255, 0, 110, 0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${cyberpunkTheme.colors.background.tertiary}80`;
              e.currentTarget.style.color = cyberpunkTheme.colors.primary.pink;
              e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunkTheme.colors.primary.pink}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
              e.currentTarget.style.boxShadow = '0 0 0 rgba(255, 0, 110, 0)';
            }}
          >
            <Trash2 size={16} />
            <span className="mobile-hide">Clear</span>
          </button>
        )}

        {/* Reading Mode Toggle */}
        {onToggleReadingMode && (
          <button
            onClick={onToggleReadingMode}
            title={readingMode ? 'Disable Reading Mode' : 'Enable Reading Mode (High Contrast)'}
            style={{
              background: readingMode ? `${cyberpunkTheme.colors.primary.cyan}20` : 'transparent',
              border: readingMode ? `1px solid ${cyberpunkTheme.colors.primary.cyan}` : 'none',
              color: readingMode ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.secondary,
              cursor: 'pointer',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              transition: 'all 0.3s',
              boxShadow: readingMode ? `0 0 15px ${cyberpunkTheme.colors.primary.cyan}40` : '0 0 0 rgba(0, 240, 255, 0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${cyberpunkTheme.colors.background.tertiary}80`;
              e.currentTarget.style.color = cyberpunkTheme.colors.primary.cyan;
              e.currentTarget.style.boxShadow = `0 0 15px ${cyberpunkTheme.colors.primary.cyan}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = readingMode ? `${cyberpunkTheme.colors.primary.cyan}20` : 'transparent';
              e.currentTarget.style.color = readingMode ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.secondary;
              e.currentTarget.style.boxShadow = readingMode ? `0 0 15px ${cyberpunkTheme.colors.primary.cyan}40` : '0 0 0 rgba(0, 240, 255, 0)';
            }}
          >
            <Eye size={16} />
            <span className="mobile-hide">{readingMode ? 'Reading' : 'Read'}</span>
          </button>
        )}

        {/* More Options */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            style={{
              background: 'transparent',
              border: 'none',
              color: cyberpunkTheme.colors.text.secondary,
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = cyberpunkTheme.colors.background.tertiary;
              e.currentTarget.style.color = cyberpunkTheme.colors.text.primary;
            }}
            onMouseLeave={(e) => {
              if (!showMoreMenu) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
              }
            }}
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown Menu */}
          {showMoreMenu && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 0.5rem)',
              right: 0,
              background: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              minWidth: '200px',
              zIndex: 1000,
              overflow: 'hidden',
            }}>
              {[
                { icon: Edit3, label: 'Rename', color: cyberpunkTheme.colors.text.primary },
                { icon: FileText, label: 'Task Details', color: cyberpunkTheme.colors.text.primary },
                { icon: Star, label: 'Add to Favorites', color: cyberpunkTheme.colors.primary.pink },
                { icon: Trash2, label: 'Delete', color: '#ef4444' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setShowMoreMenu(false);
                    // Handle action
                  }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: item.color,
                    cursor: 'pointer',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = cyberpunkTheme.colors.background.tertiary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
