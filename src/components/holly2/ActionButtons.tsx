'use client';

import { useState } from 'react';
import { Plus, Sparkles, Search, Code, Globe, Smartphone, Image, Film, Music, FileCode, BarChart, FileSearch } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface ActionButtonsProps {
  onAction: (action: string) => void;
  compact?: boolean;
}

export function ActionButtons({ onAction, compact = false }: ActionButtonsProps) {
  const [activeMenu, setActiveMenu] = useState<'create' | 'generate' | 'analyze' | null>(null);

  const actions = {
    create: [
      { icon: Globe, label: 'Create Website', prompt: 'Help me create a website' },
      { icon: Smartphone, label: 'Create App', prompt: 'Help me create a mobile app' },
      { icon: Code, label: 'Code Generator', prompt: 'Help me generate code' },
    ],
    generate: [
      { icon: Image, label: 'Image Generator', prompt: 'Help me generate an image' },
      { icon: Film, label: 'Video Generator', prompt: 'Help me generate a video' },
      { icon: Music, label: 'Music Generator', prompt: 'Help me generate music' },
    ],
    analyze: [
      { icon: Music, label: 'AURA Music Analysis', prompt: 'I want to analyze a music track with AURA', link: '/aura' },
      { icon: FileCode, label: 'Code Review', prompt: 'Help me review my code' },
      { icon: BarChart, label: 'Data Analysis', prompt: 'Help me analyze data' },
      { icon: FileSearch, label: 'Document Analysis', prompt: 'Help me analyze a document' },
    ],
  };

  const handleAction = (action: { prompt: string; link?: string }) => {
    if (action.link) {
      window.location.href = action.link;
    } else {
      onAction(action.prompt);
      setActiveMenu(null);
    }
  };

  const buttonClass = compact 
    ? "p-2 rounded-lg hover:bg-white/5 transition-colors relative"
    : "px-6 py-3 rounded-lg transition-all hover:scale-105 flex items-center gap-3 font-medium";

  const iconSize = compact ? "w-5 h-5" : "w-6 h-6";

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-wrap gap-4 justify-center"}>
      {/* Create Button */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'create' ? null : 'create')}
          className={buttonClass}
          style={{
            background: compact ? 'transparent' : cyberpunkTheme.colors.gradients.primary,
            color: compact ? cyberpunkTheme.colors.text.secondary : 'white',
          }}
          title="Create"
        >
          <Plus className={iconSize} />
          {!compact && <span>Create</span>}
        </button>

        {/* Create Menu */}
        {activeMenu === 'create' && (
          <div 
            className="absolute bottom-full mb-2 left-0 rounded-lg border p-2 space-y-1 min-w-[200px] z-50"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.elevated,
              borderColor: cyberpunkTheme.colors.border.accent,
              boxShadow: cyberpunkTheme.colors.shadows.glow,
            }}
          >
            {actions.create.map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                <action.icon className="w-4 h-4" style={{ color: cyberpunkTheme.colors.primary.purple }} />
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'generate' ? null : 'generate')}
          className={buttonClass}
          style={{
            background: compact ? 'transparent' : cyberpunkTheme.colors.gradients.secondary,
            color: compact ? cyberpunkTheme.colors.text.secondary : 'white',
          }}
          title="Generate"
        >
          <Sparkles className={iconSize} />
          {!compact && <span>Generate</span>}
        </button>

        {/* Generate Menu */}
        {activeMenu === 'generate' && (
          <div 
            className="absolute bottom-full mb-2 left-0 rounded-lg border p-2 space-y-1 min-w-[200px] z-50"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.elevated,
              borderColor: cyberpunkTheme.colors.border.accent,
              boxShadow: cyberpunkTheme.colors.shadows.glowCyan,
            }}
          >
            {actions.generate.map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                <action.icon className="w-4 h-4" style={{ color: cyberpunkTheme.colors.primary.cyan }} />
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Analyze Button */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'analyze' ? null : 'analyze')}
          className={buttonClass}
          style={{
            background: compact ? 'transparent' : cyberpunkTheme.colors.gradients.holographic,
            color: compact ? cyberpunkTheme.colors.text.secondary : 'white',
          }}
          title="Analyze"
        >
          <Search className={iconSize} />
          {!compact && <span>Analyze</span>}
        </button>

        {/* Analyze Menu */}
        {activeMenu === 'analyze' && (
          <div 
            className="absolute bottom-full mb-2 left-0 rounded-lg border p-2 space-y-1 min-w-[220px] z-50"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.elevated,
              borderColor: cyberpunkTheme.colors.border.accent,
              boxShadow: cyberpunkTheme.colors.shadows.glowPink,
            }}
          >
            {actions.analyze.map((action, i) => (
              <button
                key={i}
                onClick={() => handleAction(action)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                <action.icon className="w-4 h-4" style={{ color: cyberpunkTheme.colors.primary.pink }} />
                <span className="text-sm">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
