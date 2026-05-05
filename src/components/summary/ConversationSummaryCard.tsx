'use client';

import { motion } from 'framer-motion';
import { FileText, ChevronRight } from 'lucide-react';
import type { ConversationSummary } from '@/types/summary';

interface ConversationSummaryCardProps {
  summary: ConversationSummary | null;
  isLoading?: boolean;
  onViewFull?: () => void;
}

export function ConversationSummaryCard({
  summary,
  isLoading,
  onViewFull,
}: ConversationSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="px-3 py-2 bg-gray-800/30 rounded-lg border border-gray-700/30 animate-pulse">
        <div className="h-3 bg-gray-700/50 rounded w-3/4 mb-2" />
        <div className="h-2 bg-gray-700/50 rounded w-full mb-1" />
        <div className="h-2 bg-gray-700/50 rounded w-2/3" />
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Truncate summary to 80 characters for preview
  const truncatedSummary =
    summary.summary.length > 80
      ? summary.summary.substring(0, 80) + '...'
      : summary.summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group px-3 py-2 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
      onClick={onViewFull}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-medium text-purple-300">Summary</span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-400 transition-colors" />
      </div>

      {/* Summary Text */}
      <p className="text-xs text-gray-300 leading-relaxed mb-2">
        {truncatedSummary}
      </p>

      {/* Topics */}
      {summary.topics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {summary.topics.slice(0, 3).map((topic, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded border border-purple-500/30"
            >
              {topic}
            </span>
          ))}
          {summary.topics.length > 3 && (
            <span className="px-1.5 py-0.5 text-gray-400 text-[10px]">
              +{summary.topics.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar (if applicable) */}
      {summary.progress !== null && summary.progress !== undefined && (
        <div className="mt-2 pt-2 border-t border-purple-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400">Progress</span>
            <span className="text-[10px] text-purple-300 font-medium">
              {Math.round(summary.progress * 100)}%
            </span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${summary.progress * 100}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
