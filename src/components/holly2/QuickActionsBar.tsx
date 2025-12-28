'use client';

import { Volume2, VolumeX, Download, Trash2, Settings, Plus } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface QuickActionsBarProps {
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onExport: () => void;
  onClearChat: () => void;
  onNewChat: () => void;
  onSettings: () => void;
}

export function QuickActionsBar({
  voiceEnabled,
  onToggleVoice,
  onExport,
  onClearChat,
  onNewChat,
  onSettings,
}: QuickActionsBarProps) {
  const actions = [
    {
      icon: voiceEnabled ? Volume2 : VolumeX,
      label: voiceEnabled ? 'Voice On' : 'Voice Off',
      onClick: onToggleVoice,
      color: voiceEnabled ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.tertiary,
    },
    {
      icon: Plus,
      label: 'New Chat',
      onClick: onNewChat,
      color: cyberpunkTheme.colors.text.secondary,
    },
    {
      icon: Download,
      label: 'Export',
      onClick: onExport,
      color: cyberpunkTheme.colors.text.secondary,
    },
    {
      icon: Trash2,
      label: 'Clear',
      onClick: onClearChat,
      color: cyberpunkTheme.colors.text.secondary,
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: onSettings,
      color: cyberpunkTheme.colors.text.secondary,
    },
  ];

  return (
    <div 
      className="fixed top-20 right-6 z-40 flex items-center gap-2 p-2 rounded-full shadow-2xl backdrop-blur-md"
      style={{
        backgroundColor: `${cyberpunkTheme.colors.background.secondary}CC`,
        border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        boxShadow: `0 0 20px ${cyberpunkTheme.colors.primary.cyan}40`,
      }}
    >
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={action.onClick}
            className="p-3 rounded-full hover:bg-white/10 transition-all group relative"
            style={{ color: action.color }}
            title={action.label}
          >
            <Icon className="w-5 h-5" />
            
            {/* Tooltip */}
            <div 
              className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{
                backgroundColor: cyberpunkTheme.colors.background.primary,
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                color: cyberpunkTheme.colors.text.primary,
              }}
            >
              {action.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
