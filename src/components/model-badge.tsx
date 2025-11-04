'use client';

import { Brain, Zap } from 'lucide-react';

interface ModelBadgeProps {
  model?: 'claude-opus-4' | 'groq-llama' | 'fallback';
}

export function ModelBadge({ model }: ModelBadgeProps) {
  if (!model || model === 'fallback') return null;

  const config = {
    'claude-opus-4': {
      icon: Brain,
      label: 'Claude Opus 4',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      description: 'Deep Reasoning',
    },
    'groq-llama': {
      icon: Zap,
      label: 'Groq Llama',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      description: 'Fast Response',
    },
  };

  const { icon: Icon, label, color, bg, description } = config[model];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bg} text-xs`}>
      <Icon className={`w-3 h-3 ${color}`} />
      <span className="text-gray-400">{description}</span>
    </div>
  );
}
