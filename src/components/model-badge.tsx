'use client';

import { Brain, Zap } from 'lucide-react';

/**
 * Model badge — shows which free LLM model generated the response.
 * Only free/open-source models: Groq (Llama 3.3), OpenRouter (various), Ollama (local)
 */

interface ModelBadgeProps {
  model?: 'groq-llama-3.3' | 'groq-llama' | 'openrouter' | 'ollama' | 'fallback';
}

export function ModelBadge({ model }: ModelBadgeProps) {
  if (!model || model === 'fallback') return null;

  const config: Record<string, { icon: typeof Brain; label: string; color: string; bg: string; description: string }> = {
    'groq-llama-3.3': {
      icon: Zap,
      label: 'Groq Llama 3.3',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      description: 'Fast · Free',
    },
    'groq-llama': {
      icon: Zap,
      label: 'Groq Llama',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      description: 'Fast Response',
    },
    'openrouter': {
      icon: Brain,
      label: 'OpenRouter',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      description: 'Free Tier',
    },
    'ollama': {
      icon: Brain,
      label: 'Ollama Local',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      description: 'Local · Private',
    },
  };

  const entry = config[model];
  if (!entry) return null;
  const { icon: Icon, color, bg, description } = entry;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${bg} text-xs`}>
      <Icon className={`w-3 h-3 ${color}`} />
      <span className="text-gray-400">{description}</span>
    </div>
  );
}
