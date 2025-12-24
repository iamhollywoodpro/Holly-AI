'use client';

import { useState } from 'react';
import { Menu, Share2, Users, FolderOpen, MoreVertical, Star, Trash2, FileText, Edit3 } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { ConsciousnessIndicator } from './ConsciousnessIndicator';

interface CleanHeaderProps {
  onToggleSidebar: () => void;
  chatTitle?: string;
}

export function CleanHeader({ onToggleSidebar, chatTitle = "New Chat" }: CleanHeaderProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <header style={{
      background: cyberpunkTheme.colors.background.secondary,
      borderBottom: `1px solid ${cyberpunkTheme.colors.border.primary}`,
      padding: '0.75rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
    }}>
      {/* Left: Menu + Logo + Consciousness */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: cyberpunkTheme.colors.text.primary,
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = cyberpunkTheme.colors.background;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Menu size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* HOLLY Logo */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: `linear-gradient(135deg, ${cyberpunkTheme.colors.primary}, ${cyberpunkTheme.colors.secondary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            color: '#fff',
          }}>
            H
          </div>

          {/* Consciousness Brain Icon */}
          <ConsciousnessIndicator />

          {/* HOLLY AI Partner Text */}
          <div>
            <div style={{ 
              fontWeight: 600, 
              fontSize: '0.95rem',
              color: cyberpunkTheme.colors.text.primary,
            }}>
              HOLLY
            </div>
            <div style={{ 
              fontSize: '0.75rem',
              color: cyberpunkTheme.colors.text.secondary,
              marginTop: '-2px',
            }}>
              AI Partner
            </div>
          </div>
        </div>
      </div>

      {/* Center: Chat Title */}
      <div style={{
        flex: 1,
        textAlign: 'center',
        fontSize: '0.95rem',
        fontWeight: 500,
        color: cyberpunkTheme.colors.text.primary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {chatTitle}
      </div>

      {/* Right: Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Collaborate */}
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: cyberpunkTheme.colors.text.secondary,
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = cyberpunkTheme.colors.background;
            e.currentTarget.style.color = cyberpunkTheme.colors.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
          }}
        >
          <Users size={16} />
          <span>Collaborate</span>
        </button>

        {/* Share */}
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: cyberpunkTheme.colors.text.secondary,
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = cyberpunkTheme.colors.background;
            e.currentTarget.style.color = cyberpunkTheme.colors.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
          }}
        >
          <Share2 size={16} />
          <span>Share</span>
        </button>

        {/* View Files */}
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: cyberpunkTheme.colors.text.secondary,
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = cyberpunkTheme.colors.background;
            e.currentTarget.style.color = cyberpunkTheme.colors.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = cyberpunkTheme.colors.text.secondary;
          }}
        >
          <FolderOpen size={16} />
          <span>Files</span>
        </button>

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
              e.currentTarget.style.background = cyberpunkTheme.colors.background;
              e.currentTarget.style.color = cyberpunkTheme.colors.text;
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
              border: `1px solid ${cyberpunkTheme.colors.border}`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              minWidth: '200px',
              zIndex: 1000,
              overflow: 'hidden',
            }}>
              {[
                { icon: Edit3, label: 'Rename', color: cyberpunkTheme.colors.text },
                { icon: FileText, label: 'Task Details', color: cyberpunkTheme.colors.text },
                { icon: Star, label: 'Add to Favorites', color: cyberpunkTheme.colors.accent },
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
                    e.currentTarget.style.background = cyberpunkTheme.colors.background;
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
