'use client';

import { motion } from 'framer-motion';
import type { Suggestion } from '@/types/suggestions';

interface SuggestionCardProps {
  suggestion: Suggestion;
  index: number;
  onClick: (suggestion: Suggestion) => void;
}

export function SuggestionCard({ suggestion, index, onClick }: SuggestionCardProps) {
  // Gradient colors based on type
  const gradients = {
    question: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:from-purple-500/30 hover:to-pink-500/30',
    action: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:from-blue-500/30 hover:to-cyan-500/30',
    tool: 'from-pink-500/20 to-orange-500/20 border-pink-500/30 hover:from-pink-500/30 hover:to-orange-500/30',
    navigation: 'from-green-500/20 to-emerald-500/20 border-green-500/30 hover:from-green-500/30 hover:to-emerald-500/30',
  };

  const gradient = gradients[suggestion.type] || gradients.action;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        type: 'spring',
        stiffness: 200,
        damping: 20,
      }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(suggestion)}
      className={`
        relative group
        px-4 py-3 rounded-xl
        bg-gradient-to-br ${gradient}
        border backdrop-blur-sm
        transition-all duration-200
        flex items-center gap-3
        min-w-[200px] max-w-[300px]
        shadow-lg hover:shadow-xl
        cursor-pointer
      `}
      title={`Use suggestion: ${suggestion.text}`}
    >
      {/* Icon */}
      <div className="text-2xl flex-shrink-0">
        {suggestion.icon}
      </div>

      {/* Text */}
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-white leading-snug">
          {suggestion.text}
        </p>
      </div>

      {/* Keyboard shortcut hint */}
      {index < 3 && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-gray-900 text-gray-400 text-xs px-1.5 py-0.5 rounded border border-gray-700 font-mono">
            ⌘{index + 1}
          </div>
        </div>
      )}

      {/* Glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity -z-10" />
    </motion.button>
  );
}
