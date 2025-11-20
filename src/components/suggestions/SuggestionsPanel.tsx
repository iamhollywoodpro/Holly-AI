'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { SuggestionCard } from './SuggestionCard';
import type { Suggestion } from '@/app/api/suggestions/generate/route';

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  onSelectSuggestion: (suggestion: Suggestion) => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export function SuggestionsPanel({
  suggestions,
  onSelectSuggestion,
  onDismiss,
  isVisible,
}: SuggestionsPanelProps) {
  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        {/* Header with dismiss button */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-gray-400">
              AI Suggestions
            </span>
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-gray-800/50 transition-colors group"
            title="Dismiss suggestions (Esc)"
          >
            <X className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
          </button>
        </div>

        {/* Suggestion Cards */}
        <div className="flex flex-wrap gap-3 items-center justify-center">
          {suggestions.map((suggestion, index) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              index={index}
              onClick={onSelectSuggestion}
            />
          ))}
        </div>

        {/* Helper text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-500 mt-3"
        >
          Click a suggestion or press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono">⌘1-3</kbd>
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
