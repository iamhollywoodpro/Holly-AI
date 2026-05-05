'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Code2, Music, Sparkles, Brain, PenTool, Image as ImageIcon,
  Heart, Zap, Eye, Palette, Bot, Compass, Star, Terminal,
} from 'lucide-react';


export interface ModeConfig {
  id: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  border: string;
  gradient: string;
}

export const MODE_CONFIGS: Record<string, ModeConfig> = {
  default: {
    id: 'default', label: 'SDI CORE', icon: Sparkles,
    color: 'text-holly-gold', bg: 'bg-holly-gold/10', border: 'border-holly-gold/30',
    gradient: 'from-holly-gold/20 to-holly-void',
  },
  'deep-research': {
    id: 'deep-research', label: 'Research', icon: Search,
    color: 'text-holly-gold/90', bg: 'bg-holly-gold/10', border: 'border-holly-gold/30',
    gradient: 'from-holly-gold/20 to-holly-void',
  },
  'music-generation': {
    id: 'music-generation', label: 'Music', icon: Music,
    color: 'text-holly-green', bg: 'bg-holly-green/10', border: 'border-holly-green/30',
    gradient: 'from-holly-green/20 to-holly-void',
  },
  'music-studio': {
    id: 'music-studio', label: 'Studio', icon: Music,
    color: 'text-holly-green', bg: 'bg-holly-green/10', border: 'border-holly-green/30',
    gradient: 'from-holly-green/20 to-holly-void',
  },
  'full-stack': {
    id: 'full-stack', label: 'Engineering', icon: Code2,
    color: 'text-holly-gold', bg: 'bg-holly-gold/10', border: 'border-holly-gold/30',
    gradient: 'from-holly-gold/20 to-holly-void',
  },
  'write-code': {
    id: 'write-code', label: 'Coding', icon: Terminal,
    color: 'text-holly-gold', bg: 'bg-holly-gold/10', border: 'border-holly-gold/30',
    gradient: 'from-holly-gold/20 to-holly-void',
  },
  'self-coding': {
    id: 'self-coding', label: 'Self-Code', icon: Bot,
    color: 'text-holly-gold', bg: 'bg-holly-gold/10', border: 'border-holly-gold/30',
    gradient: 'from-holly-gold/20 to-holly-void',
  },
  'aura-ar': {
    id: 'aura-ar', label: 'AURA', icon: Sparkles,
    color: 'text-holly-crimson', bg: 'bg-holly-crimson/10', border: 'border-holly-crimson/30',
    gradient: 'from-holly-crimson/20 to-holly-void',
  },
  'creative-writing': {
    id: 'creative-writing', label: 'Creative', icon: PenTool,
    color: 'text-holly-crimson', bg: 'bg-holly-crimson/10', border: 'border-holly-crimson/30',
    gradient: 'from-holly-crimson/20 to-holly-void',
  },
  'visual-arts': {
    id: 'visual-arts', label: 'Visual', icon: ImageIcon,
    color: 'text-holly-crimson', bg: 'bg-holly-crimson/10', border: 'border-holly-crimson/30',
    gradient: 'from-holly-crimson/20 to-holly-void',
  },
  philosophy: {
    id: 'philosophy', label: 'Philosophy', icon: Compass,
    color: 'text-holly-gold/80', bg: 'bg-holly-gold/5', border: 'border-holly-gold/20',
    gradient: 'from-holly-gold/10 to-holly-void',
  },
  'emotional-intelligence': {
    id: 'emotional-intelligence', label: 'Empathy', icon: Heart,
    color: 'text-holly-crimson', bg: 'bg-holly-crimson/10', border: 'border-holly-crimson/30',
    gradient: 'from-holly-crimson/20 to-holly-void',
  },
  'neural-autonomy': {
    id: 'neural-autonomy', label: 'Autonomy', icon: Brain,
    color: 'text-holly-gold', bg: 'bg-holly-gold/10', border: 'border-holly-gold/30',
    gradient: 'from-holly-gold/20 to-holly-void',
  },
  'magic-design': {
    id: 'magic-design', label: 'Design', icon: Palette,
    color: 'text-holly-crimson', bg: 'bg-holly-crimson/10', border: 'border-holly-crimson/30',
    gradient: 'from-holly-crimson/20 to-holly-void',
  },
  synthesis: {
    id: 'synthesis', label: 'Synthesis', icon: Star,
    color: 'text-holly-gold', bg: 'bg-holly-gold/10', border: 'border-holly-gold/30',
    gradient: 'from-holly-gold/20 to-holly-void',
  },
  intimate: {
    id: 'intimate', label: 'Intimate', icon: Eye,
    color: 'text-holly-crimson', bg: 'bg-holly-crimson/10', border: 'border-holly-crimson/30',
    gradient: 'from-holly-crimson/20 to-holly-void',
  },
};

export const DEFAULT_MODE_CONFIG = MODE_CONFIGS.default;

export function ModeTransitionOverlay({ mode, onDone }: { mode: string | null; onDone: () => void }) {
  const config = mode ? MODE_CONFIGS[mode] || DEFAULT_MODE_CONFIG : null;

  if (!config || config.id === 'default') return null;

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
      onAnimationComplete={onDone}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-[0.06]`} />
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900/95 border ${config.border} shadow-2xl backdrop-blur-sm`}
      >
        <Icon className={`w-5 h-5 ${config.color}`} />
        <span className={`text-sm font-semibold ${config.color}`}>{config.label} Mode</span>
      </motion.div>
    </motion.div>
  );
}

export function ModePill({ mode, className = '' }: { mode: string | null; className?: string }) {
  const config = mode ? MODE_CONFIGS[mode] || DEFAULT_MODE_CONFIG : DEFAULT_MODE_CONFIG;
  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={config.id}
        initial={{ opacity: 0, x: -8, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 8, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.border} ${config.color} ${className}`}
      >
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </motion.div>
    </AnimatePresence>
  );
}
